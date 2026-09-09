# Production Readiness — Phase 10

Release: 0.2.1
Date: 2026-09-09
Status: READY FOR CONFIGURATION, NOT PUBLICLY DEPLOYED

## Completed
- Technical release package created and checksum verified.
- Backend authentication and user-scope controls implemented.
- Backend tests: 19 passed.
- End-to-end tests: 3 passed.
- Frontend production build: PASS.
- Python compile validation: PASS.
- No secrets included in the release package.

## Production gates
1. Set `ENVIRONMENT=production`.
2. Configure a real Supabase project and production database/authentication.
3. Provide `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_JWT_SECRET` through a secret manager/environment only.
4. Configure HTTPS and a production domain/reverse proxy.
5. Do not expose Ollama directly to the public internet.
6. Configure production AI providers and verify fallback behavior.
7. Run migrations from `db/schema.sql` against the production database.
8. Run a controlled staging smoke test before any public release.
9. Establish backups, monitoring, audit-log retention, and incident response.
10. Complete applicable privacy, medical-device, clinical-safety, and regulatory review before real-world clinical use.

## Current boundary
This phase prepares the software for production configuration. It does not publish the application, create cloud accounts, enter credentials, or claim clinical/regulatory authorization.

## Recommended deployment shape
Internet -> HTTPS reverse proxy -> Next.js frontend / FastAPI API -> managed database + authenticated AI providers.
Local Ollama remains an optional private fallback and must not be publicly exposed.
