"""Migration and authorization integration tests with a disposable local DB."""
import os
import subprocess
import sys
import unittest
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from security.authorization import is_allowed  # noqa: E402
from security.supabase_identity import VerifiedIdentity  # noqa: E402

BACKEND = Path(__file__).resolve().parents[1]


def alembic(url, operation="upgrade", revision="head"):
    env = os.environ.copy()
    env["BLOODBRIDGE_MIGRATION_DATABASE_URL"] = url
    return subprocess.run(
        [sys.executable, "-m", "alembic", "-c", str(BACKEND / "alembic.ini"), operation, revision],
        cwd=BACKEND, env=env, capture_output=True, text=True, timeout=30,
    )


class MigrationSafetyTests(unittest.TestCase):
    def test_remote_migration_is_refused(self):
        result = alembic("postgresql://test:synthetic@db.example.invalid:5432/bloodbridge_dev")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("restricted to local", result.stderr)

    def test_wrong_local_database_name_refused(self):
        result = alembic("postgresql://test:synthetic@127.0.0.1:5432/other_database")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("restricted to local", result.stderr)


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class MigrationIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = os.environ["BLOODBRIDGE_TEST_POSTGRES_URL"]
        url = make_url(raw)
        if (url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
            or url.host not in ("127.0.0.1", "localhost", "::1")
            or url.database != "bloodbridge_test"):
            raise RuntimeError("Requires a dedicated localhost database named bloodbridge_test")
        result = alembic(raw)
        if result.returncode:
            raise RuntimeError("Local test migration failed: " + result.stderr)
        cls.engine = create_engine(url.set(drivername="postgresql+psycopg"))
        cls.raw_url = raw

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        self.connection = self.engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)

    def test_versioned_schema_created_and_upgrade_is_repeatable(self):
        tables = inspect(self.connection).get_table_names(schema="bloodbridge_private")
        self.assertTrue({"alembic_version", "identities", "organizations", "memberships"}.issubset(tables))
        revision = self.connection.execute(text("SELECT version_num FROM bloodbridge_private.alembic_version")).scalar_one()
        self.assertEqual(revision, "0001_identity_organizations")
        result = alembic(self.raw_url)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_schema_grants_no_public_access(self):
        public_grants = self.connection.execute(text("""
            SELECT count(*) FROM pg_namespace n,
                LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
            WHERE n.nspname = 'bloodbridge_private' AND a.grantee = 0
        """)).scalar_one()
        self.assertEqual(public_grants, 0)

    def test_active_membership_is_scoped_and_pending_defaults_deny(self):
        subject, org1, org2 = uuid4(), uuid4(), uuid4()
        c = self.connection
        c.execute(text("INSERT INTO bloodbridge_private.identities (subject_id) VALUES (:id)"), {"id": subject})
        c.execute(text("INSERT INTO bloodbridge_private.organizations (id,name,kind) VALUES (:id,'Synthetic hospital','hospital')"), {"id": org1})
        c.execute(text("INSERT INTO bloodbridge_private.organizations (id,name,kind,status) VALUES (:id,'Other hospital','hospital','verified')"), {"id": org2})
        c.execute(text("INSERT INTO bloodbridge_private.memberships (subject_id,organization_id,role) VALUES (:sub,:org,'hospital_operator')"), {"sub": subject, "org": org1})
        identity = VerifiedIdentity(str(subject))
        self.assertFalse(is_allowed(c, identity, org1, "hospital.request.create"))
        c.execute(text("UPDATE bloodbridge_private.identities SET status='active' WHERE subject_id=:id"), {"id": subject})
        c.execute(text("UPDATE bloodbridge_private.organizations SET status='verified' WHERE id=:id"), {"id": org1})
        c.execute(text("UPDATE bloodbridge_private.memberships SET status='active' WHERE subject_id=:id"), {"id": subject})
        self.assertTrue(is_allowed(c, identity, org1, "hospital.request.create"))
        self.assertFalse(is_allowed(c, identity, org2, "hospital.request.create"))
        self.assertFalse(is_allowed(c, identity, org1, "blood_bank.inventory.manage"))
        c.execute(text("UPDATE bloodbridge_private.memberships SET status='suspended' WHERE subject_id=:id"), {"id": subject})
        self.assertFalse(is_allowed(c, identity, org1, "hospital.request.create"))

    def test_database_rejects_invalid_status_and_dangling_membership(self):
        with self.assertRaises(IntegrityError):
            with self.connection.begin_nested():
                self.connection.execute(text("INSERT INTO bloodbridge_private.identities(subject_id,status) VALUES (:id,'superadmin')"), {"id": uuid4()})
        with self.assertRaises(IntegrityError):
            with self.connection.begin_nested():
                self.connection.execute(text("INSERT INTO bloodbridge_private.memberships(subject_id,organization_id,role) VALUES (:sub,:org,'hospital_operator')"), {"sub": uuid4(), "org": uuid4()})

    def test_downgrade_is_not_silently_destructive(self):
        result = alembic(self.raw_url, "downgrade", "base")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Downgrade is disabled", result.stderr)
        version = self.connection.execute(text("SELECT version_num FROM bloodbridge_private.alembic_version")).scalar_one()
        self.assertEqual(version, "0001_identity_organizations")


if __name__ == "__main__":
    unittest.main()
