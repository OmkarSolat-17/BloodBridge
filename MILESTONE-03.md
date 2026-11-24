# Milestone 03 — local migrations and organization-scoped authorization

## Status

**Development groundwork only.** No hospital, donor, blood-bank or emergency API is enabled. The frontend cannot yet execute real backend workflows. The identity verifier and authorization policy are **not wired to endpoints**. There is no onboarding, role approval, audit event, clinical validation or Supabase deployment in this milestone. Do not use real patient/donor information.

## What was added

- An Alembic environment and first PostgreSQL migration. It only connects to databases named `bloodbridge_dev` or `bloodbridge_test` on `localhost`, `127.0.0.1` or `::1`. Remote migration attempts are rejected. Offline output is also disabled.
- Tables in `bloodbridge_private`:
  - `identities`: identity-provider subject UUID; pending, active or suspended.
  - `organizations`: UUID, name, hospital/blood-bank type and pending/verified/suspended status.
  - `memberships`: one role and status per subject/organization, with foreign keys and uniqueness enforced by the primary key.
- Statuses default to **pending**. A database check requires known statuses, roles and organization types. Hospital/blood-bank verification is a future trusted process, not self-registration or clinical approval.
- A default-deny authorization primitive. For the two currently modeled actions, it requires a provider-verified identity, an active identity and membership, a verified organization, the matching role/type and the exact organization ID. Database errors propagate and must be handled as denial/unavailable when wired to an endpoint. No action for a donor or administrator has been granted.
- Tests of the migration, constraints, pending defaults, scoped membership, revocation, denied roles, local-only guard and repeated upgrade. GitHub Actions uses a disposable local PostgreSQL service.

## Privacy and security boundaries

The migration revokes **PUBLIC** access on the schema and tables, and keeps Alembic's version table in that schema. This is only one control: confirm the schema is not exposed by Supabase's Data API, audit named role and default grants, and set up least-privilege runtime/migration accounts before any hosted use. **No RLS policies are implemented**; owners and privileged roles may bypass restrictions. Direct PostgreSQL connections do not automatically inherit Supabase user RLS. A schema name is not a security guarantee.

The authorization function accepts an internal `VerifiedIdentity` object. When endpoints are built, only the configured, verified identity provider may produce the identity from the request; never accept subject ID or roles as proof from the client. A positive policy result is not proof of clinical eligibility, crossmatch, consent or availability. Authorization must be evaluated in the context of each operation, with transaction/revocation behavior designed to avoid time-of-check/time-of-use races.

## Local migration setup

1. Install PostgreSQL and create a **disposable** local database named `bloodbridge_dev` or `bloodbridge_test` with a dedicated development migration user. Do not use the old SQLite database or a real/hosted database.
2. Install dependencies from `Backend/requirements.txt` in your virtual environment.
3. Set `BLOODBRIDGE_MIGRATION_DATABASE_URL` in your shell to the database's PostgreSQL connection URL. Use the actual local user, password and port; percent-encode special characters in credentials. Don't commit or share the URL. The migration user requires schema/table creation rights; the future runtime account should not share those privileges.
4. From the repository root, run:

```bash
python -m alembic -c Backend/alembic.ini upgrade head
```

Alembic creates the schema and version table; running `upgrade head` again is safe for the tested snapshot. Migrations are a separate explicit operation, never run on app startup. Downgrade is intentionally disabled: a recovery plan must be reviewed before deleting data. A schema can remain after a failed migration; inspect the dedicated dev database rather than deleting anything blindly.

**Do not configure a Supabase URL here yet.** The local-only restriction is deliberate. Live migrations, schema ownership, grants, backups, provider configuration and rollout procedures require separate review.

## Tests

```bash
python -m pip install -r Backend/requirements.txt
python -m unittest discover -s Backend/tests -v
```

For PostgreSQL integration tests, set `BLOODBRIDGE_TEST_POSTGRES_URL` to a **dedicated disposable local** database named `bloodbridge_test`. The tests apply the migration to that database; test data inserts are rolled back. The migration/schema itself remains afterward. If the variable is missing, PostgreSQL tests are skipped. Never point test configuration at a shared database. CI supplies its own synthetic PostgreSQL service.

The full local suite was run against PostgreSQL 17 and synthetic data. The Supabase provider tests still use mocks; no live provider, browser, load, clinical or external security testing was done. Dependency versions remain ranges rather than a complete reproducible lockfile. CI is configured but was not run on GitHub in this workspace.

## Next

Define trusted hospital/blood-bank verification, role invitations and revocation with audit records. Integrate the verified provider identity with the policy in a narrow authenticated endpoint, test every negative path, then begin the synthetic emergency workflow. Before pilot deployment, review data access/consent, transaction safety, clinical procedures, backup/restore, uptime and legal obligations with qualified stakeholders.
