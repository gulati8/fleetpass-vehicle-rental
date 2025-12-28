# Authentication (JWT & Refresh Tokens)

> **Status**: ✅ Production
> **Owner**: Backend Team
> **Last Updated**: 2024-12-28

## Overview

Authentication is the foundation of FleetPass security, providing secure user login, registration, and session management for dealership employees. Users authenticate with email and password, receive JWT access tokens (stored in httpOnly cookies) and refresh tokens for long-lived sessions, with support for password validation, token revocation, and automatic cleanup.

## User Stories

### Primary Use Cases

- **As a dealership manager**, I want to create a new organization account with my first user so that my team can access the platform.
- **As a dealership staff member**, I want to log in with my email and password so that I can access the system securely.
- **As a user with an expired session**, I want the system to automatically refresh my access token so that I don't have to log in again.
- **As a security-conscious user**, I want my tokens stored securely (not in localStorage) so that malicious scripts cannot access them.
- **As a user logging out**, I want all my sessions terminated and tokens invalidated so that no one else can use my account.

### Supported Workflows

1. **User Registration & Organization Setup**
   - Step 1: New user navigates to signup page
   - Step 2: User enters organization name, personal details, and password
   - Step 3: System validates input and password strength
   - Step 4: System creates organization and user in a single transaction
   - Step 5: User receives access and refresh tokens, automatically logged in
   - Outcome: New organization is created with the user as admin

2. **User Login**
   - Step 1: User navigates to login page
   - Step 2: User enters email and password
   - Step 3: System validates credentials against database
   - Step 4: System checks if account is active
   - Step 5: System generates JWT access token and refresh token
   - Step 6: Tokens are set in httpOnly cookies
   - Outcome: User is authenticated and can access protected resources

3. **Automatic Token Refresh**
   - Step 1: User makes request with expired access token (15 min expiry)
   - Step 2: API returns 401 Unauthorized
   - Step 3: Frontend interceptor automatically calls refresh endpoint with refresh token cookie
   - Step 4: Backend validates refresh token and generates new access token
   - Step 5: Frontend automatically retries original request with new token
   - Outcome: User session continues seamlessly without re-login

4. **Session Termination (Logout)**
   - Step 1: User clicks logout button
   - Step 2: System revokes the refresh token in database
   - Step 3: Both auth_token and refresh_token cookies are cleared
   - Step 4: User cache is invalidated
   - Step 5: User is redirected to login page
   - Outcome: User session is completely terminated; tokens cannot be reused

5. **Password Strength Validation**
   - Step 1: User enters password on signup page
   - Step 2: Frontend calls validate-password endpoint
   - Step 3: System returns password strength score and requirements
   - Step 4: User feedback helps user create strong password
   - Outcome: Only strong passwords meeting requirements are accepted

## Business Rules

### Validations

- **Email uniqueness**: Each email must be unique across the system (Prisma constraint)
- **Password strength**: Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character (@$!%*?&)
- **Organization name**: Required, non-empty string (1-255 characters)
- **Account status**: Only active accounts can log in; inactive accounts are rejected

### Constraints

- **Access token expiration**: 15 minutes (short-lived, reduces damage if token is compromised)
- **Refresh token expiration**: 7 days (allows extended sessions without password re-entry)
- **Rate limiting - Login/Signup**: 5 attempts per 15 minutes per IP (prevents brute force attacks)
- **Rate limiting - Token Refresh**: 10 attempts per 60 seconds (reasonable for legitimate refresh cycles)
- **Rate limiting - Password Validation**: 10 attempts per 60 seconds (prevents abuse)
- **Automatic token cleanup**: Expired and revoked tokens deleted after 7 days
- **Cookie security**: httpOnly flag prevents JavaScript access (XSS protection), SameSite=Lax prevents CSRF

### Permissions

- **Who can access**:
  - `POST /auth/signup` - Public (no authentication required)
  - `POST /auth/login` - Public (no authentication required)
  - `POST /auth/validate-password` - Public (no authentication required)
  - `GET /auth/me` - Authenticated users only
  - `POST /auth/refresh` - Public (uses refresh token cookie)
  - `POST /auth/logout` - Authenticated users only

- **Access level**:
  - Signup/Login: Creates organization and user with initial admin role
  - Get Me: Returns user and organization data (single organization per user)
  - Refresh: Validates token ownership before issuing new token
  - Logout: Can only revoke own tokens (user_id from JWT)

