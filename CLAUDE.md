# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetPass is a multi-tenant vehicle rental platform for car dealerships, built with a modern TypeScript stack. The architecture consists of a NestJS backend API with PostgreSQL/Redis, and a Next.js 14 frontend using the App Router.

## Development Commands

### Full Stack (Docker Compose - Recommended)
```bash
# Start all services (postgres, redis, backend, frontend)
docker compose up

# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f [service-name]

# Stop all services
docker compose down
```

### Backend (Manual)
```bash
cd backend

# Development
npm run start:dev          # Start with hot reload

# Database
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Create & apply migration
npx prisma migrate deploy  # Apply migrations (production)
npx prisma studio          # Open Prisma Studio GUI

# Testing
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch        # Watch mode
npm run test:cov          # With coverage

# Linting & Type Checking
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix issues
npm run lint:ci           # CI-specific linting

# Build
npm run build             # Build for production
npm run start:prod        # Run production build
```

### Frontend (Manual)
```bash
cd frontend

# Development
npm run dev               # Start dev server

# Testing
npm run test              # Run Vitest tests
npm run test:ui           # Vitest UI
npm run test:coverage     # With coverage

# Build
npm run build             # Production build
npm run start             # Start production server
npm run lint              # ESLint
```

### E2E Tests
```bash
cd e2e-tests

npm test                  # Run all Playwright tests (headless)
npm run test:headed       # Run with visible browser
npm run test:debug        # Debug mode
npx playwright test [file] # Run specific test
```

## Architecture Overview

### Backend Architecture (NestJS)

**Core Modules:**
- `auth/` - JWT authentication with refresh tokens (cookie-based)
- `vehicle/` - Vehicle CRUD with image upload support
- `customer/` - Customer management with KYC integration
- `booking/` - Booking system with date validation
- `payment/` - Mock Stripe payment integration
- `kyc/` - Mock Persona KYC verification
- `lead/` - Lead tracking and management
- `deal/` - Sales pipeline and deal tracking
- `location/` - Dealership location management

**Common Infrastructure:**
- `common/interceptors/` - Global response standardization, idempotency, logging
- `common/filters/` - Exception handling (HTTP, throttler)
- `common/guards/` - JWT authentication guard
- `common/logger/` - Pino-based structured logging
- `common/decorators/` - Custom decorators (CurrentUser, NonIdempotent)
- `prisma/` - Database service wrapper
- `redis/` - Redis caching service

**Key Patterns:**
- **Standardized API Responses**: All responses wrapped via `ResponseInterceptor` with `{success, data, timestamp, meta?}` format
- **Idempotency**: Automatic idempotency for mutations via `IdempotencyInterceptor` using Redis (24h TTL). Endpoints can opt-out with `@NonIdempotent()` decorator
- **Authentication**: Cookie-based refresh tokens + short-lived JWT access tokens (15min). Automatic cleanup job for expired tokens
- **Rate Limiting**: Global (100 req/min) + auth endpoints (5 req/15min) via `@nestjs/throttler`
- **Security Headers**: Helmet middleware configured in `main.ts`
- **Validation**: Global `ValidationPipe` with `class-validator` and `class-transformer`

**Database (Prisma):**
- Multi-tenant via `organizationId` on all models
- Cascade deletes configured for organization cleanup
- Composite indexes for performance (e.g., vehicle availability queries)
- Refresh tokens stored with expiry tracking
- Image URLs stored as `String[]` on Vehicle model

### Frontend Architecture (Next.js 14)

**Directory Structure:**
- `app/` - Next.js App Router pages
  - `(dealer)/` - Protected dealer dashboard (route group)
  - `(customer)/` - Customer-facing pages
  - `(public)/` - Public landing pages
  - `auth/` - Login/signup pages
- `components/` - Reusable React components
- `lib/` - Utilities and API client
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions

**Key Patterns:**
- **API Communication**: Centralized `api-client.ts` using Axios with automatic token refresh on 401
- **State Management**: React Query (`@tanstack/react-query`) for server state
- **Form Handling**: `react-hook-form` + `zod` for validation
- **Styling**: Tailwind CSS with design system defined in `DESIGN_SYSTEM.md`
- **Error Handling**: ApiError class with structured error info
- **Idempotency**: Auto-generated `Idempotency-Key` header for all mutations (POST/PUT/PATCH/DELETE)

**Authentication Flow:**
1. User logs in → backend sets HttpOnly cookie with refresh token
2. Access token stored in memory (not localStorage)
3. On 401 → `api-client.ts` automatically calls `/auth/refresh` endpoint
4. Failed refresh → redirect to login with `?session_expired=true`
5. Concurrent requests queued during refresh to prevent duplicate refresh attempts

