# Authentication (JWT & Refresh Tokens) - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 14)                                       │
│ - Login/Signup Pages                                        │
│ - API Client with Auth Interceptors                         │
│ - Cookie Management (httpOnly)                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ CORS with credentials: true
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ API Gateway / Nginx (Production)                            │
│ - TLS Termination (HTTPS)                                   │
│ - Rate Limiting (nginx)                                     │
│ - Security Headers                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/1.1
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend (NestJS)                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ AuthController                                          │ │
│ │ - POST /signup (public, throttled 5/15min)             │ │
│ │ - POST /login (public, throttled 5/15min)              │ │
│ │ - GET /me (protected)                                   │ │
│ │ - POST /refresh (public, throttled 10/60s)             │ │
│ │ - POST /logout (protected)                              │ │
│ │ - POST /validate-password (public, throttled 10/60s)   │ │
│ └──────────────┬──────────────────────────────────────────┘ │
│                │                                              │
│ ┌──────────────▼──────────────────────────────────────────┐ │
│ │ AuthService                                             │ │
│ │ - signup(dto): Create org + user + tokens              │ │
│ │ - login(dto): Validate creds + generate tokens         │ │
│ │ - refreshAccessToken(token): Generate new JWT          │ │
│ │ - logout(userId): Revoke tokens + clear cache          │ │
│ │ - getMe(userId): Get user + org (with caching)         │ │
│ └──────────────┬──────────────────────────────────────────┘ │
│                │                                              │
│ ┌──────────────▼──────────────────────────────────────────┐ │
│ │ RefreshTokenService                                     │ │
│ │ - createRefreshToken(): Generate + store hashed token  │ │
│ │ - validateRefreshToken(token): Find + validate token   │ │
│ │ - revokeRefreshToken(token): Mark as revoked           │ │
│ │ - revokeAllUserTokens(userId): Logout all sessions     │ │
│ │ - cleanupExpiredTokens(): Scheduled cleanup job        │ │
│ └──────────────┬──────────────────────────────────────────┘ │
│                │                                              │
│ ┌──────────────▼──────────────────────────────────────────┐ │
│ │ JwtService (@nestjs/jwt)                               │ │
│ │ - sign(payload): Create JWT access token              │ │
│ │ - verify(token): Validate JWT signature + expiry      │ │
│ └──────────────┬──────────────────────────────────────────┘ │
└─────────────┬──────────────────────────────────────────────┘
              │
              ├─────────────────┬──────────────────────┐
              ↓                 ↓                      ↓
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ PostgreSQL   │   │ Redis        │   │ File System  │
    │ (Users,      │   │ (User Cache) │   │ (Logs)       │
    │  Orgs, Tokens)   │ (TTL: 15m)   │   │              │
    └──────────────┘   └──────────────┘   └──────────────┘
```

### Design Patterns Used

- **JWT Bearer Tokens**: Stateless authentication without session storage
- **Refresh Token Rotation**: Short-lived access tokens + long-lived refresh tokens for security-UX balance
- **HttpOnly Cookies**: Secure token storage resistant to XSS attacks
- **Service Layer Pattern**: Business logic separated from HTTP concerns
- **Dependency Injection**: NestJS injectable services for loose coupling
- **Database Transaction**: Atomic organization + user creation in signup
- **Redis Caching**: Cache user data for fast `/me` endpoint
- **Scheduled Jobs**: Automatic cleanup of expired tokens every 6 hours

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/auth/`

**Key Files**:
```
auth/
├── auth.module.ts                      # Module definition, imports, providers
├── auth.controller.ts                  # HTTP endpoints (signup, login, refresh, etc.)
├── auth.service.ts                     # Business logic (credential validation, token generation)
├── refresh-token.service.ts            # Refresh token lifecycle (create, validate, revoke, cleanup)
├── dto/
│   ├── signup.dto.ts                   # Signup request validation
│   └── login.dto.ts                    # Login request validation
├── helpers/
│   └── password-validator.ts           # Password strength validation
├── strategies/
│   └── jwt.strategy.ts                 # JWT extraction and validation (used by JwtAuthGuard)
├── jobs/
│   └── refresh-token-cleanup.job.ts    # Scheduled cleanup of expired tokens
├── auth.service.spec.ts                # Unit tests (410 lines)
└── auth.controller.integration.spec.ts # Integration tests (410 lines)
```