- **Multi-tenant isolation**:
  - Each user belongs to one organization
  - JWT payload includes `organizationId` for downstream filtering
  - Users can only access resources within their organization
  - Password hashes never exposed in API responses

## User Interface

### Key Screens/Components

**Login Page**
- **Location**: `/auth/login`
- **Purpose**: Allow existing users to authenticate with credentials
- **Key Actions**:
  - Enter email and password
  - Click "Sign In" to submit credentials
  - Click "Don't have an account?" to navigate to signup
  - Auto-focus on email field
  - Password field hides input

**Signup Page**
- **Location**: `/auth/signup`
- **Purpose**: Create new organization account and first user
- **Key Actions**:
  - Enter organization name
  - Enter first and last name
  - Enter email address
  - Enter password with strength validation
  - Real-time password strength feedback (Weak/Fair/Good/Strong)
  - Click "Create Account" to submit
  - Click "Already have an account?" to navigate to login

**Password Strength Indicator**
- **Location**: Inline on signup form
- **Purpose**: Guide users to create strong passwords
- **Key Actions**:
  - Show strength score (0-4) with visual indicator
  - Display password requirements as requirements are met
  - Block form submission until password is strong enough

### User Flow Diagram

```
[Start]
  ↓
[User lands on /auth/login]
  ↓
[Has account?]
  ├─ YES → [Enter credentials] → [Click Sign In]
  │         ↓
  │    [Valid?] → YES → [Set cookies] → [Redirect to /dealer] → [Authenticated]
  │         ↓
  │        NO → [Show error: Invalid credentials] → [Retry]
  │
  └─ NO → [Click Create Account] → [/auth/signup]
           ↓
      [Enter details] → [Validate password strength]
           ↓
      [Click Create Account] → [Valid?]
           ├─ YES → [Create org & user] → [Set cookies] → [Redirect to /dealer]
           └─ NO → [Show validation errors] → [Retry]

[Authenticated User Session]
  ↓
[Request with expired access token (15 min)]
  ↓
[401 Unauthorized] → [Auto-refresh token] → [Retry request] → [Success]

[User clicks Logout]
  ↓
[Clear cookies] → [Revoke refresh token] → [Redirect to /auth/login]
```

## Data Model

### Key Entities

**User** (`backend/prisma/schema.prisma:59-82`)
- **Fields**:
  - `id` (string, UUID): Unique identifier
  - `email` (string): Unique email address
  - `passwordHash` (string): Bcrypt hashed password (never exposed)
  - `firstName` (string): User first name
  - `lastName` (string): User last name
  - `role` (string): User role (admin, manager, sales_agent, support)
  - `organizationId` (string): Foreign key to Organization
  - `locationId` (string, optional): Assigned location for location-scoped users
  - `isActive` (boolean): Account status
  - `lastLoginAt` (datetime, optional): Timestamp of last successful login
  - `createdAt` (datetime): Account creation timestamp
  - `updatedAt` (datetime): Last update timestamp

- **Relationships**:
  - Belongs to one `Organization` (cascade delete)
  - Has many `RefreshToken` (cascade delete)
  - Created bookings, leads, deals (for audit trail)

**Organization** (`backend/prisma/schema.prisma:14-30`)
- **Fields**:
  - `id` (string, UUID): Unique identifier
  - `name` (string): Organization display name
  - `slug` (string): URL-friendly unique slug (auto-generated from name + timestamp)
  - `billingEmail` (string): Email for billing communications
  - `settings` (JSON, optional): Configuration (brand colors, logo URL, etc.)
  - `createdAt` (datetime): Creation timestamp
  - `updatedAt` (datetime): Last update timestamp

- **Relationships**:
  - Has many `User` (cascade delete)
  - Has many `Location`, `Vehicle`, `Customer`, etc.

**RefreshToken** (`backend/prisma/schema.prisma:85-100`)
- **Fields**:
  - `id` (string, UUID): Unique identifier
  - `tokenHash` (string): Bcrypt hashed refresh token (never expose plaintext)
  - `userId` (string): Foreign key to User
  - `expiresAt` (datetime): Token expiration time (7 days from creation)
  - `revokedAt` (datetime, optional): Revocation timestamp (logout, security incident)
  - `userAgent` (string, optional): Browser user agent for device tracking
  - `ipAddress` (string, optional): IP address for security monitoring
  - `createdAt` (datetime): Token creation timestamp

