# FleetPass — Deep Dive Technical & Security Review

Date: 2025-12-18  
Reviewer lens: Staff-level full-stack (Node/TS/React/Postgres/DevOps)

## Scope & Method

This review is based on a static inspection of the repository (no production access). I looked at:

- Backend (NestJS + Prisma + Postgres + Redis): module structure, auth/authz, error handling, logging, rate limiting, health checks.
- Frontend (Next.js App Router + React Query): auth flow, API client, hooks, page usage patterns.
- Database schema + migrations (Prisma): tenancy model, constraints, indexes, migration hygiene.
- DevOps: Dockerfiles/Compose, GitHub Actions, operational scripts.
- Security: common web/API risks (auth, authz, CSRF/CORS, secrets, logging, injection).

Note: I did **not** run `npm audit` / SCA because network access is restricted in this environment. I call out how to add automated dependency scanning in CI.

---

## 1) Architecture Overview (as implemented)

**Backend (`backend/`)**
- NestJS API with global prefix `api/v1` (`backend/src/main.ts`).
- Prisma ORM against Postgres (`backend/prisma/schema.prisma`).
- Redis via `ioredis` for caching user data (`backend/src/redis/redis.service.ts`).
- Auth is JWT stored in an HttpOnly cookie `auth_token` (`backend/src/auth/auth.controller.ts`).
- Global rate limiting via `@nestjs/throttler` (`backend/src/app.module.ts`).
- Global response wrapper interceptor (`backend/src/common/interceptors/response.interceptor.ts`).

**Frontend (`frontend/`)**
- Next.js 14 App Router with client components for auth pages and dealer pages.
- Axios client with `withCredentials: true` for cookie-based auth (`frontend/lib/api-client.ts`).
- React Query hooks for API resources (`frontend/lib/hooks/api/*`).

**Shared types (`shared/types/`)**
- A local package-ish folder with TypeScript types referenced via TS path mapping (`@shared/types`).

---

## 2) What’s Strong

- Good baseline API hardening: `helmet`, centralized logging, throttling, request validation via `ValidationPipe`.
- Clear intent toward standard response/error formats (response interceptor + exception filters).
- Prisma schema includes thoughtful indexing for key access patterns (availability checks, dashboards).
- Production Dockerfiles attempt least-privilege (non-root users) and multi-stage builds.
- Documentation coverage is unusually thorough (deployment/security checklists), which is a great foundation.

---

## 3) Critical Findings (Stability / Correctness)

### P0 — Frontend↔Backend contract drift (app likely broken end-to-end)

There is significant mismatch between what the frontend sends/expects and what the backend implements:

- Frontend signup expects `{ fullName, phone, role }` and posts that shape (`frontend/app/auth/signup/page.tsx`, `frontend/lib/hooks/api/use-auth.ts`), but backend expects `{ firstName, lastName, organizationName }` (`backend/src/auth/dto/signup.dto.ts`).
- Frontend `useMe()` expects a `User` object directly (`frontend/lib/hooks/api/use-auth.ts`), but backend returns `{ user, organization }` (`backend/src/auth/auth.service.ts` + controller + response wrapper).
- Several resource hooks (vehicles, availability, etc.) do not match backend endpoints or data shapes (`frontend/lib/hooks/api/use-vehicles.ts` vs `backend/src/vehicle/*`).

**Impact**
- Signup/login/me flows will not work reliably.
- Downstream pages/components are likely failing due to mismatched response shapes.

**Fix direction**
- Decide on a single source of truth for API contracts: OpenAPI + codegen, or shared `@shared/types` used consistently, or both.
- Add contract tests (or at least typed integration tests) to prevent drift.

---

### P0 — Multi-tenancy / authorization is inconsistent and unsafe

The schema includes `Organization` and `organizationId` for some entities (e.g., `Location`, `User`, `Payment`), but other core entities lack organization ownership (`Customer`, `Booking`, `Lead`, `Deal`).

Controllers/services for several modules do not scope queries/mutations to the authenticated user’s organization:

- `CustomerController/Service` have no org scoping at all (`backend/src/customer/*`).
- `BookingController/Service` have no org scoping at all (`backend/src/booking/*`).
- `LeadController/Service` have no org scoping at all (`backend/src/lead/*`).
- `DealController/Service` should be checked similarly (pattern suggests same risk).

**Impact**
- In a true multi-tenant deployment, any authenticated user can potentially access/modify data across organizations.
- Even in “single-tenant per deployment” mode, the current design makes it easy to accidentally move toward multi-tenant without the required controls.

**Fix direction**
- First clarify the product decision:
  - **Option A: Single-tenant per deployment** → simplify schema and remove organization-level complexity (or enforce it consistently but expect only one org).
  - **Option B: Multi-tenant per deployment** → add `organizationId` to every tenant-owned table and enforce it at *every* query boundary (preferably centrally, not by hand everywhere).
