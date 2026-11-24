# BloodBridge — security rebuild in progress

> **Not ready for real-world use.** Do not use real patient or donor data, rely on this software in an emergency, or deploy it publicly. All legacy API routes are deliberately disabled while their security and correctness are rebuilt. The frontend will not currently perform working backend operations.

BloodBridge aims to support authorized blood-bank and donor coordination. This repository is being rebuilt towards a real-world pilot, starting with emergency requests. Clinical, legal, privacy, security and operational review will be required before that pilot.

## Current milestone: local migrations and authorization foundation

- PostgreSQL is the target database, with Supabase as an optional managed PostgreSQL host; the application uses the psycopg 3 driver. SQLite is for isolated local tests only.
- A Supabase Auth identity-verification adapter is implemented and tested with mocked responses, but is **not connected to any API route** and has not been tested against a real Supabase project. Identity alone does not grant a role or access to records.
- Backend uses an application factory with an explicit, unique JWT secret and configurable database URL. The secret is still required by the legacy JWT setup; it is not a Supabase service key.
- Startup does not create or migrate a database. A local-only Alembic migration creates a preliminary PostgreSQL identity, organization and membership schema; remote migrations are blocked.
- A default-deny, organization-scoped authorization primitive has unit and local PostgreSQL tests, but is **not wired to HTTP endpoints**. No onboarding or verification workflows have been implemented.
- **Every legacy API endpoint except liveness currently returns HTTP 503.** This includes login and registration: authentication and permissions have not yet been rebuilt.
- `/api/health` is liveness only; it reports `ready: false` and does not certify readiness.
- Flask debug and permissive CORS are not enabled by this entry point. The frontend's localhost API calls and mixed simulated/backend flows still need to be replaced.
- Tests exercise the safety gate, secret configuration and empty-database setup; they do **not** establish clinical safety or application completeness.

## Run the foundation locally

Requires Python and dependencies from `Backend/requirements.txt`. Dependencies are currently unpinned and must be locked and reviewed before deployment.

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r Backend/requirements.txt
python -m unittest discover -s Backend/tests -v

# Create a new random local secret for this shell; never commit it.
export BLOODBRIDGE_JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
cd Backend
python app.py
```

Windows PowerShell instead of the `export` line:

```powershell
$env:BLOODBRIDGE_JWT_SECRET = python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Open `http://127.0.0.1:5000/api/health` for a liveness response. No data routes are available yet. The development server is not a production server. A new secret on each restart invalidates existing tokens; deployment requires a unique securely managed, persistent secret and a rotation plan.

### Optional: create an empty local database

This command uses the configured database or the default under `Backend/instance/`. It refuses to initialize a database that already contains tables; it is **not** a migration system and should only be used for disposable synthetic development.

```bash
cd Backend
flask --app app:create_app init-empty-db
```

Set `BLOODBRIDGE_DATABASE_URL` before running the command to choose a database. Never point it at the old checked-in database or a real-world database. The command explicitly refuses PostgreSQL; use the separate local Alembic migration documented below.

## PostgreSQL and Supabase

See [MILESTONE-02.md](MILESTONE-02.md) for the stack decision and [MILESTONE-03.md](MILESTONE-03.md) for migration and permissions details. `BLOODBRIDGE_DATABASE_URL` accepts PostgreSQL URLs and uses psycopg 3. **Do not run this application against a production Supabase database:** the schema and authorization have not been reviewed or connected to live endpoints. No Supabase connection has been tested, and no project credentials are needed.

The new migration is restricted to disposable **local** PostgreSQL databases named `bloodbridge_test` or `bloodbridge_dev`; it creates tables and the Alembic version table in `bloodbridge_private`. Set a dedicated migration URL and run:

```bash
# Set BLOODBRIDGE_MIGRATION_DATABASE_URL in your shell to your local database URL.
python -m alembic -c Backend/alembic.ini upgrade head
```

Use a dedicated migration credential; the URL is separate from the application's database URL. Never commit a password. See the milestone for setup and warnings. The optional PostgreSQL integration tests use `BLOODBRIDGE_TEST_POSTGRES_URL` and **apply migrations** to a dedicated localhost database named `bloodbridge_test`; they are skipped when that variable is absent. The CI workflow defines its own synthetic PostgreSQL service.

## Sensitive data and Git history

The original checkout contained `Backend/bloodbridge.db` and Python bytecode tracked by Git. `.gitignore` prevents new untracked matching files from being added, but does not untrack existing files or erase previous commits. Determine whether the database contains real data before sharing it; do not publish database contents. If it does, assess exposure, rotate affected credentials and address history, forks and applicable notification obligations appropriately. Removing the current file alone does not erase the history.

## Next stages

1. Review the preliminary role model and implement trusted onboarding, authentication and endpoint authorization with auditability.
2. Implement the emergency-request vertical slice with validation, transaction-safe idempotent inventory reservations and explicit human review.
3. Integrate the frontend without simulated actions masquerading as real operations; add browser-level tests.
4. Review production migrations, lock dependencies, and address monitoring, consent, retention, security and clinical requirements before any pilot.