## Critical Implementation Details

### Authentication System
- **Backend**: JWT strategy in `auth/strategies/jwt.strategy.ts` extracts token from Authorization header or cookie
- **Refresh Tokens**: Hashed before storage, tied to user via foreign key, support revocation via `revokedAt` timestamp
- **Cleanup**: Scheduled job runs every 6 hours to delete expired/revoked tokens
- **Security**: bcrypt with 12 rounds for passwords, RS256 for JWT (configurable)

### File Uploads (Vehicle Images)
- Stored in `backend/uploads/` directory
- Served via static asset middleware at `/uploads/` prefix
- Frontend displays from `http://localhost:3001/uploads/[filename]`
- Multiple images supported via `imageUrls` array field

### API Response Format
All successful responses follow this structure:
```typescript
{
  success: true,
  data: T,
  timestamp: "2024-01-01T00:00:00.000Z",
  meta?: {           // For paginated responses
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

Error responses:
```typescript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message",
    details?: { field: ["error1", "error2"] }  // Validation errors
  },
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

### Idempotency Implementation
- Redis key format: `idempotency:{idempotency-key}`
- Supports request deduplication during concurrent processing
- Returns cached response for completed requests
- 24-hour retention period
- Opt-out via `@NonIdempotent()` decorator

### Multi-Tenancy
- Each organization is isolated via `organizationId` foreign key
- User belongs to one organization
- All queries filtered by organization automatically in service layer
- No shared data between organizations

## Testing Patterns

### Backend Testing
- **Unit Tests**: `*.spec.ts` files colocated with source
- **Integration Tests**: `*.integration.spec.ts` for full request/response cycles
- **Fixtures**: Test data in `src/test/fixtures/`
- **Test Utils**: Database reset, auth helpers in `src/test/test-utils.ts`

### Frontend Testing
- **Vitest**: Component and utility testing
- **React Testing Library**: Component interaction testing
- **Test Utils**: Mock providers in `lib/test-utils/`

### E2E Testing
- **Playwright**: Full user flow testing
- **Test Data**: Uses `.env.test` for credentials
- **Screenshots**: Auto-captured in `test-results/`

## Common Gotchas

1. **Prisma Client**: Must run `npx prisma generate` after schema changes
2. **Docker Volumes**: Named volumes for `node_modules` prevent local/container conflicts
3. **CORS**: Configured in `main.ts` - add new origins to `allowedOrigins` array
4. **Hot Reload**: Frontend/backend both support hot reload in Docker via volume mounts
5. **Migration Conflicts**: Reset with `npx prisma migrate reset` (destroys data!)
6. **Redis Connection**: Check `REDIS_PASSWORD` matches between `.env` and `docker-compose.yml`
7. **Cookie Auth**: Frontend must use `withCredentials: true` (already configured in api-client)

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` - Runs on PR: lint, type-check, build, test
- `deploy-backend.yml` - Deploys to Railway on merge to main
- `deploy-frontend.yml` - Deploys to Vercel on merge to main
- `pr-preview.yml` - Creates Vercel preview deployments for PRs

See `.github/CICD_SETUP.md` for detailed setup instructions.

## Documentation

Additional documentation in `docs/`:
- **Getting Started**: `docs/getting-started/` - Quick start, Docker setup
- **Security**: `docs/security/` - Security headers, rate limiting, password policy
- **Testing**: `docs/testing/` - Backend and auth testing patterns
- **API**: `docs/api/` - Idempotency implementation details
- **Deployment**: `docs/deployment/` - Production deployment guide

Component-specific docs:
- `backend/docs/` - Database, logging, fail-safe systems
- `frontend/DESIGN_SYSTEM.md` - UI component guidelines and color system
- `frontend/REACT_QUERY_GUIDE.md` - Data fetching patterns
- `shared/types/README.md` - Shared TypeScript types

## Port Configuration

- Frontend: `3000`
- Backend API: `3001` (prefix: `/api/v1`)
- PostgreSQL: `5432` (localhost only)
- Redis: `6379` (localhost only)

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Access token expiry (default: 15m)
- `FRONTEND_URL` - For CORS configuration

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `http://localhost:3001/api/v1`)

See README.md for complete environment variable reference.

# CommandDeck Orchestrator

Follow the orchestration instructions in:
- .claude/ORCHESTRATOR.md

# End CommandDeck Orchestrator