- For Option B, consider database-level enforcement (Postgres Row Level Security) or Prisma middleware patterns to reduce human error.

---

### P0 — Prisma migrations hygiene issue (may break deploys)

`backend/prisma/migrations/20251218005557_add_payment_model/` exists but is empty (no `migration.sql`). Prisma migration deploys can fail when migration history contains invalid entries.

There is also a duplicate-looking `add_payment_model` migration at a later timestamp, and one migration directory has unusually restrictive permissions (`drwx------`), which can cause CI/container issues.

**Impact**
- `prisma migrate deploy` can fail in CI/prod.
- Developers can end up with diverging DB states.

**Fix direction**
- Normalize migration history: remove/repair empty migration folder, ensure each migration is valid and ordered, fix permissions.
- Add a CI check that validates migrations can deploy against an empty DB.

---

## 4) Security Review (Vulnerabilities & Hardening Opportunities)

### 4.1 Authentication (mostly solid, but some correctness gaps)

- Cookie-based JWT is a good default for XSS protection (`httpOnly: true`).
- **Token expiry vs cookie lifetime mismatch**: JWT expiry defaults to `15m` (`backend/src/auth/auth.module.ts`) while cookie is set for `7 days` (`backend/src/auth/auth.controller.ts`). Users will keep a cookie containing an expired token → confusing UX and “random logout” behavior.
- **Docs mismatch**: several docs mention different password requirements and JWT lifetimes than the code.

**Recommendations**
- Align JWT expiry and cookie maxAge (or implement refresh tokens / rotation).
- Standardize auth config in one place and generate docs from code (or at least validate docs in CI).

### 4.2 Authorization (highest risk area)

- As noted above, several modules are missing org scoping and RBAC enforcement.
- RBAC is modeled as a string (`User.role`) with no centralized authorization guard/policy enforcement.

**Recommendations**
- Make auth guard global by default (deny-by-default) and use a `@Public()` decorator for unauthenticated routes.
- Add role-based guards/policies (e.g., `admin`, `manager`, etc.) and enforce ownership checks for all resources.

### 4.3 CSRF / CORS

- CORS is locked to an allowlist and `credentials: true` is enabled (`backend/src/main.ts`), consistent with cookie auth.
- `SameSite: 'lax'` is reasonable **only** if frontend+backend are same-site (eTLD+1, e.g., `app.example.com` + `api.example.com`). If you ever host on different sites, you’ll need `SameSite=None; Secure` and likely CSRF protection.

**Recommendations**
- Clarify deployment topology (same-site vs cross-site).
- If cross-site is possible, implement CSRF tokens for state-changing requests.

### 4.4 Sensitive data exposure

- Logging interceptor avoids headers/cookies and looks safe (`backend/src/common/interceptors/logging.interceptor.ts`).
- However, some services log entire DTOs on error; make sure DTOs never include secrets/PII beyond what you’re comfortable persisting in logs.

**Recommendations**
- Add a redaction layer for common PII fields (email/phone/license numbers) in logs, or log identifiers only.

### 4.5 Injection / unsafe execution

- Prisma is used throughout; I did not find use of `queryRawUnsafe` / `executeRawUnsafe`.
- No obvious `eval`/`dangerouslySetInnerHTML` usage detected in the repo.

### 4.6 Dependency risk management (gap in automation)

Because this is Node/React, a large portion of real-world vulnerabilities come from dependencies. Right now:

- CI does not run any `npm audit`-like scanning.
- No Dependabot config detected.

**Recommendations**
- Enable Dependabot (npm) for both `backend/` and `frontend/`.
- Add CI job to run SCA (GitHub Advanced Security / `npm audit` / Snyk).
- Pin Node versions consistently (local, CI, Docker) and document it.

---

## 5) Postgres / Data Model Review

### Tenancy consistency

If multi-tenant is the intended end state, the schema needs `organizationId` on:

- `Customer`, `Booking`, `Lead`, `Deal` (and any future tenant-owned entity).

Additionally:

- Unique constraints should likely be composite per tenant (e.g., customer email unique per org), not global.

### Referential integrity

Some relationships are intentionally “not enforced at DB level” (e.g., pickup/dropoff location IDs on `Booking`), which makes it easier to produce invalid data.

**Recommendation**
- Prefer DB-level foreign keys for correctness unless there’s a strong reason not to.

### Booking number generation

`generateBookingNumber()` relies on “latest record then +1” logic (`backend/src/booking/booking.service.ts`), which can race under concurrent booking creation.

**Recommendation**
- Use a DB sequence (or a dedicated counter table updated transactionally) for monotonic unique numbers.

