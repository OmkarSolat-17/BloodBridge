"""Synthetic local onboarding tests; PostgreSQL tests need an isolated local DB."""
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from security.authorization import is_allowed  # noqa: E402
from security.supabase_identity import VerifiedIdentity  # noqa: E402
from security.synthetic_onboarding import (  # noqa: E402
    OnboardingError, approve_membership, create_organization, suspend_membership, verify_organization,
)
from scripts.synthetic_onboarding import local_test_url  # noqa: E402


class OnboardingGuardTests(unittest.TestCase):
    def test_requires_explicit_synthetic_flag_and_url(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError):
                local_test_url()
        with patch.dict(os.environ, {"BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY": "1"}, clear=True):
            with self.assertRaises(ValueError):
                local_test_url()

    def test_refuses_remote_wrong_database_and_non_postgres(self):
        urls = (
            "postgresql://x:x@supabase.invalid/bloodbridge_test",
            "postgresql://x:x@localhost/production",
            "sqlite:///bloodbridge_test",
        )
        for url in urls:
            with self.subTest(url=url):
                with patch.dict(os.environ, {"BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY": "1", "BLOODBRIDGE_ONBOARDING_DATABASE_URL": url}, clear=True):
                    with self.assertRaises(ValueError):
                        local_test_url()

    def test_allows_only_designated_local_database(self):
        with patch.dict(os.environ, {"BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY": "1", "BLOODBRIDGE_ONBOARDING_DATABASE_URL": "postgresql://x:x@127.0.0.1/bloodbridge_dev"}, clear=True):
            self.assertEqual(local_test_url().drivername, "postgresql+psycopg")


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class OnboardingPostgresTests(unittest.TestCase):
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
            raise RuntimeError("Test migration failed: " + result.stderr)
        cls.engine = create_engine(url.set(drivername="postgresql+psycopg"))

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        self.connection = self.engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        self.org, self.subject = uuid4(), uuid4()

    def events(self):
        return self.connection.execute(text("""
            SELECT event_type FROM bloodbridge_private.synthetic_onboarding_audit
            WHERE organization_id=:org ORDER BY id
        """), {"org": self.org}).scalars().all()

    def test_complete_approval_revocation_and_idempotence(self):
        c = self.connection
        self.assertTrue(create_organization(c, self.org, "Synthetic Hospital", "hospital"))
        self.assertFalse(create_organization(c, self.org, "Synthetic Hospital", "hospital"))
        with self.assertRaises(OnboardingError):
            approve_membership(c, self.org, self.subject, "hospital_operator")
        self.assertTrue(verify_organization(c, self.org))
        self.assertFalse(verify_organization(c, self.org))
        self.assertTrue(approve_membership(c, self.org, self.subject, "hospital_operator"))
        self.assertFalse(approve_membership(c, self.org, self.subject, "hospital_operator"))
        identity = VerifiedIdentity(str(self.subject))
        self.assertTrue(is_allowed(c, identity, self.org, "hospital.request.create"))
        self.assertTrue(suspend_membership(c, self.org, self.subject))
        self.assertFalse(suspend_membership(c, self.org, self.subject))
        self.assertFalse(is_allowed(c, identity, self.org, "hospital.request.create"))
        with self.assertRaises(OnboardingError):
            approve_membership(c, self.org, self.subject, "hospital_operator")
        self.assertEqual(self.events(), ["organization_created", "organization_verified", "identity_activated", "membership_approved", "membership_suspended"])

    def test_wrong_kind_and_conflicting_organization_are_rejected(self):
        c = self.connection
        create_organization(c, self.org, "Synthetic Hospital", "hospital")
        with self.assertRaises(OnboardingError):
            create_organization(c, self.org, "Different", "hospital")
        verify_organization(c, self.org)
        with self.assertRaises(OnboardingError):
            approve_membership(c, self.org, self.subject, "blood_bank_operator")
        self.assertEqual(self.events(), ["organization_created", "organization_verified"])

    def test_audit_failure_rolls_back_all_state(self):
        c = self.connection
        create_organization(c, self.org, "Synthetic Hospital", "hospital")
        verify_organization(c, self.org)
        with self.assertRaises(RuntimeError):
            with c.begin_nested():
                with patch("security.synthetic_onboarding._audit", side_effect=RuntimeError("synthetic audit failure")):
                    approve_membership(c, self.org, self.subject, "hospital_operator")
        count = c.execute(text("SELECT count(*) FROM bloodbridge_private.identities WHERE subject_id=:id"), {"id": self.subject}).scalar_one()
        self.assertEqual(count, 0)
        self.assertEqual(self.events(), ["organization_created", "organization_verified"])

    def test_audit_rows_reject_update_and_delete(self):
        c = self.connection
        create_organization(c, self.org, "Synthetic Hospital", "hospital")
        for statement in ("UPDATE bloodbridge_private.synthetic_onboarding_audit SET event_type='organization_verified' WHERE organization_id=:org", "DELETE FROM bloodbridge_private.synthetic_onboarding_audit WHERE organization_id=:org"):
            with self.assertRaises(DBAPIError):
                with c.begin_nested():
                    c.execute(text(statement), {"org": self.org})
        self.assertEqual(self.events(), ["organization_created"])


if __name__ == "__main__":
    unittest.main()
