"""Regression tests for the temporary, fail-closed backend foundation."""
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app import create_app  # noqa: E402
from database.database import db  # noqa: E402
from sqlalchemy import inspect  # noqa: E402


class FoundationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db_path = Path(self.temp.name) / "test.db"
        self.app = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "synthetic-test-key-not-for-deployment-123456",
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{self.db_path}",
        })
        self.client = self.app.test_client()

    def test_missing_and_short_secrets_fail_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            for value in (None, "short", ""):
                with self.subTest(value=value):
                    with self.assertRaises(RuntimeError):
                        create_app({"JWT_SECRET_KEY": value})

    def test_liveness_does_not_claim_readiness(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertIs(response.get_json()["ready"], False)
        self.assertEqual(response.get_json()["mode"], "security-rebuild")

    def test_startup_does_not_create_or_modify_database(self):
        self.assertFalse(self.db_path.exists())
        self.client.get("/api/health")
        self.assertFalse(self.db_path.exists())

    def test_all_registered_non_health_routes_are_guarded(self):
        # Exercise each URL rule and method, including legacy aliases and OPTIONS.
        for rule in self.app.url_map.iter_rules():
            if rule.endpoint in {"health_check", "static"}:
                continue
            url = re.sub(r"<uuid:[^>]+>", "00000000-0000-0000-0000-000000000001", rule.rule)
            url = re.sub(r"<[^>]+>", "1", url)
            for method in rule.methods:
                if rule.endpoint == "access.organization_access" and method in {"GET", "HEAD"}:
                    continue  # Separately exercised by test_access_api.
                with self.subTest(url=url, method=method):
                    response = self.client.open(url, method=method)
                    self.assertEqual(response.status_code, 503)
                    if method != "HEAD":
                        self.assertEqual(response.get_json()["status"], "unavailable")

    def test_unknown_route_is_not_exposed(self):
        self.assertEqual(self.client.get("/api/not-a-real-route").status_code, 404)

    def test_cors_is_not_enabled_by_default(self):
        response = self.client.get("/api/health", headers={"Origin": "https://untrusted.example"})
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)

    def test_schema_initialization_is_explicit_and_refuses_existing_tables(self):
        runner = self.app.test_cli_runner()
        first = runner.invoke(args=["init-empty-db"])
        self.assertEqual(first.exit_code, 0, first.output)
        with self.app.app_context():
            self.assertIn("donors", inspect(db.engine).get_table_names())
        second = runner.invoke(args=["init-empty-db"])
        self.assertNotEqual(second.exit_code, 0)
        self.assertIn("refusing to modify", second.output)


if __name__ == "__main__":
    unittest.main()