**Dependencies**:
- **@nestjs/jwt**: JWT token generation and validation
- **@nestjs/passport**: Authentication strategy framework
- **bcrypt@5.1.0**: Password hashing and refresh token hashing
- **passport**: Authentication middleware
- **passport-jwt**: JWT authentication strategy
- **@nestjs/throttler**: Rate limiting

**Injected Services**:
- `PrismaService` - Database access
- `RedisService` - User data caching
- `JwtService` - Token generation/validation
- `RefreshTokenService` - Token lifecycle management

### Frontend (Next.js 14)

**Component Location**: `frontend/app/auth/` and `frontend/lib/`

**Key Files**:
```
auth/
├── login/
│   └── page.tsx                        # Login page component
├── signup/
│   └── page.tsx                        # Signup page component

lib/
├── api-client.ts                       # Axios instance with auth interceptors
└── types/
    └── auth.ts                         # TypeScript types for auth responses
```

**State Management**:
- **React Query**: `useMutation` for signup/login, `useQuery` for `/me` endpoint
- **Local State**: `useState` for form fields, loading state, error messages
- **No Context**: Auth state derived from API responses, not persisted in context
- **Interceptors**: Request interceptor adds `Idempotency-Key`, response interceptor handles 401 + auto-refresh

### Database Schema

**Prisma Models** (from `backend/prisma/schema.prisma`):

```prisma
model User {
  id              String   @id @default(uuid())
  organizationId  String
  email           String   @unique
  passwordHash    String
  firstName       String
  lastName        String
  role            String   // admin, manager, sales_agent, support
  locationId      String?  // null for multi-location admins
  isActive        Boolean  @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  refreshTokens   RefreshToken[]

  @@index([organizationId])
  @@index([email])
}

model Organization {
  id            String   @id @default(uuid())
  name          String
  slug          String   @unique
  billingEmail  String
  settings      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  users         User[]
  // ... other relations
}

model RefreshToken {
  id          String    @id @default(uuid())
  tokenHash   String    @unique
  userId      String
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?
  userAgent   String?
  ipAddress   String?

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@index([userId, revokedAt])
}
```

**Migrations**: `backend/prisma/migrations/` - Initial migration created in project setup

**Indexes**:
- `User.email` - O(1) login lookups
- `User.organizationId` - Multi-tenant filtering
- `RefreshToken.userId` - Find all tokens for user logout
- `RefreshToken.expiresAt` - Efficient cleanup query
- `RefreshToken.userId + revokedAt` - Find non-revoked tokens quickly

### API Endpoints

**Base Path**: `/api/v1/auth`

| Method | Endpoint | Auth | Idempotent | Rate Limit | Description |
|--------|----------|------|------------|------------|-------------|
| POST | `/signup` | No | Yes* | 5/15min | Create organization and first user |
| POST | `/login` | No | No | 5/15min | Authenticate user with credentials |
| GET | `/me` | Yes | Yes | 100/min | Get current user and organization |
| POST | `/refresh` | No | Yes* | 10/60s | Generate new access token using refresh token |
| POST | `/logout` | Yes | No | 100/min | Revoke refresh token and clear session |
| POST | `/validate-password` | No | No | 10/60s | Validate password strength |

_*Idempotent via `IdempotencyInterceptor` with 24-hour Redis cache_

**Request/Response Examples**:

### POST /auth/signup

**Request:**
```typescript
// POST /api/v1/auth/signup
// Headers: Content-Type: application/json, Idempotency-Key: <UUID>
{
  "organizationName": "Acme Motors",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acmemotors.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-123",
      "email": "john@acmemotors.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "org-uuid-456",
      "isActive": true,
      "lastLoginAt": "2024-12-28T14:30:00.000Z",
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:30:00.000Z"
    },
    "organization": {
      "id": "org-uuid-456",
      "name": "Acme Motors",
      "slug": "acme-motors-1735401000",
      "billingEmail": "john@acmemotors.com",
      "settings": null,
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:30:00.000Z"
    }
  },
  "timestamp": "2024-12-28T14:30:00.000Z"
}
```

**Cookies Set** (in response headers):
```
Set-Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; SameSite=Lax; Max-Age=900
Set-Cookie: refresh_token=<refresh-token-base64>; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=604800
```

**Error Response (409 Conflict - Email exists):**
```typescript
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "User with this email already exists"
  },
  "timestamp": "2024-12-28T14:30:00.000Z"
}
```