---

## 6) DevOps / CI/CD Review

### Docker / health checks (currently inconsistent)

- Backend health endpoint is mounted at `/api/v1/health` due to the global prefix (`backend/src/main.ts`), but:
  - `backend/Dockerfile.prod` healthcheck hits `/health`.
  - `docker-compose.prod.yml` healthcheck hits `/health`.
  - `scripts/restore-database.sh` waits on `/health`.
- Frontend Dockerfile healthcheck hits `/api/health`, but there is no Next API route implemented at `frontend/app/api/health/*`.

**Impact**
- Production containers will appear unhealthy and may be restarted or never receive traffic.

**Fix direction**
- Standardize health endpoints and update Dockerfiles/Compose/scripts accordingly.
- Add a simple Next health route or change healthcheck to `/` if acceptable.

### CI signal quality

In `.github/workflows/ci.yml`:

- Backend lint runs `eslint --fix` and then `|| echo "Linting complete"` which can mask failures and/or mutate the workspace in CI.
- Backend tests are commented out.
- Frontend tests aren’t run either (only lint/typecheck/build).

**Fix direction**
- CI should be “read-only” and fail loudly:
  - `lint` should not auto-fix; run `eslint` without `--fix`.
  - enable unit tests at minimum.
  - add integration tests using the Postgres service already configured.

---

## 7) Recommended Execution Plan (Ordered)

This is sequenced to stabilize the system first, then harden security, then improve developer velocity.

### Phase 0 — “Make it run” (P0 stabilization)

1. **Fix API contract drift**
   - Choose canonical request/response shapes for auth + core resources.
   - Update frontend to match backend (or vice versa), using shared types or OpenAPI codegen.
2. **Fix health checks**
   - Backend: make health endpoint consistent with Docker healthchecks (either remove global prefix for health or update all healthcheck callers to `/api/v1/health`).
   - Frontend: add `frontend/app/api/health/route.ts` or update Docker healthcheck path.
3. **Repair Prisma migrations**
   - Remove/repair the empty migration directory and normalize migration permissions.
   - Add CI job verifying `prisma migrate deploy` works against a fresh DB.

### Phase 1 — Security + data isolation (P0/P1)

4. **Clarify tenancy model**
   - Decide single-tenant-per-deploy vs multi-tenant-per-deploy.
5. **Enforce authorization centrally**
   - Make JWT auth guard global (deny by default), use `@Public()` for exceptions.
   - Add organization scoping guard/middleware so it’s hard to forget.
   - Implement RBAC guard(s) for admin-only operations.
6. **Align JWT and cookie lifetimes**
   - Either extend JWT to match cookie, or implement refresh flow.
7. **Add CSRF strategy (if cross-site cookies are required)**
   - If not cross-site, document “same-site required” and enforce via config.

### Phase 2 — CI/CD and engineering velocity (P1/P2)

8. **Improve CI**
   - Stop masking lint failures; remove `--fix` from CI lint.
   - Enable backend unit tests and frontend vitest.
   - Add minimal smoke tests for auth endpoints.
9. **Dependency scanning automation**
   - Dependabot for both package-locks.
   - SCA step (GitHub security scanning or `npm audit`) + license policy if needed.
10. **Config validation**
   - Add typed env validation (zod/joi) in backend and frontend build-time checks.

### Phase 3 — Product-scale readiness (P2+)

11. **DB correctness upgrades**
   - Add foreign keys where feasible; introduce enums for statuses/roles.
   - Fix booking number generation to be concurrency-safe.
12. **Observability**
   - Request IDs across frontend/back; structured logs with correlation.
   - Metrics (latency, error rates), tracing, alerting.

---

## 8) Suggested “First PRs” (Concrete and low-risk)

If you want the smallest set of changes to start building momentum:

1. Fix healthcheck paths everywhere (Dockerfiles, docker-compose.prod.yml, scripts) and add Next health route.
2. Remove the empty Prisma migration directory + normalize permissions.
3. Make CI lint fail properly (no `--fix`, no `|| echo`), and enable at least backend unit tests.
4. Update frontend signup + `useMe()` to match backend’s current DTO + response format.

---

## Appendix: Quick Reference of High-Risk Areas

- **AuthZ/tenancy holes**: `backend/src/customer/*`, `backend/src/booking/*`, `backend/src/lead/*`, likely `backend/src/deal/*`.
- **Contract drift**: `frontend/lib/hooks/api/*` and auth pages vs `backend/src/auth/*`.
- **Healthcheck mismatch**: `backend/Dockerfile.prod`, `docker-compose.prod.yml`, `scripts/restore-database.sh`, frontend Docker healthcheck.
- **Prisma migrations**: empty folder under `backend/prisma/migrations/`.