- **Relationships**:
  - Belongs to one `User` (cascade delete)
  - Indexes: `[userId]`, `[expiresAt]`, `[userId, revokedAt]` for efficient cleanup

## Integration Points

### Internal Dependencies

- **JwtService** (`@nestjs/jwt`): Token generation and validation
- **PrismaService** (`prisma/prisma.service.ts`): Database access for user, organization, and token management
- **RedisService** (`redis/redis.service.ts`): Caching user data for quick access (15-minute TTL)
- **PasswordValidator** (`auth/helpers/password-validator.ts`): Password strength validation
- **JwtAuthGuard** (`common/guards/jwt-auth.guard.ts`): Route protection for authenticated endpoints
- **Public decorator** (`common/decorators/public.decorator.ts`): Marks public endpoints that skip auth guard

### External Services

- **None**: Authentication is self-contained; no third-party OAuth or MFA providers

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| **Invalid credentials** | Email not found or password incorrect | User sees "Invalid credentials" message | Verify email is correct; reset password if needed |
| **User with this email already exists** | Email is registered to another account | Signup fails with conflict error | Use different email or click login link |
| **Account is inactive** | Admin disabled the account | Login fails with inactive error | Contact admin to reactivate account |
| **Invalid refresh token** | Token expired, revoked, or malformed | Session ends; user redirected to login | User logs in again |
| **Refresh token not found** | Cookie missing or cleared | Refresh endpoint fails | This forces user login again |
| **Password does not meet requirements** | Password too weak or missing requirements | Signup blocked until fixed | Add uppercase, number, special character, etc. |
| **Rate limit exceeded** | Too many login/signup attempts | Request rejected with 429 | Wait 15 minutes before retrying |
| **Session expired** | Access token expired and refresh failed | Automatic redirect to login with message | User logs in again |

### Edge Cases

- **Simultaneous token refresh requests**: Multiple concurrent requests with expired token. System uses request queuing in frontend to prevent duplicate refresh attempts while first refresh is in-flight.

- **Token refresh during logout**: User logs out before access token is requested. Refresh token is revoked immediately; subsequent 401 redirects to login.

- **Password change during session**: User changes password in another session. Old JWT remains valid until expiry (15 min); next refresh with old refresh token succeeds. This is acceptable since refresh tokens are revoked on logout.

- **User deactivation**: Admin deactivates user account. JWT remains valid until expiry; refresh with refresh token will fail with "Account is inactive" error.

- **Cookie domain mismatch**: Frontend and backend on different domains. CORS configured with `credentials: true` to allow cookie sharing across same-origin requests only.

- **Cookie cleared by user**: User manually clears cookies in browser. Frontend still has valid JWT in memory; next refresh fails due to missing cookie, forces login.

- **Organizational slug collision**: Two signup requests with same organization name. Slug includes timestamp to guarantee uniqueness (slug format: `{name-slug}-{timestamp-base36}`).

## Testing

### Test Coverage

- ✅ **Unit Tests**: `backend/src/auth/auth.service.spec.ts` (410 lines)
  - Signup with organization creation
  - Login with credential validation
  - Token generation and refresh
  - Password hashing and validation
  - User data caching
  - Logout and token revocation

- ✅ **Integration Tests**:
  - `backend/src/auth/auth.controller.integration.spec.ts` (410 lines) - Full HTTP request/response cycle
  - `backend/src/auth/idempotency-e2e.integration.spec.ts` (464 lines) - Idempotency for signup/refresh
  - `backend/src/auth/signup-idempotency.integration.spec.ts` (426 lines) - Signup idempotency edge cases
  - Cookie setting/clearing validation
  - Rate limiting enforcement
  - Authentication guard behavior

- ✅ **E2E Tests**: `e2e-tests/tests/auth-flow.spec.ts` (339 lines)
  - Full user registration workflow
  - Full login workflow
  - Token refresh in browser
  - Logout flow
  - Protected route access
  - Session persistence across page refresh

### Manual Testing Checklist