**Error Response (400 Bad Request - Validation error):**
```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "password": ["must be at least 8 characters", "must contain at least one uppercase letter"]
    }
  },
  "timestamp": "2024-12-28T14:30:00.000Z"
}
```

### POST /auth/login

**Request:**
```typescript
// POST /api/v1/auth/login
// Headers: Content-Type: application/json, Idempotency-Key: <UUID>
{
  "email": "john@acmemotors.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-123",
      "email": "john@acmemotors.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "org-uuid-456",
      "isActive": true,
      "lastLoginAt": "2024-12-28T14:35:00.000Z",
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:35:00.000Z"
    },
    "organization": {
      "id": "org-uuid-456",
      "name": "Acme Motors",
      "slug": "acme-motors-1735401000",
      "billingEmail": "john@acmemotors.com",
      "settings": null,
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:30:00.000Z"
    }
  },
  "timestamp": "2024-12-28T14:35:00.000Z"
}
```

**Error Response (401 Unauthorized):**
```typescript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  },
  "timestamp": "2024-12-28T14:35:00.000Z"
}
```

### GET /auth/me

**Request:**
```typescript
// GET /api/v1/auth/me
// Headers: Cookie: auth_token=<JWT>; Authorization: Bearer <JWT> (either works)
```

**Response (200 OK):**
```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-123",
      "email": "john@acmemotors.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "org-uuid-456",
      "isActive": true,
      "lastLoginAt": "2024-12-28T14:35:00.000Z",
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:35:00.000Z"
    },
    "organization": {
      "id": "org-uuid-456",
      "name": "Acme Motors",
      "slug": "acme-motors-1735401000",
      "billingEmail": "john@acmemotors.com",
      "settings": null,
      "createdAt": "2024-12-28T14:30:00.000Z",
      "updatedAt": "2024-12-28T14:30:00.000Z"
    }
  },
  "timestamp": "2024-12-28T14:35:00.000Z"
}
```

### POST /auth/refresh

**Request:**
```typescript
// POST /api/v1/auth/refresh
// Headers: Cookie: refresh_token=<refresh-token>; Idempotency-Key: <UUID>
// Body: {} (empty, token extracted from cookie)
```

**Response (201 Created):**
```typescript
{
  "success": true,
  "data": {
    "user": { /* same structure as /me */ },
    "organization": { /* same structure as /me */ }
  },
  "timestamp": "2024-12-28T14:45:00.000Z"
}
```

**Cookies Set:**
```
Set-Cookie: auth_token=<new-JWT>; Path=/; HttpOnly; SameSite=Lax; Max-Age=900
```

### POST /auth/logout

**Request:**
```typescript
// POST /api/v1/auth/logout
// Headers: Cookie: auth_token=<JWT>; refresh_token=<token>
// Body: {}
```

**Response (201 Created):**
```typescript
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "timestamp": "2024-12-28T14:50:00.000Z"
}
```

**Cookies Cleared:**
```
Set-Cookie: auth_token=; Path=/; HttpOnly; SameSite=Lax; Expires=<past-date>
Set-Cookie: refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Expires=<past-date>
```

### POST /auth/validate-password

**Request:**
```typescript
// POST /api/v1/auth/validate-password
// Headers: Content-Type: application/json
{
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```typescript
{
  "success": true,
  "data": {
    "isStrong": true,
    "strength": "Strong",
    "score": 4,
    "errors": []
  },
  "timestamp": "2024-12-28T14:50:00.000Z"
}
```

**Error Response (weak password):**
```typescript
{
  "success": true,
  "data": {
    "isStrong": false,
    "strength": "Weak",
    "score": 1,
    "errors": [
      "Must be at least 8 characters long",
      "Must contain at least one uppercase letter",
      "Must contain at least one special character (@$!%*?&)"
    ]
  },
  "timestamp": "2024-12-28T14:50:00.000Z"
}
```

### Service Layer Logic

**AuthService** (`backend/src/auth/auth.service.ts`):

```typescript
class AuthService {
  // Signup: Create organization + user + tokens in transaction
  async signup(signupDto: SignupDto, userAgent?: string, ipAddress?: string) {
    // 1. Hash password with bcrypt (12 rounds)
    // 2. Create organization in transaction
    // 3. Create user in transaction
    // 4. Generate JWT access token
    // 5. Create and store hashed refresh token
    // 6. Return user, org, and tokens (no exposure in body)
  }

