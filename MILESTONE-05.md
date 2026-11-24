# Milestone 05 — synthetic local onboarding

## Status and safety boundary

This milestone adds a **local-only development CLI**, not a production administrator interface. It creates or approves synthetic organizations and memberships so the organization access policy can be exercised end to end on a local PostgreSQL database.

**Never use it for real people or facilities.** There is no authenticated administrator, verified provider identity, institutional review, consent process or hosted onboarding. The audit actor is the fixed label `synthetic_local_operator`—it does not identify a real person. The local-host/name guard and opt-in are development safeguards, not a security boundary against a malicious machine administrator or a tunnel to a remote service. The emergency/inventory APIs remain disabled. No real pilot should be run using this milestone.

## What's included

- Migration `0002_synthetic_onboarding_audit` adds a synthetic audit table in `bloodbridge_private`.
- A local CLI and transactional service support:
  1. Creating a **pending** synthetic hospital or blood bank.
  2. Marking that synthetic organization as verified.
  3. Approving a synthetic identity and organization membership with the matching role.
  4. Suspending that membership, which removes its access in the policy check.
- Retrying identical operations is a no-op; conflicting organization details, a mismatched role, or attempting to reactivate a suspended identity/membership is rejected.
- State changes and audit inserts run in the same transaction. The audit table has an update/delete rejection trigger for defense in depth; it is **not immutable** against table owners, superusers, trigger disabling, TRUNCATE or privileged schema changes. It is not a complete security audit system.
- No onboarding endpoint was exposed, and no legacy API guard was removed.

## Run on a disposable local database

1. Complete Milestones 1–4. Install dependencies using `python -m pip install -r Backend/requirements.txt`.
2. Prepare a disposable local PostgreSQL database named `bloodbridge_dev` or `bloodbridge_test`. Set `BLOODBRIDGE_MIGRATION_DATABASE_URL` in your shell to its connection URL and apply the new migration from the repository root:

   ```bash
   python -m alembic -c Backend/alembic.ini upgrade head
   ```

   Migration credentials and the runtime account should be separate in any future architecture. Do not share or commit URLs/passwords. The migration guard rejects remote hosts; do not bypass it for a hosted database.

3. Set `BLOODBRIDGE_SYNTHETIC_LOCAL_ONLY=1` and `BLOODBRIDGE_ONBOARDING_DATABASE_URL` to your **disposable local** database URL. The CLI requires both settings; it will not accept a remote host or any other database name. Use **synthetic** UUIDs and names. For example, from the repository root:

   ```bash
   python Backend/scripts/synthetic_onboarding.py create-organization --organization 00000000-0000-4000-8000-000000000001 --name "Synthetic Hospital" --kind hospital
   python Backend/scripts/synthetic_onboarding.py verify-organization --organization 00000000-0000-4000-8000-000000000001
   python Backend/scripts/synthetic_onboarding.py approve-membership --organization 00000000-0000-4000-8000-000000000001 --subject 00000000-0000-4000-8000-000000000002 --role hospital_operator
   python Backend/scripts/synthetic_onboarding.py suspend-membership --organization 00000000-0000-4000-8000-000000000001 --subject 00000000-0000-4000-8000-000000000002
   ```

For a blood-bank example, use `--kind blood_bank` with `--role blood_bank_operator`. Identical successful retries return `changed: false`. These commands **do not** create or verify a Supabase Auth user. Approval of a UUID is not proof that a real user or institution is legitimate.

## Tests

From the repository root:

```bash
python -m unittest discover -s Backend/tests -v
```

Tests use mocks unless `BLOODBRIDGE_TEST_POSTGRES_URL` names a dedicated local `bloodbridge_test` PostgreSQL database. If supplied, they apply migrations to that disposable database and roll back per-test synthetic rows; they refuse remote or differently named databases. The migration itself remains. The full **42-test** suite passed locally with PostgreSQL 17. I also ran the CLI create → verify → approve → retry → suspend sequence against a separate disposable local database and removed that database afterward. GitHub CI and a real Supabase connection were not tested.

## Remaining work before real onboarding

- Design and implement verified platform administrators, institutional approval and membership invitations/revocation; enforce authorization server-side.
- Implement attributable, tamper-resistant audit logging with least-privilege roles, independent retention and review; the synthetic table alone is inadequate.
- Establish user identity verification, consent and protection against self-assigned privileged roles.
- Review production migrations, data access, threat model, privacy, legal obligations and clinical workflows before connecting real organizations.
- Build and test the emergency-request vertical slice using synthetic data, including transactional idempotent inventory changes and explicit human verification.