- [ ] Signup: Create new organization and user
- [ ] Verify password validation feedback on signup page
- [ ] Login: Valid credentials allow access
- [ ] Login: Invalid credentials show error message
- [ ] Login: Inactive account shows inactive message
- [ ] Login: Check httpOnly cookie is set in DevTools
- [ ] Verify cookie is NOT accessible via `document.cookie`
- [ ] Authenticated request: Access protected route `/dealer`
- [ ] Token expiry: Wait 15 minutes, make request, verify auto-refresh occurs
- [ ] Logout: Cookies are cleared and refresh token is revoked
- [ ] Logout: Attempt to use old refresh token fails
- [ ] Rate limiting: Attempt 6 logins in 15 seconds, verify 6th fails
- [ ] CORS: Verify cookies sent with credentials: true
- [ ] Production mode: Verify secure flag on cookies over HTTPS

## Performance Considerations

- **Expected Load**: Peak login/signup during business hours (8am-6pm); typical 10-100 auth requests per minute per deployment
- **Optimization**:
  - User data cached in Redis (15-minute TTL) to reduce database hits for `GET /me` and token refresh
  - Database indexes on `email`, `userId`, `expiresAt` for fast lookups
  - JWT validation is stateless (no database hit needed)
  - Bcrypt comparison cached in memory where possible
  - Refresh token cleanup job runs every 6 hours to prevent unbounded database growth

- **Limits**:
  - Signup/Login: 5 requests per 15 minutes per IP (rate limit)
  - Token Refresh: 10 requests per 60 seconds per IP (reasonable for refresh cycles)
  - No hard limit on concurrent users; system scales horizontally

## Security Considerations

- **Authentication**:
  - JWT tokens signed with HS256 algorithm and strong secret (64+ bytes)
  - Access tokens stored in httpOnly cookies (XSS protection)
  - Refresh tokens hashed with bcrypt before storage (database breach mitigation)
  - Password hashed with bcrypt (12 rounds) using cryptographically secure salt

- **Authorization**:
  - JwtAuthGuard extracts user from JWT and validates signature
  - All protected endpoints require valid JWT
  - Multi-tenancy enforced by organizationId in JWT payload
  - Role-based access control on some endpoints (admin-only operations)

- **Data Protection**:
  - Password hashes never exposed in API responses (sanitization in service layer)
  - Refresh tokens only exposed once during creation, then hashed
  - Tokens include expiration to limit replay attack window
  - User IP and user agent logged for device tracking and fraud detection

- **Vulnerabilities Addressed**:
  - **OWASP A01: Broken Access Control** - Multi-tenant isolation via organizationId in JWT
  - **OWASP A02: Cryptographic Failures** - Strong hashing (bcrypt), secure storage (httpOnly), TLS required in production
  - **OWASP A03: Injection** - Prisma ORM prevents SQL injection; input validation on DTOs
  - **OWASP A04: Insecure Design** - JWT design with short expiry and refresh tokens
  - **OWASP A05: Broken Authentication** - Strong password requirements, rate limiting, password hashing
  - **OWASP A07: XSS** - httpOnly cookies prevent JavaScript access
  - **OWASP A22: CSRF** - SameSite=Lax cookies prevent cross-site requests

## Known Limitations

- **Password reset**: No current implementation; users cannot reset forgotten passwords. Future enhancement needed.
- **Multi-factor authentication (MFA)**: Not implemented; relies on password strength alone. Consider adding TOTP or SMS as future enhancement.
- **Social login**: No OAuth2 or social login providers (Google, Microsoft, etc.). Could be added as future enhancement.
- **Session device tracking**: While IP and user agent are logged, no blocking of suspicious logins. Could add anomaly detection in future.
- **Concurrent session limit**: Users can have unlimited concurrent sessions. Could limit to 1 active session per user as future enhancement.

## Future Enhancements

- **Password Reset Flow**: Allow users to reset forgotten passwords via email verification link
- **Email Verification**: Require email verification during signup to prevent typos and ensure deliverability
- **Multi-Factor Authentication (MFA)**: Add TOTP authenticator app support for higher security
- **Session Management UI**: Show active sessions, revoke individual sessions from security settings
- **Login Activity Log**: Users can view login history with timestamps, IPs, and device information
- **Suspicious Login Detection**: Flag and require verification for logins from unusual locations/devices
- **Social Authentication**: Support Google, Microsoft, GitHub OAuth for faster signup
- **Passwordless Login**: Support WebAuthn, magic links, or SMS authentication
- **Single Sign-On (SSO)**: Enterprise SSO via SAML or OpenID Connect

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [Security Guide](../../security/overview.md#authentication--authorization)
- [Testing Guide](../../testing/authentication.md)
- [API Standards](../../api/standards.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-28 | Initial business documentation | FleetPass Docs Team |