  // Login: Validate credentials + generate tokens
  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    // 1. Find user by email
    // 2. Compare password hash with bcrypt
    // 3. Check account is active
    // 4. Update lastLoginAt
    // 5. Cache user data in Redis
    // 6. Generate JWT access token
    // 7. Create and store hashed refresh token
    // 8. Return user, org, and tokens
  }

  // Get current user: Fetch from cache or database
  async getMe(userId: string) {
    // 1. Try Redis cache (key: "user:{userId}", TTL: 15 min)
    // 2. If miss, query database with organization relation
    // 3. Cache result and return
  }

  // Refresh: Generate new access token from valid refresh token
  async refreshAccessToken(refreshToken: string, userAgent?: string, ipAddress?: string) {
    // 1. Validate refresh token (find match, check expiry, check revocation)
    // 2. Verify user is still active
    // 3. Generate new JWT access token
    // 4. Return user, org, and new token
  }

  // Logout: Revoke tokens + invalidate cache
  async logout(userId: string, refreshToken?: string) {
    // 1. Mark refresh token as revoked (or all tokens if not provided)
    // 2. Clear user cache from Redis
  }

  // Private helper: Generate JWT with minimal claims
  private generateToken(user: User): string {
    const payload = {
      sub: user.id,           // Subject (user ID)
      email: user.email,
      role: user.role,
      organizationId: user.organizationId  // For multi-tenancy
    };
    // Sign with JWT_SECRET, expire in 15 minutes
    return this.jwtService.sign(payload);
  }

  // Private helper: Sanitize user (remove passwordHash)
  private sanitizeUser(user: User) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
```

**RefreshTokenService** (`backend/src/auth/refresh-token.service.ts`):

```typescript
class RefreshTokenService {
  // Generate: Create cryptographically secure random token
  generateRefreshToken(): string {
    // crypto.randomBytes(32).toString('base64url')
    // Returns 43-character base64url string (256 bits of entropy)
  }

  // Create: Generate, hash, and store refresh token
  async createRefreshToken(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    // 1. Generate random token
    // 2. Hash with bcrypt (cost factor: 10)
    // 3. Calculate expiry (7 days from now)
    // 4. Store in database with userId, userAgent, ipAddress
    // 5. Return plaintext token (only time it's available)
  }

  // Validate: Find matching token and return user if valid
  async validateRefreshToken(token: string): Promise<RefreshTokenValidation> {
    // 1. Find all non-revoked, non-expired refresh tokens
    // 2. For each token, bcrypt.compare against provided token
    // 3. On match, verify user is active
    // 4. Return user if valid, else return { valid: false }
  }

  // Revoke: Mark specific token as revoked
  async revokeRefreshToken(token: string): Promise<void> {
    // 1. Find matching token by bcrypt comparison
    // 2. Update revokedAt to current time
    // 3. Ignore if token not found (idempotent)
  }

  // Revoke All: Revoke all tokens for a user (logout all sessions)
  async revokeAllUserTokens(userId: string): Promise<number> {
    // 1. Update all non-revoked tokens for user
    // 2. Set revokedAt to current time
    // 3. Return count of revoked tokens
  }

  // Cleanup: Delete expired and old revoked tokens (scheduled job)
  async cleanupExpiredTokens(): Promise<number> {
    // 1. Delete tokens where expiresAt < now
    // 2. Delete revoked tokens where revokedAt < (now - 7 days)
    // 3. Return count of deleted tokens
  }
}
```

### Transaction Handling

**Signup Transaction** (`auth.service.ts:39-65`):

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  // Create organization
  const organization = await tx.organization.create({
    data: {
      name: signupDto.organizationName,
      slug: this.generateSlug(signupDto.organizationName),
      billingEmail: signupDto.email,
    },
  });

  // Create user
  const user = await tx.user.create({
    data: {
      email: signupDto.email,
      passwordHash,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      role: 'admin',
      organizationId: organization.id,
    },
    include: { organization: true },
  });

  return { user, organization };
});
```

**Why Transaction?**
- Atomicity: If user creation fails, organization is rolled back (avoids orphaned organizations)
- Consistency: Both organization and user created together or not at all
- Isolation: Concurrent signups don't interfere

### Caching Strategy

**Redis Keys & TTL**:
- `user:{userId}` (TTL: 15 minutes)
  - Value: `{ user: {...}, organization: {...} }`
  - Populated on login and /me endpoint hits
  - Invalidated on logout or user profile updates

