# Milestone 07 — synthetic inventory and reservation

## Safety boundary

**Local, synthetic development only. Not a healthcare service.** Do not enter real patient, donor, facility or blood-inventory data. There is no clinical matching or crossmatch, notification, expiry, cancellation, release, split reservation, reconciliation or production operations. Exact blood-type matching is a simplifying software rule, **not** a determination that a transfusion is safe.

The new routes use the existing explicit synthetic opt-in (`BLOODBRIDGE_ENABLE_SYNTHETIC_REQUESTS=1`) and only accept local PostgreSQL databases named `bloodbridge_test` or `bloodbridge_dev`. The local-host check is a development safeguard, not protection against machine administrators, tunnels or misconfiguration. Legacy routes remain blocked. The frontend is not yet connected.

## Synthetic workflow

All endpoints require the caller's verified test identity and active membership for the URL's organization. Auth-provider verification was **mocked** in tests; no live Supabase integration was tested.

1. A hospital creates a synthetic request using the Milestone 6 API.
2. A blood-bank operator records an inventory receipt:
   - `POST /api/v1/organizations/<bank-uuid>/synthetic-inventory/receipts`
   - Header: `Idempotency-Key: <new-uuid>`
   - JSON: `{"blood_type":"O-","units":3}`
   - Same actor/bank/key and input is a no-op retry; a reused key with different data returns 409. The 1–100 unit range is an arbitrary test constraint.
3. The hospital explicitly grants a verified synthetic bank access to its request:
   - `POST /api/v1/organizations/<hospital-uuid>/synthetic-requests/<request-uuid>/bank-grants`
   - JSON: `{"bank_id":"<bank-uuid>"}`
   - Identical retry is a no-op. Only the hospital holding the request may issue the grant. A grant is a synthetic data handoff, not patient consent or clinical approval. There is currently **no grant-revocation API**.
4. A bank operator makes a full reservation:
   - `POST /api/v1/organizations/<bank-uuid>/synthetic-reservations`
   - JSON: `{"request_id":"<request-uuid>"}`
   - A matching active bank membership, verified bank and explicit grant are required. Request row locking, a conditional inventory decrement and a uniqueness constraint limit a request to one reservation. Retrying the same request at the same bank returns the existing reservation. Insufficient exact-type stock or reservation at another bank returns 409.
5. A bank operator can inspect their synthetic stock:
   - `GET /api/v1/organizations/<bank-uuid>/synthetic-inventory?blood_type=O%2B` (URL-encode `+`).

Receipt, grant and reservation changes record audit events in the same database transaction. The audit includes actor/organization IDs, event and (where applicable) request ID; it is not a complete audit ledger. An update/delete trigger is only defense in depth and can be bypassed by privileged database operators.

## Setup

Apply previous milestones and use only a dedicated disposable local PostgreSQL database. Install dependencies and apply migration `0004_synthetic_inventory`:

```bash
python -m pip install -r Backend/requirements.txt
# Set BLOODBRIDGE_MIGRATION_DATABASE_URL to your disposable local database.
python -m alembic -c Backend/alembic.ini upgrade head
```

Follow [MILESTONE-05.md](MILESTONE-05.md) for synthetic organization/membership setup and [MILESTONE-06.md](MILESTONE-06.md) for enabling the local API and creating a request. The CLI does not create Supabase users. To use actual HTTP authentication, a **synthetic** identity supported by the configured provider is also needed; that live provider flow has not been tested here. Never share keys or tokens in chat or commit credentials. Do not use a hosted/production URL with these migrations.

## Testing and remaining work

- **58 tests passed locally**, including API tests with a local PostgreSQL database and mocked Auth verification. Test rows are rolled back; migration schema remains in the dedicated test database.
- One separate manual test used two simultaneous transactions to reserve the last two units for two different requests: one succeeded, one failed, stock remained nonnegative and one reservation audit event was written. The disposable database was removed. This is useful evidence, **not** exhaustive concurrency, failure, load or production testing.
- Matching, alternate-type compatibility, stock expiry/batches, release and cancellation, transactional retry policy, trusted onboarding, consent, alerts, accessibility, real Supabase integration, backups, security and clinical review remain unimplemented. Do not assume a reservation can safely be used in a real emergency.
