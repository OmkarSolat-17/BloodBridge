"""Synthetic inventory API and transactional integration tests."""
import os
import subprocess
import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import Mock, patch
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app import create_app  # noqa: E402
from database.database import db  # noqa: E402
from security.supabase_identity import VerifiedIdentity  # noqa: E402
from security.synthetic_requests import create_request  # noqa: E402

SECRET = "synthetic-test-key-not-for-deployment-123456"


class InventoryGuardTests(unittest.TestCase):
    def test_disabled_and_remote_are_not_available(self):
        for url, flag in (("sqlite:///:memory:", "1"), ("postgresql://x:x@host.invalid/bloodbridge_dev", "1"), ("sqlite:///:memory:", "0")):
            app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET, "SQLALCHEMY_DATABASE_URI": url,
                              "BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS": flag, "SUPABASE_PROJECT_URL": None,
                              "SUPABASE_PUBLISHABLE_KEY": None})
            response = app.test_client().post(f"/api/v1/organizations/{uuid4()}/synthetic-reservations")
            self.assertEqual(response.status_code, 503)


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class InventoryAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = os.environ["BLOODBRIDGE_TEST_POSTGRES_URL"]
        url = make_url(raw)
        if (url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
            or url.host not in ("localhost", "127.0.0.1", "::1") or url.database != "bloodbridge_test"):
            raise RuntimeError("Requires dedicated localhost bloodbridge_test database")
        env = os.environ.copy()
        env["BLOODBRIDGE_MIGRATION_DATABASE_URL"] = raw
        result = subprocess.run([sys.executable, "-m", "alembic", "-c", str(BACKEND / "alembic.ini"), "upgrade", "head"],
                                cwd=BACKEND, env=env, capture_output=True, text=True, timeout=30)
        if result.returncode:
            raise RuntimeError("Local test migration failed: " + result.stderr)
        cls.raw = raw
        cls.engine = create_engine(url.set(drivername="postgresql+psycopg"))

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        self.conn = self.engine.connect()
        self.transaction = self.conn.begin()
        self.addCleanup(self.conn.close)
        self.addCleanup(self.transaction.rollback)
        self.hospital, self.bank, self.bank2 = uuid4(), uuid4(), uuid4()
        self.doctor, self.staff, self.staff2 = uuid4(), uuid4(), uuid4()
        for subject in (self.doctor, self.staff, self.staff2):
            self.conn.execute(text("INSERT INTO bloodbridge_private.identities(subject_id,status) VALUES (:id,'active')"), {"id": subject})
        for org, kind in ((self.hospital,"hospital"), (self.bank,"blood_bank"), (self.bank2,"blood_bank")):
            self.conn.execute(text("INSERT INTO bloodbridge_private.organizations(id,name,kind,status) VALUES (:id,'Synthetic',:kind,'verified')"), {"id": org,"kind":kind})
        for sub, org, role in ((self.doctor,self.hospital,"hospital_operator"), (self.staff,self.bank,"blood_bank_operator"), (self.staff2,self.bank2,"blood_bank_operator")):
            self.conn.execute(text("INSERT INTO bloodbridge_private.memberships(subject_id,organization_id,role,status) VALUES (:sub,:org,:role,'active')"), {"sub":sub,"org":org,"role":role})
        self.app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET, "SQLALCHEMY_DATABASE_URI": self.raw,
                               "SUPABASE_PROJECT_URL": None, "SUPABASE_PUBLISHABLE_KEY": None,
                               "BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS": "1"})
        provider = Mock()
        identities = {"hospital":self.doctor,"bank":self.staff,"bank2":self.staff2}
        provider.verify.side_effect = lambda token: VerifiedIdentity(str(identities[token]))
        self.app.extensions["bloodbridge_identity_provider"] = provider
        with self.app.app_context():
            route_engine = db.engine
        @contextmanager
        def shared_connection():
            yield self.conn
        patcher = patch.object(route_engine, "begin", side_effect=shared_connection)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = self.app.test_client()
        self.hauth = {"Authorization":"Bearer hospital"}
        self.bauth = {"Authorization":"Bearer bank", "Idempotency-Key":str(uuid4())}
        self.b2auth = {"Authorization":"Bearer bank2", "Idempotency-Key":str(uuid4())}
        self.bp = f"/api/v1/organizations/{self.bank}"
        self.hp = f"/api/v1/organizations/{self.hospital}"
        item, _ = create_request(self.conn, VerifiedIdentity(str(self.doctor)), self.hospital,
                                 {"blood_type":"O-","units_required":2,"urgency":"urgent"}, str(uuid4()))
        self.req = item["id"]

    def receipt(self, units=3, auth=None, blood="O-"):
        return self.client.post(f"{self.bp}/synthetic-inventory/receipts", json={"blood_type":blood,"units":units}, headers=auth or self.bauth)

    def handoff(self, bank=None):
        return self.client.post(f"{self.hp}/synthetic-requests/{self.req}/bank-grants", json={"bank_id":str(bank or self.bank)}, headers=self.hauth)

    def reserve(self, org=None, auth=None):
        return self.client.post(f"/api/v1/organizations/{org or self.bank}/synthetic-reservations", json={"request_id":self.req}, headers=auth or self.bauth)

    def units(self, blood="O-"):
        r = self.client.get(f"{self.bp}/synthetic-inventory", query_string={"blood_type":blood}, headers=self.bauth)
        self.assertEqual(r.status_code,200)
        return r.json["stock"]["units_available"]

    def test_full_flow_idempotent_retries_and_audit(self):
        first = self.receipt()
        self.assertEqual(first.status_code,201,first.get_data(as_text=True))
        self.assertEqual(self.receipt().status_code,200)
        self.assertEqual(self.receipt(units=4).status_code,409)
        self.assertEqual(self.units(),3)
        self.assertEqual(self.handoff().status_code,201)
        self.assertEqual(self.handoff().status_code,200)
        reserved = self.reserve()
        self.assertEqual(reserved.status_code,201,reserved.get_data(as_text=True))
        retry = self.reserve()
        self.assertEqual(retry.status_code,200)
        self.assertEqual(reserved.json["reservation"]["id"], retry.json["reservation"]["id"])
        self.assertEqual(self.units(),1)
        status = self.conn.execute(text("SELECT status FROM bloodbridge_private.synthetic_requests WHERE id=:id"), {"id":self.req}).scalar_one()
        self.assertEqual(status,"reserved")
        count = self.conn.execute(text("SELECT count(*) FROM bloodbridge_private.synthetic_inventory_audit WHERE organization_id IN (:bank,:hospital)"), {"bank":self.bank,"hospital":self.hospital}).scalar_one()
        self.assertEqual(count,3)

    def test_ungranted_bank_and_wrong_role_are_denied(self):
        self.assertEqual(self.reserve().status_code,404)
        self.assertEqual(self.receipt(auth={**self.hauth, "Idempotency-Key": str(uuid4())}).status_code,403)
        self.assertEqual(self.client.post(f"{self.bp}/synthetic-reservations", json={"request_id":self.req}).status_code,401)
        self.assertEqual(self.client.options(f"{self.bp}/synthetic-reservations").status_code,503)

    def test_insufficient_stock_no_mutation_and_exact_type_only(self):
        self.assertEqual(self.receipt(units=2,blood="O+").status_code,201)
        self.assertEqual(self.handoff().status_code,201)
        self.assertEqual(self.reserve().status_code,409)
        self.assertEqual(self.units("O+"),2)
        self.assertEqual(self.units("O-"),0)
        self.assertEqual(self.conn.execute(text("SELECT status FROM bloodbridge_private.synthetic_requests WHERE id=:id"), {"id":self.req}).scalar_one(),"open")

    def test_competing_granted_bank_cannot_reserve_same_request_twice(self):
        self.assertEqual(self.receipt().status_code,201)
        other = self.client.post(f"/api/v1/organizations/{self.bank2}/synthetic-inventory/receipts", json={"blood_type":"O-","units":3}, headers=self.b2auth)
        self.assertEqual(other.status_code,201)
        self.assertEqual(self.handoff().status_code,201)
        self.assertEqual(self.handoff(self.bank2).status_code,201)
        self.assertEqual(self.reserve().status_code,201)
        self.assertEqual(self.reserve(self.bank2,self.b2auth).status_code,409)
        row = self.conn.execute(text("SELECT units_available FROM bloodbridge_private.synthetic_inventory WHERE bank_id=:id AND blood_type='O-'"), {"id":self.bank2}).scalar_one()
        self.assertEqual(row,3)

    def test_invalid_fields_and_unknown_bank(self):
        self.assertEqual(self.client.post(f"{self.bp}/synthetic-inventory/receipts", json={"blood_type":"O-","units":True}, headers=self.bauth).status_code,400)
        self.assertEqual(self.client.post(f"{self.bp}/synthetic-inventory/receipts", json={"blood_type":"O-","units":3,"patient_name":"forbidden"}, headers=self.bauth).status_code,400)
        self.assertEqual(self.handoff(uuid4()).status_code,404)

    def test_audit_failure_rolls_back_inventory_and_status(self):
        self.assertEqual(self.receipt().status_code,201)
        self.assertEqual(self.handoff().status_code,201)
        with self.assertRaises(RuntimeError):
            with self.conn.begin_nested():
                with patch("security.synthetic_inventory._audit", side_effect=RuntimeError("simulated failure")):
                    self.reserve()
        self.assertEqual(self.units(),3)
        self.assertEqual(self.conn.execute(text("SELECT status FROM bloodbridge_private.synthetic_requests WHERE id=:id"), {"id":self.req}).scalar_one(),"open")
        self.assertEqual(self.conn.execute(text("SELECT count(*) FROM bloodbridge_private.synthetic_reservations WHERE request_id=:id"), {"id":self.req}).scalar_one(),0)


if __name__ == "__main__":
    unittest.main()