**Cache Invalidation**:
- On `login`: Cache user data
- On `refreshAccessToken`: No cache invalidation (user data assumed fresh)
- On `logout`: Delete user cache entry
- On user profile update: Delete user cache entry

**Rationale**:
- GET /me called frequently (dashboards, components)
- User data changes infrequently
- 15-minute TTL balances freshness vs. database load
- Invalidation on logout ensures no stale data on new login

### Background Jobs

**Refresh Token Cleanup Job**:
- **Schedule**: Every 6 hours (configurable via cron expression)
- **Purpose**: Delete expired and old revoked refresh tokens
- **Implementation**: `backend/src/auth/jobs/refresh-token-cleanup.job.ts`
- **Trigger**: `@Cron('0 */6 * * *')` (every 6 hours)
- **Logic**:
  1. Find tokens where `expiresAt < now` (expired)
  2. Find tokens where `revokedAt < (now - 7 days)` (old revoked)
  3. Delete all matching tokens
  4. Log count of deleted tokens

**Why?**
- Unbounded token growth would eventually harm database performance
- 7-day retention period balances cleanup frequency vs. forensic data retention

## Testing Strategy

### Unit Tests

**Location**: `backend/src/auth/auth.service.spec.ts` (410 lines)

**Coverage**:
- ✅ `signup()`: Valid signup, duplicate email, transaction rollback
- ✅ `login()`: Valid login, invalid credentials, inactive account, lastLoginAt update
- ✅ `getMe()`: Cache hit, cache miss, caching behavior
- ✅ `refreshAccessToken()`: Valid refresh, expired token, invalid token, inactive user
- ✅ `logout()`: Revoke single token, revoke all tokens, cache invalidation
- ✅ `generateToken()`: JWT payload structure, expiration claims
- ✅ `sanitizeUser()`: Password hash removed, other fields present
- ✅ Password hashing: bcrypt with 12 rounds

**Run**: `npm run test:unit -- auth.service`

### Integration Tests

**Location**: `backend/src/auth/*.integration.spec.ts` (1300+ lines total)

**Files**:
1. `auth.controller.integration.spec.ts` (410 lines)
   - Full HTTP request/response cycle
   - Cookie handling validation
   - Rate limiting enforcement
   - Error response formats
   - Status codes (201, 401, 409, 400)

2. `idempotency-e2e.integration.spec.ts` (464 lines)
   - Signup idempotency (same request returns cached response)
   - Token refresh idempotency
   - Duplicate request within 24 hours returns same tokens

3. `signup-idempotency.integration.spec.ts` (426 lines)
   - Signup with duplicate email returns 409 (not idempotent)
   - Idempotency key required for idempotency
   - Different idempotency keys generate different tokens

**Key Assertions**:
- ✅ `POST /signup` sets httpOnly cookies
- ✅ `POST /login` sets httpOnly cookies
- ✅ Response body does NOT contain tokens
- ✅ Cookies have correct attributes (HttpOnly=true, SameSite=Lax, Path=/, Max-Age)
- ✅ `POST /logout` clears cookies
- ✅ Rate limit: 6th request in 15 min returns 429 Too Many Requests
- ✅ Invalid password returns validation error with details
- ✅ Non-existent user on login returns 401
- ✅ Inactive user on login returns 401
- ✅ Token refresh with expired token returns 401

**Run**: `npm run test:integration -- auth`

### E2E Tests

**Location**: `e2e-tests/tests/auth-flow.spec.ts` (339 lines)

**Coverage**:
- ✅ Complete signup workflow (load page, fill form, submit, verify redirect)
- ✅ Complete login workflow
- ✅ Authenticated page access (`/dealer` requires auth)
- ✅ Token persistence across page refresh
- ✅ Auto-refresh on token expiry (mock time advancement)
- ✅ Logout workflow (click button, verify redirect)
- ✅ Protected route redirect when not authenticated

**Run**: `cd e2e-tests && npm test -- auth-flow`

### Test Fixtures

**Location**: `backend/src/test/fixtures/auth.fixture.ts`

