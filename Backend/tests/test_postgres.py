"""Optional PostgreSQL smoke tests against a dedicated LOCAL test database only."""
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from app import create_app  # noqa: E402
from database.database import db  # noqa: E402


@unittest.skipUnless(os.environ.get("BLOODBRIDGE_TEST_POSTGRES_URL"), "Local PostgreSQL test URL not configured")
class PostgresTests(unittest.TestCase):
    def setUp(self):
        url = os.environ["BLOODBRIDGE_TEST_POSTGRES_URL"]
        parsed = make_url(url)
        if (not parsed.drivername.startswith("postgres") or
                parsed.host not in ("127.0.0.1", "localhost", "::1") or
                parsed.database != "bloodbridge_test"):
            self.fail("Tests require a dedicated localhost database named bloodbridge_test")
        self.app = create_app({
            "TESTING": True,
            "JWT_SECRET_KEY": "synthetic-test-key-not-for-deployment-123456",
            "SQLALCHEMY_DATABASE_URI": url,
        })

    def test_driver_connection_and_transaction_rollback(self):
        with self.app.app_context():
            self.assertEqual(db.engine.dialect.name, "postgresql")
            self.assertEqual(db.engine.dialect.driver, "psycopg")
            with db.engine.connect() as connection:
                self.assertEqual(connection.execute(text("SELECT 1")).scalar_one(), 1)
                connection.execute(text("CREATE TEMPORARY TABLE bb_test (value integer) ON COMMIT DROP"))
                connection.execute(text("INSERT INTO bb_test VALUES (1)"))
                self.assertEqual(connection.execute(text("SELECT count(*) FROM bb_test")).scalar_one(), 1)
                connection.rollback()

    def test_legacy_schema_init_is_forbidden_on_postgres(self):
        result = self.app.test_cli_runner().invoke(args=["init-empty-db"])
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn("restricted to disposable SQLite", result.output)


if __name__ == "__main__":
    unittest.main()
