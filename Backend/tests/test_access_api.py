"""Access endpoint tests. Supabase calls are mocked, never live."""
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from app import create_app  # noqa: E402
from security.supabase_identity import (  # noqa: E402
    IdentityServiceUnavailable, InvalidCredentials, VerifiedIdentity,
)

SECRET = "synthetic-test-key-not-for-deployment-123456"


class AccessAPITests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET,
                               "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                               "SUPABASE_PROJECT_URL": None, "SUPABASE_PUBLISHABLE_KEY": None})
        self.client = self.app.test_client()
        self.org = uuid4()
        self.path = f"/api/v1/organizations/{self.org}/access"
        self.provider = Mock()
        self.provider.verify.return_value = VerifiedIdentity(str(uuid4()))
        self.app.extensions["bloodbridge_identity_provider"] = self.provider
        self.auth = {"Authorization": "Bearer synthetic-token"}

    def test_missing_or_malformed_auth_is_401_and_not_cached(self):
        for value in (None, "", "Basic abc", "Bearer", "Bearer a b"):
            headers = {"Authorization": value} if value is not None else {}
            response = self.client.get(self.path, headers=headers)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers.get("Cache-Control"), "no-store")
            self.assertEqual(response.headers.get("WWW-Authenticate"), "Bearer")
        self.provider.verify.assert_not_called()

    def test_invalid_token_and_identity_outage_fail_closed(self):
        for error, status in ((InvalidCredentials(), 401), (IdentityServiceUnavailable(), 503)):
            self.provider.verify.side_effect = error
            response = self.client.get(self.path, headers=self.auth)
            self.assertEqual(response.status_code, status)
            self.assertNotIn("synthetic-token", response.get_data(as_text=True))
            self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.provider.verify.side_effect = None
        self.provider.verify.return_value = {"sub": "not trusted"}
        self.assertEqual(self.client.get(self.path, headers=self.auth).status_code, 503)

    def test_unconfigured_provider_and_sqlite_cannot_authorize(self):
        self.app.extensions.pop("bloodbridge_identity_provider")
        self.assertEqual(self.client.get(self.path, headers=self.auth).status_code, 503)
        self.app.extensions["bloodbridge_identity_provider"] = self.provider
        self.assertEqual(self.client.get(self.path, headers=self.auth).status_code, 503)

    def test_success_and_uniform_denial_using_mocked_database(self):
        with patch("routes.access.db") as db, patch("routes.access.allowed_actions") as check:
            db.engine.dialect.name = "postgresql"
            check.return_value = ("hospital.request.create",)
            response = self.client.get(self.path, headers={**self.auth, "X-Role": "admin"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json["organization_id"], str(self.org))
            self.assertEqual(response.json["policy_actions"], ["hospital.request.create"])
            self.assertEqual(response.headers.get("Cache-Control"), "no-store")
            self.provider.verify.assert_called_once_with("synthetic-token")
            self.assertEqual(check.call_args.args[2], self.org)
            check.return_value = ()
            denied = self.client.get(self.path, headers=self.auth)
            self.assertEqual(denied.status_code, 403)
            self.assertNotIn(str(self.org), denied.get_data(as_text=True))

    def test_database_error_returns_generic_503(self):
        with patch("routes.access.db") as db:
            db.engine.dialect.name = "postgresql"
            db.engine.connect.side_effect = OperationalError("synthetic", {}, Exception("db down"))
            response = self.client.get(self.path, headers=self.auth)
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("db down", response.get_data(as_text=True))

    def test_other_methods_and_legacy_routes_are_not_unlocked(self):
        self.assertEqual(self.client.options(self.path).status_code, 503)
        self.assertEqual(self.client.post(self.path, headers=self.auth).status_code, 405)
        self.assertEqual(self.client.get("/api/donors", headers=self.auth).status_code, 503)
        self.assertEqual(self.client.get("/api/health").json["ready"], False)

    def test_partial_provider_config_is_rejected(self):
        with self.assertRaises(RuntimeError):
            create_app({"JWT_SECRET_KEY": SECRET, "SUPABASE_PROJECT_URL": "https://example.org", "SUPABASE_PUBLISHABLE_KEY": None})


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class AccessPostgresTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw = os.environ["BLOODBRIDGE_TEST_POSTGRES_URL"]
        url = make_url(raw)
        if (url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
            or url.host not in ("localhost", "127.0.0.1", "::1")
            or url.database != "bloodbridge_test"):
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
        self.subject, self.org, self.other = uuid4(), uuid4(), uuid4()
        self.app = create_app({"TESTING": True, "JWT_SECRET_KEY": SECRET,
                               "SQLALCHEMY_DATABASE_URI": self.raw,
                               "SUPABASE_PROJECT_URL": None, "SUPABASE_PUBLISHABLE_KEY": None})
        provider = Mock()
        provider.verify.return_value = VerifiedIdentity(str(self.subject))
        self.app.extensions["bloodbridge_identity_provider"] = provider
        self.client = self.app.test_client()
        self.auth = {"Authorization": "Bearer synthetic-token"}
        self.addCleanup(self.remove_synthetic_rows)
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO bloodbridge_private.identities(subject_id,status) VALUES (:sub,'active')"), {"sub": self.subject})
            for org in (self.org, self.other):
                c.execute(text("INSERT INTO bloodbridge_private.organizations(id,name,kind,status) VALUES (:org,'Synthetic hospital','hospital','verified')"), {"org": org})
            c.execute(text("INSERT INTO bloodbridge_private.memberships(subject_id,organization_id,role,status) VALUES (:sub,:org,'hospital_operator','active')"), {"sub": self.subject, "org": self.org})

    def remove_synthetic_rows(self):
        with self.engine.begin() as c:
            c.execute(text("DELETE FROM bloodbridge_private.memberships WHERE subject_id=:sub"), {"sub": self.subject})
            c.execute(text("DELETE FROM bloodbridge_private.organizations WHERE id IN (:one,:two)"), {"one": self.org, "two": self.other})
            c.execute(text("DELETE FROM bloodbridge_private.identities WHERE subject_id=:sub"), {"sub": self.subject})

    def test_scoped_access_revocation_and_unknown_org(self):
        def get(org):
            return self.client.get(f"/api/v1/organizations/{org}/access", headers=self.auth)
        response = get(self.org)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["policy_actions"], ["hospital.request.create"])
        self.assertEqual(get(self.other).status_code, 403)
        self.assertEqual(get(uuid4()).status_code, 403)
        with self.engine.begin() as c:
            c.execute(text("UPDATE bloodbridge_private.memberships SET status='suspended' WHERE subject_id=:sub"), {"sub": self.subject})
        self.assertEqual(get(self.org).status_code, 403)


if __name__ == "__main__":
    unittest.main()