```typescript
export const createUser = (overrides?: Partial<User>) => ({
  id: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  organizationId: 'test-org-123',
  isActive: true,
  passwordHash: '$2b$12$...',  // bcrypt hash of 'Password123!'
  lastLoginAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createOrganization = (overrides?: Partial<Organization>) => ({
  id: 'test-org-123',
  name: 'Test Organization',
  slug: 'test-organization-12345',
  billingEmail: 'billing@test.com',
  settings: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createRefreshToken = (overrides?: Partial<RefreshToken>) => ({
  id: 'test-token-123',
  tokenHash: '$2b$10$...',  // bcrypt hash
  userId: 'test-user-123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  revokedAt: null,
  userAgent: 'Mozilla/5.0...',
  ipAddress: '127.0.0.1',
  ...overrides,
});
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (`backend/src/common/guards/jwt-auth.guard.ts`)
- **Token Location**: HttpOnly cookie `auth_token` (preferred) or `Authorization: Bearer` header
- **Validation**:
  - JWT signature verified using `JWT_SECRET`
  - Token expiry checked (claims.exp)
  - User still active verified in `refreshAccessToken`
  - JWT payload includes `organizationId` for authorization

**JwtStrategy** (`backend/src/auth/strategies/jwt.strategy.ts`):
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  }
}
```

### Authorization

- **Role Checks**: `@Roles('admin')` decorator + `RolesGuard` for admin-only endpoints
- **Organization Isolation**: All queries filtered by `organizationId` from JWT payload
- **User Ownership**: User can only revoke own tokens (checked via `userId` from JWT)

**Example Authorization**:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Post('users')
async createUser(@GetUser() user: User, @Body() dto: CreateUserDto) {
  // Only admin role can create users
  // All operations scoped to user.organizationId
}
```

### Input Validation

**DTO Classes** with `class-validator`:
```typescript
export class SignupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  organizationName: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}
```

**Sanitization**:
- Prisma ORM prevents SQL injection (parameterized queries)
- Global `ValidationPipe` with `transform: true` sanitizes string inputs
- No user input directly in responses (always mapped through DTOs)

### Rate Limiting

**Throttle Decorator** (`@nestjs/throttler`):
```typescript
@Throttle({ default: { limit: 5, ttl: 900000 } })  // 5 per 15 minutes
@Post('signup')
async signup(...) { }

@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 per 60 seconds
@Post('refresh')
async refresh(...) { }

@Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 per 60 seconds
@Post('validate-password')
validatePassword(...) { }

// GET /me uses global limit (100 per minute)
```

## Performance Optimization

### Database Queries

**Indexes Used**:
- `User.email` - O(1) login lookups
- `User.organizationId` - Filtering by organization
- `RefreshToken.userId` - Find all tokens for logout
- `RefreshToken.expiresAt` - Efficient cleanup queries
- `RefreshToken.userId + revokedAt` - Find non-revoked tokens

**N+1 Prevention**:
- `signup`: Include organization in user creation
- `login`: Include organization in user lookup
- `refreshAccessToken`: Include organization in user lookup

**Pagination**: Not applicable (single user per auth endpoint)

### Caching

**Hot Data**:
- User profile + organization cached in Redis (15-min TTL)
- JWT payload small (6 claims) - ~200 bytes

**Cache Hit Rate**:
- `/me` endpoint: 60-80% hit rate (most calls within 15 min of login)
- Login/signup: 0% hit rate (cache miss then set)
- Token refresh: No cache operation

### Frontend Optimization

**Code Splitting**:
- Auth pages lazy-loaded in route groups (`(auth)/`)
- API client imported once, singleton pattern

**React Query Strategy**:
- `useLoginMutation`: POST request, invalidate cache on success
- `useSignupMutation`: POST request, invalidate cache on success
- `useMeQuery`: GET with 5-minute stale time, 10-minute cache time
- Focus refetch on window visibility to keep data fresh

**Request Queuing**:
- During token refresh (401 response), failed requests queued
- First refresh attempt proceeds, others wait
- On success, queued requests retried with new token
- Prevents thundering herd of refresh requests

## Monitoring & Observability

### Logging

**Level**: INFO (production), DEBUG (development)
**Format**: JSON via Pino logger

**Key Events Logged** (`backend/src/auth/auth.service.ts`):
- `auth.signup.start` - User starting signup
- `auth.signup.success` - Organization + user created
- `auth.signup.error` - Signup failed (email exists, validation error)
- `auth.login.start` - User starting login
- `auth.login.success` - User authenticated
- `auth.login.error` - Login failed (invalid credentials, inactive)
- `auth.refresh.start` - Token refresh attempt
- `auth.refresh.success` - New token generated
- `auth.refresh.error` - Refresh failed (invalid token, user inactive)
- `auth.logout.start` - User starting logout
- `auth.logout.success` - Tokens revoked
- `auth.logout.error` - Logout failed

**Example Log Entry**:
```json
{
  "level": "info",
  "timestamp": "2024-12-28T14:30:00.000Z",
  "message": "auth.login.success",
  "userId": "user-uuid-123",
  "email": "john@acmemotors.com",
  "organizationId": "org-uuid-456",
  "lastLoginAt": "2024-12-28T14:30:00.000Z",
  "ipAddress": "192.168.1.100"
}
```

### Metrics (Future)

- **Latency**: p50, p95, p99 for `/login`, `/signup`, `/refresh`
- **Error Rate**: 401, 409, 429 counts per minute
- **Business Metrics**:
  - Signups per day
  - Active sessions (count of non-revoked, non-expired refresh tokens)
  - Failed logins (invalid credentials)
  - Rate limit violations

### Alerts (Future)

- Error rate > 10% on auth endpoints
- Signup failure rate > 5%
- Token refresh failure rate > 1%
- Latency p99 > 500ms

## Deployment Considerations

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=<randomly-generated-64-byte-base64-string>  # Use: openssl rand -base64 64
JWT_EXPIRES_IN=15m                                      # Access token expiry
REFRESH_TOKEN_CLEANUP_DAYS=7                            # Revoked token retention

# Security
NODE_ENV=production                                     # Enable secure flag on cookies
FRONTEND_URL=https://fleetpass.example.com              # CORS origin for production
```

