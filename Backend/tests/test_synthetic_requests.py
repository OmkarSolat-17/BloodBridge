"""Synthetic request validation and PostgreSQL-backed endpoint tests."""
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
from security.synthetic_requests import RequestValidationError, validate_input  # noqa: E402

SECRET = "synthetic-test-key-not-for-deployment-123456"
PAYLOAD = {"blood_type": "O-", "units_required": 2, "urgency": "urgent"}


class RequestValidationTests(unittest.TestCase):
    def test_invalid_payload_and_key_are_rejected(self):
        samples = [None, {}, {**PAYLOAD, "patient_name": "not allowed"},
                   {**PAYLOAD, "blood_type": "Z+"}, {**PAYLOAD, "blood_type": []},
                   {**PAYLOAD, "units_required": True}, {**PAYLOAD, "units_required": 0},
                   {**PAYLOAD, "units_required": 11}, {**PAYLOAD, "urgency": "unknown"}]
        for sample in samples:
            with self.subTest(sample=sample), self.assertRaises(RequestValidationError):
                validate_input(sample, str(uuid4()))
        with self.assertRaises(RequestValidationError):
            validate_input(PAYLOAD, "not-a-uuid")

    def test_key_and_payload_hash_are_stable(self):
        key = str(uuid4())
        self.assertEqual(validate_input(PAYLOAD, key), validate_input(dict(reversed(list(PAYLOAD.items()))), key))

    def test_disabled_by_default_and_nonlocal_or_sqlite_is_disabled(self):
        for url, flag in (("sqlite:///:memory:", "1"), ("postgresql://x:x@db.example.invalid/bloodbridge_dev", "1"), ("sqlite:///:memory:", "0")):
            app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET, "SQLALCHEMY_DATABASE_URI": url,
                              "BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS": flag,
                              "SUPABASE_PROJECT_URL": None, "SUPABASE_PUBLISHABLE_KEY": None})
            response = app.test_client().post(f"/api/v1/organizations/{uuid4()}/synthetic-requests")
            self.assertEqual(response.status_code, 503)


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class SyntheticRequestAPITests(unittest.TestCase):
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
        self.org, self.other, self.subject = uuid4(), uuid4(), uuid4()
        self.conn.execute(text("INSERT INTO bloodbridge_private.identities(subject_id,status) VALUES (:id,'active')"), {"id": self.subject})
        for org in (self.org, self.other):
            self.conn.execute(text("INSERT INTO bloodbridge_private.organizations(id,name,kind,status) VALUES (:id,'Synthetic Hospital','hospital','verified')"), {"id": org})
        self.conn.execute(text("INSERT INTO bloodbridge_private.memberships(subject_id,organization_id,role,status) VALUES (:sub,:org,'hospital_operator','active')"), {"sub": self.subject, "org": self.org})
        self.app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET, "SQLALCHEMY_DATABASE_URI": self.raw,
                               "SUPABASE_PROJECT_URL": None, "SUPABASE_PUBLISHABLE_KEY": None,
                               "BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS": "1"})
        provider = Mock()
        provider.verify.return_value = VerifiedIdentity(str(self.subject))
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
        self.path = f"/api/v1/organizations/{self.org}/synthetic-requests"
        self.headers = {"Authorization": "Bearer synthetic-token", "Idempotency-Key": str(uuid4())}

    def test_create_read_retry_and_audit_once(self):
        first = self.client.post(self.path, json=PAYLOAD, headers=self.headers)
        self.assertEqual(first.status_code, 201, first.get_data(as_text=True))
        self.assertEqual(first.json["mode"], "synthetic-only")
        self.assertEqual(first.headers["Cache-Control"], "no-store")
        rid = first.json["request"]["id"]
        retry = self.client.post(self.path, json=PAYLOAD, headers=self.headers)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.json["request"]["id"], rid)
        changed = self.client.post(self.path, json={**PAYLOAD, "units_required": 3}, headers=self.headers)
        self.assertEqual(changed.status_code, 409)
        read = self.client.get(f"{self.path}/{rid}", headers=self.headers)
        self.assertEqual(read.status_code, 200)
        self.assertEqual(read.json["request"]["blood_type"], "O-")
        count = self.conn.execute(text("SELECT count(*) FROM bloodbridge_private.synthetic_request_audit WHERE request_id=:id"), {"id": rid}).scalar_one()
        self.assertEqual(count, 1)

    def test_no_auth_wrong_org_and_suspended_denied(self):
        self.assertEqual(self.client.post(self.path, json=PAYLOAD).status_code, 401)
        other = f"/api/v1/organizations/{self.other}/synthetic-requests"
        self.assertEqual(self.client.post(other, json=PAYLOAD, headers=self.headers).status_code, 403)
        self.conn.execute(text("UPDATE bloodbridge_private.memberships SET status='suspended' WHERE subject_id=:id"), {"id": self.subject})
        self.assertEqual(self.client.post(self.path, json=PAYLOAD, headers=self.headers).status_code, 403)

    def test_validation_and_extra_private_fields_do_not_create_records(self):
        self.assertEqual(self.client.post(self.path, json={**PAYLOAD, "patient_name": "not permitted"}, headers=self.headers).status_code, 400)
        self.assertEqual(self.client.post(self.path, json=PAYLOAD, headers={"Authorization": "Bearer token"}).status_code, 400)
        self.assertEqual(self.client.post(self.path, json={**PAYLOAD, "units_required": True}, headers=self.headers).status_code, 400)
        count = self.conn.execute(text("SELECT count(*) FROM bloodbridge_private.synthetic_requests WHERE organization_id=:id"), {"id": self.org}).scalar_one()
        self.assertEqual(count, 0)

    def test_oversized_payload_is_rejected(self):
        response = self.client.post(self.path, data='{"extra":"' + 'x' * 5000 + '"}',
                                    headers=self.headers, content_type="application/json")
        self.assertEqual(response.status_code, 413)

    def test_cross_organization_and_unknown_request_not_found(self):
        first = self.client.post(self.path, json=PAYLOAD, headers=self.headers)
        rid = first.json["request"]["id"]
        cross = self.client.get(f"/api/v1/organizations/{self.other}/synthetic-requests/{rid}", headers=self.headers)
        self.assertEqual(cross.status_code, 403)
        self.assertEqual(self.client.get(f"{self.path}/{uuid4()}", headers=self.headers).status_code, 404)

    def test_failure_after_audit_rolls_back_creation(self):
        with patch("security.synthetic_requests._public", side_effect=RuntimeError("synthetic failure")):
            # Use a savepoint to model engine.begin rollback on any failure.
            with self.assertRaises(RuntimeError):
                with self.conn.begin_nested():
                    self.client.post(self.path, json=PAYLOAD, headers=self.headers)
        count = self.conn.execute(text("SELECT count(*) FROM bloodbridge_private.synthetic_requests WHERE organization_id=:id"), {"id": self.org}).scalar_one()
        self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
