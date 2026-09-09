# Projeto Seringa AI — Release Security Checklist

## Fase 5 — identidade e autorização
- Production API endpoints require `Authorization: Bearer <JWT>`.
- JWT subject (`sub`) is the only accepted user identity for user-scoped endpoints.
- Cross-user access is rejected with HTTP 403.
- JWT secret is supplied only through `SUPABASE_JWT_SECRET`; never committed.
- Local development keeps the existing unauthenticated demo flow.

## Fase 6 — produção
- Security headers are enabled by middleware.
- CORS is restricted to `FRONTEND_ORIGINS`.
- Image type and 8 MB size limits remain enforced.
- Chat input is limited to 4000 characters.
- Verification history is capped at 50 records.
- Health endpoint remains intentionally public for service monitoring.
- No image is persisted by verification audit records.

## Fase 7 — validation
- Backend tests cover API hardening, safety, verification history and authentication.
- Frontend production build must pass before release.
- Playwright E2E must pass against a running backend/frontend pair.
- A passing HTTP response alone is not considered proof of physical execution.

## Fase 8 — release gate
1. Configure production Supabase and JWT secret outside source control.
2. Configure a production frontend origin.
3. Run backend tests and frontend build.
4. Run Playwright E2E.
5. Verify `/health` and authenticated user-scoped endpoints.
6. Confirm AI providers are configured with safe fallback behavior.
7. Confirm no credentials are present in repository files.
8. Release only when every gate is PASS.

The system remains decision-support software. It does not prescribe, change dose,
teach injection technique, or authorize physical administration.