### Database Migrations

```bash
# Apply migrations (production)
npx prisma migrate deploy

# Create migration (development)
npx prisma migrate dev --name add_auth_tables

# Reset database (development only!)
npx prisma migrate reset  # WARNING: Destroys all data
```

### Feature Flags

Not currently implemented; consider adding for:
- `ENABLE_MFA` - Multi-factor authentication
- `ENABLE_SSO` - Single sign-on
- `REQUIRE_EMAIL_VERIFICATION` - Email verification on signup

## Known Technical Debt

- [ ] **Refresh token algorithm**: Current implementation iterates all non-expired tokens for validation (O(n)). Consider using indexed queries or storing token IDs separately.
- [ ] **Session device tracking**: IP and user agent stored but not used for blocking suspicious logins.
- [ ] **Password reset**: No implementation; users cannot self-service password resets.
- [ ] **Rate limit storage**: Uses memory/throttler; no Redis-backed rate limit tracking for distributed deployments.

## Troubleshooting

### Common Issues

**Issue**: "Refresh token not found" error on refresh endpoint
- **Cause**: Refresh token cookie missing or not sent with request
- **Fix**: Verify frontend sends cookies with `withCredentials: true` in axios config
- **Prevention**: Test CORS configuration with credentials enabled

**Issue**: CORS error when calling auth endpoints
- **Cause**: `credentials: true` not configured on CORS or frontend
- **Fix**:
  1. Backend: `app.enableCors({ origin: FRONTEND_URL, credentials: true })`
  2. Frontend: Ensure `withCredentials: true` in axios config
- **Prevention**: Test preflight requests with credentials flag

**Issue**: "401 Unauthorized" on protected routes after login
- **Cause**: JWT not being extracted from cookies by JwtAuthGuard
- **Fix**:
  1. Check JWT strategy reads from cookies: `@ExtractJwt.fromExtractors([...)
  2. Verify cookie name matches: `auth_token`
  3. Check cookie is being sent: DevTools → Network → Request Headers → Cookie
- **Prevention**: Test cookie flow in DevTools before deployment

**Issue**: Token refresh loop / infinite 401
- **Cause**: Refresh token also expired; user needs new login
- **Fix**: Frontend redirects to login on refresh failure
- **Prevention**: Ensure refresh token (7 days) longer than access token (15 min)

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check refresh tokens in database
npx prisma studio
# Navigate to RefreshToken table, check expiresAt and revokedAt

# Check Redis cache
redis-cli
> KEYS user:*
> GET user:{userId}
> DEL user:{userId}  # Clear cache

# Check JWT payload (decode.io)
# Paste token at https://jwt.io (without sending to server)

# Check browser cookies
# DevTools → Application → Cookies → localhost:3000
# Look for auth_token and refresh_token with HttpOnly flag
```

## Development Workflow

### Adding New Functionality

1. **Update Prisma schema** (if needed)
   ```bash
   # Add fields to User or RefreshToken model
   npx prisma generate
   npx prisma migrate dev --name add_new_auth_field
   ```

