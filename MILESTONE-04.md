# Milestone 04 — authenticated organization access check

## Scope and status

This milestone connects the Supabase identity adapter and PostgreSQL authorization policy to **one read-only endpoint**. It does not implement registration, login UI, trusted hospital/blood-bank onboarding, real emergency requests, inventory operations, donor access, or notifications. All legacy endpoints remain blocked. The frontend is not connected to this endpoint.

**Not ready for a real-world pilot.** No real Supabase project, real personal data, clinical validation, deployment, browser E2E or external security review was used. Provider responses were mocked; PostgreSQL tests used a local synthetic database.

## Endpoint

```text
GET /api/v1/organizations/<organization-uuid>/access
Authorization: Bearer <user-access-token>
```

The server calls the configured Supabase Auth `/auth/v1/user` verification endpoint. A verified subject is looked up in the private PostgreSQL schema; an active identity, verified organization and active membership with a matching role are required. Unknown organizations and absent/inactive memberships receive the same response.

| Status | Meaning |
|---|---|
| 200 | A policy action matched this organization and current membership. |
| 401 | Missing or invalid bearer credentials. |
| 403 | No applicable active membership, including an unknown organization. |
| 503 | Provider/database is unconfigured or unavailable. SQLite is not accepted for this endpoint. |

Responses under this path include `Cache-Control: no-store`. No permissive CORS is configured. The response includes the organization UUID and names such as `hospital.request.create`, **not** working emergency or inventory operations. Treat it as a snapshot for display only; every future operation must independently re-check authorization in its own transaction and respect revocation. It is not a clinical decision.

## Configuration

For a future synthetic integration only, configure both `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` on the server, plus a PostgreSQL `BLOODBRIDGE_DATABASE_URL` and the temporary legacy `BLOODBRIDGE_JWT_SECRET`. The two Supabase settings are optional as a pair; an incomplete pair prevents startup. Never commit or share secrets or a database URL. Use a **publishable** key, not a secret/service-role key; the modern `sb_secret_` prefix is rejected, but legacy JWT service-role keys cannot be reliably detected by that check.

The database must contain reviewed synthetic identity and membership rows. A safe onboarding/seed process is not yet provided. The migration environment remains **local-only** and will reject a remote Supabase URL. Do not bypass that guard to run against a hosted or real-world database.

## Changes

- New `Backend/routes/access.py` verifies identity and checks an exact organization, with uniform denial and generic errors.
- `Backend/app.py` configures the provider and opens only the new read-only route; the safety gate still blocks legacy routes and unsupported methods.
- `Backend/security/authorization.py` derives policy actions from one membership query; database failures do not grant access.
- The provider avoids a globally shared mutable Requests session for normal calls.
- API tests cover authentication, provider and database failures, scoped access, revocation, unknown organizations, caching and legacy-route containment.

## Verification and limitations

The full suite passed **35 tests locally**, including PostgreSQL 17 integration using synthetic data. The API integration test uses a mocked verified identity, not a live Supabase Auth call. The frontend JavaScript passed syntax checks; it was not tested in a browser. PostgreSQL integration tests require `BLOODBRIDGE_TEST_POSTGRES_URL` pointing to dedicated local `bloodbridge_test`; otherwise they are skipped. The GitHub workflow has not been run in this workspace.

Missing before any pilot includes trusted organization verification and member invitations, audit logs, endpoint rate limiting, provider outage/revocation policy, secret and database-role management, production migrations/backups, consent/privacy and clinical review, monitoring, concurrent transactional workflow tests and an external security assessment. The current endpoint should not be publicly deployed as a healthcare service.

## Next

Implement trusted, auditable organization onboarding and membership approval using a reviewed privilege model, then build the synthetic emergency-request flow with server-enforced authorization and idempotent inventory handling. Continue keeping unrelated legacy endpoints disabled.
