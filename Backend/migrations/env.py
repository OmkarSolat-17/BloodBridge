"""Local-only migration environment. Remote/pilot deployment is not enabled."""
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)


def safe_local_url():
    raw = os.environ.get("BLOODBRIDGE_MIGRATION_DATABASE_URL")
    if not raw:
        raise RuntimeError("Set BLOODBRIDGE_MIGRATION_DATABASE_URL to a disposable local PostgreSQL database.")
    url = make_url(raw)
    if (url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
        or url.host not in ("localhost", "127.0.0.1", "::1")
        or url.database not in ("bloodbridge_test", "bloodbridge_dev")):
        raise RuntimeError("Migrations are restricted to local bloodbridge_test or bloodbridge_dev databases.")
    return url.set(drivername="postgresql+psycopg")


def run_migrations_online():
    # A migration URL is separate from the runtime URL because DDL credentials
    # must not be available to the application. Never log credentials.
    engine = create_engine(safe_local_url(), poolclass=NullPool)
    try:
        with engine.begin() as connection:
            # Alembic's version table also lives in the unexposed schema.
            connection.execute(text("CREATE SCHEMA IF NOT EXISTS bloodbridge_private"))
            connection.execute(text("REVOKE ALL ON SCHEMA bloodbridge_private FROM PUBLIC"))
        with engine.connect() as connection:
            context.configure(connection=connection, target_metadata=None,
                              version_table_schema="bloodbridge_private")
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    raise RuntimeError("Offline migration output is not supported by this local-only environment.")
run_migrations_online()