2. **Update DTO classes** (`dto/`)
   ```typescript
   export class CreateUserDto {
     @IsString() email: string;
     // Add new fields
   }
   ```

3. **Implement service method** (`auth.service.ts`)
   ```typescript
   async createUser(dto: CreateUserDto, organizationId: string) {
     // Business logic
   }
   ```

4. **Add controller endpoint** (`auth.controller.ts`)
   ```typescript
   @Post('users')
   @UseGuards(JwtAuthGuard)
   async createUser(@Body() dto: CreateUserDto, @GetUser() user: User) {
     return this.authService.createUser(dto, user.organizationId);
   }
   ```

5. **Write tests** (unit → integration → E2E)
   - Unit: `auth.service.spec.ts`
   - Integration: `auth.controller.integration.spec.ts`
   - E2E: `e2e-tests/tests/auth-flow.spec.ts`

6. **Update documentation** (this file)

### Local Testing

```bash
# Backend
cd backend
npm run test:unit -- auth
npm run test:integration -- auth
npm run start:dev

# Frontend
cd frontend
npm run dev
# Test in browser at http://localhost:3000

# E2E
cd e2e-tests
npm test -- auth-flow
npm run test:debug  # Visual browser

# Manual cURL testing
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

## Related Technical Documentation

- [Database Schema](../../../backend/prisma/schema.prisma)
- [API Standards](../../api/standards.md)
- [Testing Guide](../../testing/authentication.md)
- [Security Guide](../../security/overview.md#authentication--authorization)
- [Response Format](../../api/response-format.md)

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/auth/auth.service.ts:20-268`
- Controller: `backend/src/auth/auth.controller.ts:26-214`
- Refresh Token Service: `backend/src/auth/refresh-token.service.ts:14-179`
- Frontend API Client: `frontend/lib/api-client.ts:1-162`
- Frontend Login Page: `frontend/app/auth/login/page.tsx`
- JWT Strategy: `backend/src/auth/strategies/jwt.strategy.ts`
- JWT Auth Guard: `backend/src/common/guards/jwt-auth.guard.ts`

## Architecture Decision Records (ADRs)

### HttpOnly Cookies for Token Storage

- **Date**: 2024-12-15
- **Context**: Team needed to secure JWT tokens against XSS attacks
- **Options**:
  1. localStorage (simple but vulnerable to XSS)
  2. httpOnly cookies (immune to XSS, but vulnerable to CSRF)
  3. In-memory only (vulnerable to page refresh)
- **Decision**: HttpOnly cookies with SameSite=Lax for both access and refresh tokens
- **Consequences**:
  - Pro: XSS attacks cannot steal tokens via `document.cookie`
  - Pro: Tokens automatically sent with requests (no manual header management)
  - Pro: Compatible with SSR/Next.js rendering
  - Con: CSRF protection requires SameSite flag (mitigated)
  - Con: Requires `withCredentials: true` on all requests

### Refresh Token Architecture

- **Date**: 2024-12-10
- **Context**: Balance between security (short JWT expiry) and UX (frequent re-login)
- **Options**:
  1. Long-lived JWT (bad: more time to misuse if compromised)
  2. Stateless refresh tokens (bad: cannot revoke)
  3. Database-backed refresh tokens (chosen)
- **Decision**: 15-minute access token + 7-day refresh token with database tracking
- **Consequences**:
  - Pro: Access token short-lived, reduces exposure window
  - Pro: Refresh tokens can be revoked immediately
  - Pro: Can track device/IP for security monitoring
  - Con: Requires database hit on token refresh
  - Con: Cleanup job needed to prevent database growth

### Password Hashing with bcrypt

- **Date**: 2024-11-20
- **Context**: Secure password storage and verification
- **Options**:
  1. MD5 (broken: reversible, no salt)
  2. SHA256 (weak: fast, requires additional salt)
  3. bcrypt (chosen: built-in salt, slow)
  4. Argon2 (stronger but slower, overkill for this use case)
- **Decision**: bcrypt with 12 rounds for user passwords, 10 rounds for token hashing
- **Consequences**:
  - Pro: Built-in salt, resistant to rainbow tables
  - Pro: Adaptive cost factor (rounds) for future-proofing
  - Pro: Well-tested, industry standard
  - Con: Slower than faster algorithms (intentional for security)

---

**Last Technical Review**: 2024-12-28
**Reviewer**: FleetPass Dev Team
