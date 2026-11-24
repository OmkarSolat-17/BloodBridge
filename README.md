# BloodBridge — security rebuild in progress

> **Not ready for real-world use.** Do not use real patient or donor data, rely on this software in an emergency, or deploy it publicly. All legacy API routes are deliberately disabled while their security and correctness are rebuilt. The frontend will not currently perform working backend operations.

BloodBridge aims to support authorized blood-bank and donor coordination. This repository is being rebuilt towards a real-world pilot, starting with emergency requests. Clinical, legal, privacy, security and operational review will be required before that pilot.

## Current milestone: synthetic emergency-request creation

- PostgreSQL is the target database, with Supabase as an optional managed PostgreSQL host; the application uses the psycopg 3 driver. SQLite is for isolated local tests only.
- A Supabase Auth identity-verification adapter and PostgreSQL membership check are connected to a single read-only access-check endpoint. The identity-provider tests use mocked responses; no real Supabase project has been tested. Identity alone does not grant a role or access to records.
- Backend uses an application factory with an explicit, unique JWT secret and configurable database URL. The secret is still required by the legacy JWT setup; it is not a Supabase service key.
- Startup does not create or migrate a database. A local-only Alembic migration creates a preliminary PostgreSQL identity, organization and membership schema; remote migrations are blocked.
- The access-check endpoint uses a default-deny, organization-scoped authorization primitive. A local-only CLI can create and approve **synthetic** organizations and memberships; it is not a verified administrator workflow or suitable for real data.
- A guarded synthetic-only API can create and read minimal synthetic emergency requests, with organization authorization, idempotent retries and a transactionally recorded audit event. There is no matching, stock reservation, alert delivery, cancellation or real-patient workflow.
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

Open `http://127.0.0.1:5000/api/health` for a liveness response. The read-only access check and an explicitly enabled local synthetic request API are the only new routes; legacy operational routes remain disabled. The development server is not a production server. A new secret on each restart invalidates existing legacy JWT tokens; deployment requires a unique securely managed, persistent secret and a rotation plan.

### Optional: create an empty local database

This command uses the configured database or the default under `Backend/instance/`. It refuses to initialize a database that already contains tables; it is **not** a migration system and should only be used for disposable synthetic development.

```bash
cd Backend
flask --app app:create_app init-empty-db
```

Set `BLOODBRIDGE_DATABASE_URL` before running the command to choose a database. Never point it at the old checked-in database or a real-world database. The command explicitly refuses PostgreSQL; use the separate local Alembic migration documented below.

## PostgreSQL and Supabase

See [MILESTONE-02.md](MILESTONE-02.md) for the stack decision, [MILESTONE-03.md](MILESTONE-03.md) for migration details, and [MILESTONE-04.md](MILESTONE-04.md) for the access-check endpoint. `BLOODBRIDGE_DATABASE_URL` accepts PostgreSQL URLs and uses psycopg 3. **Do not run this application against a production Supabase database:** the schema and authorization have not been reviewed for deployment. No Supabase connection has been tested, and no project credentials are needed for the test suite.

The new migration is restricted to disposable **local** PostgreSQL databases named `bloodbridge_test` or `bloodbridge_dev`; it creates tables and the Alembic version table in `bloodbridge_private`. Set a dedicated migration URL and run:

```bash
# Set BLOODBRIDGE_MIGRATION_DATABASE_URL in your shell to your local database URL.
python -m alembic -c Backend/alembic.ini upgrade head
```

Use a dedicated migration credential; the URL is separate from the application's database URL. Never commit a password. See the milestone for setup and warnings. The optional PostgreSQL integration tests use `BLOODBRIDGE_TEST_POSTGRES_URL` and **apply migrations** to a dedicated localhost database named `bloodbridge_test`; they are skipped when that variable is absent. The CI workflow defines its own synthetic PostgreSQL service.

## Read-only access check

`GET /api/v1/organizations/<organization-uuid>/access` requires a bearer token. It checks that identity with Supabase Auth and looks up active membership for that exact organization in PostgreSQL. The returned action names are **policy results only**: the synthetic request API re-checks authorization; real emergency and inventory operations are not available.

The endpoint returns 401 for missing/invalid credentials, 403 for no applicable membership, and 503 if the identity provider or database is unavailable. Responses use `Cache-Control: no-store`. Without both `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY`, the endpoint returns 503 for authenticated requests; only a publishable key should be used. Local PostgreSQL membership records and a test account are also required. No trusted onboarding or real Supabase integration test exists yet. See [MILESTONE-04.md](MILESTONE-04.md); don't commit keys or share them in chat.

## Synthetic request API

For local synthetic development only, `POST /api/v1/organizations/<uuid>/synthetic-requests` creates a minimal request and `GET /api/v1/organizations/<uuid>/synthetic-requests/<request-uuid>` reads it. Explicit opt-in, local PostgreSQL and an authorized hospital identity are required. POST requires a UUID `Idempotency-Key`; repeating the same input returns the original request. No patient details are accepted. See [MILESTONE-06.md](MILESTONE-06.md) for setup, test limitations and safety boundaries.

## Synthetic local onboarding

The CLI in [MILESTONE-05.md](MILESTONE-05.md) can create a synthetic organization, mark it verified, approve a synthetic membership, and suspend it. Each change and its audit event share a transaction. It is restricted to explicitly opted-in local PostgreSQL test/dev databases, and the operator is **not authenticated as a person**. It is a development tool, not real-world verification or production onboarding.

Apply the local migrations through `upgrade head` before using the CLI. The new migration adds a synthetic audit table. The service is not exposed as an HTTP endpoint and must not be used for real people or facilities.

## Sensitive data and Git history

The original checkout contained `Backend/bloodbridge.db` and Python bytecode tracked by Git. `.gitignore` prevents new untracked matching files from being added, but does not untrack existing files or erase previous commits. Determine whether the database contains real data before sharing it; do not publish database contents. If it does, assess exposure, rotate affected credentials and address history, forks and applicable notification obligations appropriately. Removing the current file alone does not erase the history.

## Next stages

1. Review the preliminary role model and implement trusted onboarding, authentication and endpoint authorization with auditability.
2. Implement the emergency-request vertical slice with validation, transaction-safe idempotent inventory reservations and explicit human review.
3. Integrate the frontend without simulated actions masquerading as real operations; add browser-level tests.
4. Review production migrations, lock dependencies, and address monitoring, consent, retention, security and clinical requirements before any pilot.
