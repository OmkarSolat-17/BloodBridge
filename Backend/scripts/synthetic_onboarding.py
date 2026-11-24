"""Explicitly local, synthetic-only operator CLI. Never use for real entities."""
import argparse
import json
import os
import sys
from pathlib import Path
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from security.synthetic_onboarding import (  # noqa: E402
    OnboardingError, approve_membership, create_organization,
    suspend_membership, verify_organization,
)


def local_test_url():
    if os.environ.get("BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY") != "1":
        raise ValueError("Set BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY=1 for synthetic local use.")
    raw = os.environ.get("BLOODBRIDGE_ONBOARDING_DATABASE_URL")
    if not raw:
        raise ValueError("Set BLOODBRIDGE_ONBOARDING_DATABASE_URL to a disposable local database.")
    try:
        url = make_url(raw)
    except Exception as exc:
        raise ValueError("Invalid PostgreSQL database URL.") from exc
    if (url.drivername not in ("postgres", "postgresql", "postgresql+psycopg")
        or url.host not in ("localhost", "127.0.0.1", "::1")
        or url.database not in ("bloodbridge_test", "bloodbridge_dev")):
        raise ValueError("Only local bloodbridge_test or bloodbridge_dev PostgreSQL databases are allowed.")
    return url.set(drivername="postgresql+psycopg")


def parse_args():
    parser = argparse.ArgumentParser(description="Synthetic-only local onboarding; not for real people or facilities.")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-organization")
    create.add_argument("--organization", type=UUID, required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--kind", choices=("hospital", "blood_bank"), required=True)
    verify = commands.add_parser("verify-organization")
    verify.add_argument("--organization", type=UUID, required=True)
    for command in ("approve-membership", "suspend-membership"):
        sub = commands.add_parser(command)
        sub.add_argument("--organization", type=UUID, required=True)
        sub.add_argument("--subject", type=UUID, required=True)
        if command == "approve-membership":
            sub.add_argument("--role", choices=("hospital_operator", "blood_bank_operator"), required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        engine = create_engine(local_test_url(), hide_parameters=True)
        try:
            with engine.begin() as connection:
                if args.command == "create-organization":
                    changed = create_organization(connection, args.organization, args.name, args.kind)
                elif args.command == "verify-organization":
                    changed = verify_organization(connection, args.organization)
                elif args.command == "approve-membership":
                    changed = approve_membership(connection, args.organization, args.subject, args.role)
                else:
                    changed = suspend_membership(connection, args.organization, args.subject)
        finally:
            engine.dispose()
    except (ValueError, OnboardingError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except SQLAlchemyError:
        print("Error: local database operation failed; transaction rolled back.", file=sys.stderr)
        return 1
    print(json.dumps({"status": "ok", "changed": changed, "scope": "synthetic-local-only"}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
