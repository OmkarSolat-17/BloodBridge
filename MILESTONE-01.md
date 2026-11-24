# Milestone 01 — fail-closed backend foundation

## Goal

Prepare the existing application for a staged rebuild towards an emergency-matching pilot without exposing the unsafe legacy endpoints. This milestone deliberately sacrifices the existing frontend/backend functionality until it can be restored safely, one workflow at a time.

## Changes

- `Backend/app.py`: application factory; unique secret required; configurable database; no automatic schema changes; development server debug disabled; permissive CORS removed. A mandatory guard returns 503 on all registered non-health endpoints, including legacy aliases.
- Explicit `flask --app app:create_app init-empty-db` command for an empty synthetic development database. It is not a migration tool.
- `Backend/tests/test_foundation.py`: isolated unittest suite covering startup, configuration, all currently registered route rules/methods, liveness and schema-init refusal on a populated schema.
- `Frontend/auth.js`: removed one console log that printed a login password and the adjacent log of the token-bearing login response. Other frontend logging and browser-side auth still require review; no claim that all sensitive logging has been removed.
- `.gitignore`: excludes local databases, bytecode, environments and secrets. Does not untrack files already committed.
- `.github/workflows/backend-foundation.yml`: proposed CI for these foundation tests and JS syntax; it has not yet run on GitHub.
- Root README: local setup and explicit safety warning.

## Verified locally

- Seven unittest methods passed with Python 3.13 and the currently resolved, unpinned dependencies. The route-gate test exercises every registered non-health route and supported HTTP method, including aliases.
- `node --check Frontend/auth.js` passed. This only checks syntax.
- Tests use temporary databases and synthetic configuration; no test uses the original checked-in database.

## Known limitations / do not deploy

- The legacy frontend, authentication, emergency requests, matching, inventory, alerts and appointments are **not operational through the guarded API**. No real end-to-end workflow is completed.
- The legacy code still contains known defects and unsafe assumptions; the gate is a temporary containment measure, not a complete security program.
- The original database may contain personal data. Check and handle it before sharing, untracking, deleting, or rewriting Git history. No old history has been erased.
- Secret length validation does not prove randomness or correct secret management. No clinical validation, real-user consent flow, external security audit, privacy assessment, migration system or production deployment has been completed.
- The backend dependencies are not locked; CI is proposed but not yet verified on GitHub.

## Next milestone

Define user roles and the trust/verification process for hospitals and blood banks. Implement and test server-side identity, account onboarding and per-object authorization before selectively replacing the legacy emergency endpoints. Choose consent, notification and clinical boundaries with relevant stakeholders; do not infer them from the current prototype.
