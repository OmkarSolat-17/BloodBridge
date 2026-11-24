# Milestone 02 — stack decision, PostgreSQL and identity groundwork

## Status: infrastructure groundwork, not a working pilot

The legacy API remains **disabled**. No signup, login, RBAC, emergency matching, PostgreSQL application schema, migration or Supabase integration is live. Do not use real personal data or deploy this as an emergency service.

## Stack decision

| Layer | Decision | Why / limits |
|---|---|---|
| API | Keep Flask and SQLAlchemy for now | The existing backend already uses them. A framework change alone would not fix authorization, transactions or clinical safety. Refactor incrementally and introduce request validation, migrations and a clear API contract. |
| Database | **PostgreSQL** is the target; Supabase is an optional managed PostgreSQL host | Better suited to multi-user transactional work than the current SQLite prototype. Correctness still requires carefully designed transactions, constraints and concurrency tests. SQLite remains only for disposable local tests. |
| Identity | Plan Supabase Auth for authentication; application-owned role/organization authorization | A provider can handle identity workflows, but a verified identity is not permission to access donor or hospital records. Verification, onboarding and permissions must be enforced on the server. |
| Frontend | Keep existing HTML/CSS/JS temporarily; reassess React + TypeScript when API contract is settled | Avoid a large UI rewrite before the real workflow is defined. Current UI is a mixed simulation and is not ready to operate on real data. |
| Notifications | Not selected yet | Provider, consent, delivery, retries, costs and jurisdiction requirements need a decision before implementing real alerts. |

Supabase is not required to run the local test suite. The project is not connected to Supabase, and no Supabase account, schema, RLS policies, keys or hosted configuration were created. A managed provider is not automatically suitable for healthcare or compliant with a particular law: verify intended region, terms, security controls, costs, data-processing obligations, incident response, availability and backups with the pilot's operators before selecting it.

### Database connection guidance

- The backend now understands `postgres://` and `postgresql://` connection strings by selecting SQLAlchemy's `postgresql+psycopg` driver. No connection is made on app startup.
- The `init-empty-db` command is deliberately restricted to SQLite. The old schema is **not** approved for PostgreSQL or real data; real migrations and access controls come next.
- For a conventional long-running backend, evaluate Supabase's **session pooler** or direct connection. The direct connection may require IPv6; the shared session pooler supports IPv4. Transaction-pooler compatibility depends on the driver and app behavior and must be tested for the actual deployment. See [connection guidance](https://supabase.com/docs/guides/platform/ipv4-address) and [session-pooler guidance](https://supabase.com/docs/guides/getting-started/quickstarts/laravel).
- Use a dedicated minimally privileged database account, TLS with certificate verification as appropriate for the deployed driver, network restrictions and secret management. Do not put database credentials in the browser or commit them. Do not assume Supabase RLS automatically protects a privileged direct database connection: enforce server-side authorization, and design and test database grants/RLS separately.

### Identity design

`Backend/security/supabase_identity.py` contains an **unwired** adapter that calls the Supabase Auth `/auth/v1/user` endpoint with an access token and publishable key. It returns only a verified subject ID, rejects malformed or failed responses and distinguishes invalid credentials from provider unavailability. Tests mock the provider; no live Supabase call has been made. It is not a login endpoint, session system or authorization implementation.

Use the project's publishable key, never a secret/service-role key. The prefix check catches modern `sb_secret_` keys but **cannot reliably identify legacy service-role JWT keys**; operators must verify the key type themselves. Never share keys in chat or check them into Git. A verified subject does not imply hospital/admin status. Roles, organization membership, consent, ownership and revocation policy still need server-side implementation and review. If the identity service is unavailable, requests must fail closed.

Supabase's [JWT guidance](https://supabase.com/docs/guides/auth/jwts) documents server verification, including `/auth/v1/user`; its [API security guidance](https://supabase.com/docs/guides/api/securing-your-api) explains grants and RLS. Provider configuration, authenticated user status, signing-key changes, timeouts, outage behavior, logging and token lifetime must be tested against the actual project before activation.

## What changed in this milestone

- PostgreSQL driver dependency and URL normalization in `Backend/app.py`.
- Restriction preventing the legacy `init-empty-db` command from running on PostgreSQL.
- Supabase Auth identity verification adapter, **not wired to any routes**.
- Mocked identity-provider tests and optional dedicated-local-PostgreSQL smoke tests.
- CI configuration with a disposable PostgreSQL service; GitHub Actions has not yet executed this workflow.
- README and this decision record.

## Tests

Run from the repository root:

```bash
python -m pip install -r Backend/requirements.txt
python -m unittest discover -s Backend/tests -v
```

Without `BLOODBRIDGE_TEST_POSTGRES_URL`, PostgreSQL tests are skipped and the test run does not prove PostgreSQL connectivity. To run them, create a disposable **local** PostgreSQL database named `bloodbridge_test`, then set `BLOODBRIDGE_TEST_POSTGRES_URL` to its connection URL. The test intentionally refuses non-local hosts and other database names. The suite never needs the original `Backend/bloodbridge.db`.

For this milestone, all **14 test methods** passed locally, including two using PostgreSQL 17 with a synthetic database; provider tests used mocks. PostgreSQL tests cover driver connectivity, a temporary-table transaction, rollback and rejection of the legacy schema command—not application data model correctness, reservation concurrency or Supabase connectivity.

## Next milestone

Design the organization and user membership model, including who verifies hospitals/blood banks, and write versioned PostgreSQL migrations. Then implement Supabase identity integration and server-side RBAC/object ownership with denial-path tests before exposing any endpoint. After that, build the emergency-request and inventory transaction vertical slice using synthetic data, and review clinical and privacy requirements before a real-world pilot.
