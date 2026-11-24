# Milestone 06 — synthetic emergency-request slice

## Important safety boundary

This is a **local-only synthetic development workflow**, not an emergency service. Never enter real patient or donor information or rely on it for medical decisions. No matching, blood-bank reservations, donor alerts, scheduling, cancellation, clinical eligibility assessment, crossmatching or notification delivery is implemented. The frontend is not connected. The existing legacy APIs remain blocked.

The route requires an explicit opt-in, a PostgreSQL URL whose host is `localhost`, `127.0.0.1` or `::1` and whose database is named `bloodbridge_dev` or `bloodbridge_test`. The local-name check is a guardrail, not protection from malicious local operators, tunnels or misconfiguration. It must not be bypassed to deploy to Supabase or another remote database.

## What this adds

- `0003_synthetic_requests`: versioned PostgreSQL tables for synthetic requests and creation audit records. No patient name, phone, location, notes or other free text is stored.
- `POST /api/v1/organizations/<organization-id>/synthetic-requests`: creates a request with `blood_type`, `units_required` and `urgency`; rejects additional fields. Unit range 1–10 is an **arbitrary test constraint**, not a clinical rule.
- `GET /api/v1/organizations/<organization-id>/synthetic-requests/<request-id>`: reads a request only from the authorized hospital organization.
- Both calls require an Auth-verified subject with an active hospital-operator membership for the exact verified organization. Each operation checks and locks the relevant membership rows during its database transaction.
- POST requires a UUID `Idempotency-Key`. Same key + same input for the same subject and organization returns the original request without another audit event; same key with different input returns 409. The scoped unique constraint and transactional write protect retries; no inventory or external notifications are involved.
- Audit insertion and creation share a transaction. A trigger rejects ordinary audit UPDATE/DELETE, but privileged users can bypass it; this is not an immutable, production-grade audit trail. Responses are not cached.

## Local setup

Apply Milestones 1–5 first. Follow [MILESTONE-05.md](MILESTONE-05.md) to create a disposable **local** PostgreSQL database and synthetic hospital/membership, then apply migrations through `upgrade head` again for this milestone:

```bash
python -m pip install -r Backend/requirements.txt
# BLOODBRIDGE_MIGRATION_DATABASE_URL must point to the disposable local database.
python -m alembic -c Backend/alembic.ini upgrade head
```

For the API process, set `BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS=1`, `BLOODBRIDGE_DATABASE_URL` to the same local database, and the provider configuration described in [MILESTONE-04.md](MILESTONE-04.md). Do not share or commit keys/URLs. A **verified synthetic test identity** and matching local membership are needed; the Milestone 5 CLI does not create a Supabase Auth user. No live Supabase integration has been verified. Without the flag, a valid local database and provider, requests fail closed.

Example request format (substitute a synthetic organization UUID and a valid synthetic user's token through your own local tooling; do not post tokens in chat):

```http
POST /api/v1/organizations/<organization-uuid>/synthetic-requests
Authorization: Bearer <synthetic-user-access-token>
Idempotency-Key: <new-uuid-for-this-operation>
Content-Type: application/json

{"blood_type":"O-","units_required":2,"urgency":"urgent"}
```

Typical statuses: 201 created; 200 identical retry; 400 invalid fields/key; 401 invalid/missing token; 403 no active organization membership; 404 request not found; 409 retry key reused with different input; 503 disabled or dependency unavailable. Requests larger than 4096 bytes are rejected by Flask's configured body limit. The artificial urgency values and blood types do not confer medical suitability or clinical urgency.

## Verification

- **51 tests passed locally**, including real local PostgreSQL queries and mocked Auth verification. Endpoint tests use an isolated rollback transaction and do not contact Supabase.
- A separate manual PostgreSQL test launched two concurrent calls with the same key: one created the row, the other reused it, and exactly one request and one creation-audit record resulted. The disposable database was removed afterward. This single experiment is not a complete concurrency or load test.
- Optional PostgreSQL integration tests apply migrations to a dedicated local `bloodbridge_test` database; test rows use transactions. The test suite skips PostgreSQL-dependent tests without `BLOODBRIDGE_TEST_POSTGRES_URL`. CI and live Supabase integration were not run here.

## Before any real-world pilot

Trusted administrator onboarding, clinical review of data and workflows, real-patient privacy/consent, audit integrity, role grants, remote database migrations, robust concurrency/load tests, abuse controls, observability and availability remain unimplemented. Build transactional, idempotent stock reservation separately and consult relevant clinical experts before considering real use.
