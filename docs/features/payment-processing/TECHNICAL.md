# Payment Processing - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
Customer Payment Flow
├── Frontend (Next.js)
│   ├── [Checkout Component]
│   └── [Uses API Client to call backend]
│
├── Backend API (NestJS)
│   ├── [PaymentController] → Routes HTTP requests
│   ├── [PaymentService] → Business logic
│   └── [StripeMockService] → Simulates payment processing
│
└── Database (PostgreSQL)
    └── [Payment] model → Persists payment records
```

### Design Patterns Used

- **Service Layer Pattern**: Business logic isolated in `PaymentService`; controller delegates to service
- **Repository Pattern**: Prisma ORM acts as data repository with type-safe queries
- **Dependency Injection**: Prisma, StripeMockService, Logger injected via NestJS DI container
- **Idempotency Pattern**: Redis-backed automatic deduplication for mutations via `IdempotencyInterceptor`
- **Mock Service Pattern**: StripeMockService simulates Stripe API without real API calls (development-friendly)
- **DTO Validation Pattern**: Request validation at controller layer via `class-validator` decorators

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/payment/`

**Key Files**:
```
payment/
├── payment.module.ts              # Module definition, imports, providers
├── payment.controller.ts          # HTTP endpoints (@Get, @Post, etc.)
├── payment.service.ts             # Business logic (6 public methods)
├── dto/
│   ├── create-payment-intent.dto.ts
│   ├── confirm-payment.dto.ts
│   └── create-refund.dto.ts
├── payment.service.spec.ts        # Unit tests (509 lines)
└── payment.controller.integration.spec.ts  # Integration tests (425 lines)
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService` - Database access
  - `StripeMockService` - Payment processing simulation
  - `LoggerService` - Structured logging (Pino)
- **External Packages**:
  - `@nestjs/common` - Core NestJS decorators and exceptions
  - `class-validator` - DTO field validation

### Frontend (Next.js)

**Component Location**: `frontend/app/(customer)/booking/[id]/checkout` (planned implementation)

**Key Files** (to be created):
```
checkout/
├── page.tsx                 # Checkout page with payment form
├── components/
│   ├── PaymentForm.tsx      # Card input and confirmation
│   ├── PaymentStatus.tsx    # Shows payment state
│   └── RefundDialog.tsx     # Refund initiation (admin only)
└── hooks/
    └── usePayment.ts        # React Query mutation for payment operations
```

**State Management**:
- **React Query**: `useMutation` hooks for payment operations (create intent, confirm, refund)
- **Local State**: Form state managed by `react-hook-form` in PaymentForm
- **Global State**: User/org context from auth module for organization ID

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model Payment {
  id                    String   @id @default(uuid())
  bookingId             String
  amountCents           Int
  currency              String   @default("usd")
  status                String   // 'pending', 'processing', 'succeeded', 'failed', 'refunded'
  stripePaymentId       String?  // Mock Stripe payment intent ID
  stripeCustomerId      String?  // Mock Stripe customer ID
  paymentMethod         String?  // 'card', 'bank_transfer', etc.
  failureReason         String?
  refundedAmountCents   Int?
  organizationId        String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  booking               Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([bookingId])
  @@index([organizationId])
  @@index([status])
  @@index([stripePaymentId])
}
```

**Migrations**: Applied via `npx prisma migrate deploy`

**Indexes**:
- `bookingId` - Quick lookup of payments for a booking
- `organizationId` - Multi-tenant filtering (critical for security)
- `status` - Filtering by payment state (for dashboards, reporting)
- `stripePaymentId` - Reverse lookup from Stripe payment ID to local record

### API Endpoints

**Base Path**: `/api/v1/payments`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/intents` | JWT | Yes* | Create payment intent for booking |
| GET | `/intents/:id` | JWT | Yes | Get payment intent details |
| POST | `/intents/:id/confirm` | JWT | Yes* | Confirm payment with payment method |
| POST | `/intents/:id/cancel` | JWT | Yes* | Cancel pending payment intent |
| POST | `/:id/refund` | JWT | Yes* | Create full or partial refund |
| POST | `/webhooks` | None | No | Handle Stripe webhook events (mocked) |

_*Idempotent via `IdempotencyInterceptor` (24h Redis cache)_

**Request/Response Examples**:

### 1. Create Payment Intent

```typescript
// POST /api/v1/payments/intents
// Request
{
  "bookingId": "booking-uuid-123",
  "amountCents": 5000,        // Optional; defaults to booking.totalCents
  "currency": "usd",          // Optional; defaults to "usd"
  "customerId": "cus_stripe_id"  // Optional; Stripe customer ID
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid-456",
      "bookingId": "booking-uuid-123",
      "amountCents": 5000,
      "currency": "usd",
      "status": "pending",
      "stripePaymentId": "pi_mock_123",
      "stripeCustomerId": null,
      "paymentMethod": null,
      "failureReason": null,
      "refundedAmountCents": null,
      "organizationId": "org-uuid-789",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z",
      "booking": {
        "id": "booking-uuid-123",
        "bookingNumber": "BP-2024-000001",
        "totalCents": 5000
      }
    },
    "clientSecret": "pi_mock_123_secret_abc"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}

// Error Response (404 Not Found)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Booking not found"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### 2. Get Payment Details

```typescript
// GET /api/v1/payments/intents/:id
// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "payment-uuid-456",
    "bookingId": "booking-uuid-123",
    "amountCents": 5000,
    "currency": "usd",
    "status": "pending",
    "stripePaymentId": "pi_mock_123",
    "organizationId": "org-uuid-789",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:00:00.000Z",
    "booking": {
      "id": "booking-uuid-123",
      "bookingNumber": "BP-2024-000001",
      "customer": {
        "id": "customer-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "vehicle": {
        "id": "vehicle-uuid",
        "make": "Toyota",
        "model": "Camry",
        "year": 2024
      }
    }
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

### 3. Confirm Payment

```typescript
// POST /api/v1/payments/intents/:id/confirm
// Request
{
  "paymentMethodId": "pm_stripe_method_id"
}

// Response (200 OK) - Success
{
  "success": true,
  "data": {
    "id": "payment-uuid-456",
    "status": "succeeded",          // Changed from "pending"
    "paymentMethod": "card",
    "organizationId": "org-uuid-789",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:05:00.000Z",
    "booking": {
      "id": "booking-uuid-123",
      "status": "confirmed",        // Updated from "pending"
      "depositPaidAt": "2024-01-01T10:05:00.000Z"
    }
  },
  "timestamp": "2024-01-01T10:05:00.000Z"
}

// Response (200 OK) - Processing
{
  "success": true,
  "data": {
    "id": "payment-uuid-456",
    "status": "processing",         // Temporary state
    "paymentMethod": "card"
  },
  "timestamp": "2024-01-01T10:05:00.000Z"
}

// Response (200 OK) - Failed
{
  "success": true,
  "data": {
    "id": "payment-uuid-456",
    "status": "failed",
    "failureReason": "Insufficient funds"
  },
  "timestamp": "2024-01-01T10:05:00.000Z"
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Payment already succeeded"
  },
  "timestamp": "2024-01-01T10:05:00.000Z"
}
```

### 4. Cancel Payment

```typescript
// POST /api/v1/payments/intents/:id/cancel
// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "payment-uuid-456",
    "status": "failed",             // Changed from "pending"
    "failureReason": "Canceled by user",
    "organizationId": "org-uuid-789",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T10:10:00.000Z"
  },
  "timestamp": "2024-01-01T10:10:00.000Z"
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot cancel succeeded payment. Use refund instead."
  },
  "timestamp": "2024-01-01T10:10:00.000Z"
}
```

### 5. Create Refund

```typescript
// POST /api/v1/payments/:id/refund
// Request
{
  "amountCents": 2500,               // Optional; defaults to full refund
  "reason": "requested_by_customer"  // Optional; 'duplicate', 'fraudulent', or 'requested_by_customer'
}

// Response (200 OK) - Partial Refund
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid-456",
      "status": "succeeded",          // Still "succeeded" (not fully refunded)
      "amountCents": 5000,
      "refundedAmountCents": 2500,    // Partial refund applied
      "organizationId": "org-uuid-789"
    },
    "refund": {
      "id": "refund-uuid",
      "paymentIntentId": "pi_mock_123",
      "amountCents": 2500,
      "status": "succeeded",
      "reason": "requested_by_customer"
    }
  },
  "timestamp": "2024-01-01T11:00:00.000Z"
}

// Response (200 OK) - Full Refund
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid-456",
      "status": "refunded",           // Changed from "succeeded"
      "amountCents": 5000,
      "refundedAmountCents": 5000,    // Full refund
      "organizationId": "org-uuid-789"
    },
    "refund": {
      "id": "refund-uuid",
      "amountCents": 5000,
      "status": "succeeded"
    }
  },
  "timestamp": "2024-01-01T11:00:00.000Z"
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Refund amount exceeds remaining payment amount"
  },
  "timestamp": "2024-01-01T11:00:00.000Z"
}
```

### Service Layer Logic

**Key Methods in `PaymentService`**:

```typescript
// Payment Intent Lifecycle
async createPaymentIntent(
  organizationId: string,
  createDto: CreatePaymentIntentDto
): Promise<{ payment: Payment; clientSecret: string }>
```
- Validates booking exists and belongs to organization
- Creates Stripe payment intent via mock service
- Stores payment record in database
- Returns payment record + client secret for frontend

```typescript
async confirmPayment(
  organizationId: string,
  paymentId: string,
  confirmDto: ConfirmPaymentDto
): Promise<Payment>
```
- Validates payment exists and belongs to organization
- Confirms payment intent via mock service
- Updates payment status (pending → processing → succeeded/failed)
- If succeeded: updates booking status to "confirmed" and sets `depositPaidAt`
- Logs structured payment events

```typescript
async cancelPayment(
  organizationId: string,
  paymentId: string
): Promise<Payment>
```
- Validates payment not already succeeded (only cancel pending payments)
- Cancels payment intent via mock service
- Updates payment status to "failed" with reason "Canceled by user"
- Keeps booking in pending state for rescheduling

```typescript
async refundPayment(
  organizationId: string,
  paymentId: string,
  refundDto: CreateRefundDto
): Promise<{ payment: Payment; refund: Refund }>
```
- Validates payment succeeded (only refund confirmed payments)
- Calculates refund amount (default: full refund)
- Validates refund doesn't exceed remaining balance
- Creates refund via mock service
- Updates payment `refundedAmountCents` and status:
  - If fully refunded: status = "refunded", booking status = "cancelled"
  - If partially refunded: status = "succeeded", tracks cumulative refund
- Logs refund event with ID and amount

```typescript
async findOne(
  organizationId: string,
  paymentId: string
): Promise<Payment>
```
- Retrieves payment with full booking/customer/vehicle detail
- Validates organization isolation
- Returns rich payment context for UI/API consumers

```typescript
async handleWebhook(
  event: string,
  data: any
): Promise<void>
```
- Currently simulated; delegates to StripeMockService
- Future: Process real Stripe webhook events (payment.succeeded, charge.refunded, etc.)

**Transaction Handling**:
- Not currently used; each operation is atomic at the database level
- Future: May need Prisma `$transaction()` for complex multi-step workflows

### Caching Strategy

**Redis Keys** (via `IdempotencyInterceptor`):
- Format: `idempotency:{idempotency-key}`
- Stored: Full HTTP response (status, body, headers)
- TTL: 24 hours
- Scope: Per request; prevents duplicate charges if same request sent twice

**No Feature-Specific Caching**:
- Payment records not cached (always fetch fresh from DB)
- Refund lookups not cached
- Rationale: Payment state changes frequently; stale data could cause refund errors

### Background Jobs / Scheduled Tasks

**None Currently Implemented**

**Future Jobs**:
- `ProcessPendingPayments`: Check for payments stuck in "processing" state (timeout handling)
- `ExpirePaymentIntents`: Cancel intents older than 24 hours (cleanup)
- `PaymentFailureRetry`: Auto-retry failed payments (with exponential backoff)
- `RefundReconciliation`: Daily reconciliation with Stripe for refund status mismatches

## Testing Strategy

### Unit Tests

**Location**: `backend/src/payment/payment.service.spec.ts` (509 lines)

**Coverage**:
- Service methods: `createPaymentIntent`, `confirmPayment`, `cancelPayment`, `refundPayment`, `findOne`
- DTO validation: Invalid amounts, missing booking ID, etc.
- Business logic: Status transitions, multi-tenancy checks, refund limits
- Edge cases: Duplicate confirms, refund exceeding balance, cross-org access

**Key Test Suites**:
```typescript
describe('PaymentService', () => {
  // createPaymentIntent tests
  - ✅ Successfully creates payment intent
  - ✅ Throws NotFoundException for missing booking
  - ✅ Respects organization isolation
  - ✅ Uses booking totalCents if amount not specified
  - ✅ Includes booking/customer/vehicle in response

  // confirmPayment tests
  - ✅ Successfully confirms pending payment
  - ✅ Updates booking to "confirmed" on success
  - ✅ Sets depositPaidAt timestamp
  - ✅ Throws error if payment already succeeded
  - ✅ Handles processing state from mock service
  - ✅ Captures failure reason on failed payment

  // cancelPayment tests
  - ✅ Successfully cancels pending payment
  - ✅ Sets failure reason to "Canceled by user"
  - ✅ Throws error if trying to cancel succeeded payment
  - ✅ Respects organization isolation

  // refundPayment tests
  - ✅ Successfully refunds full amount
  - ✅ Supports partial refunds
  - ✅ Prevents over-refunding
  - ✅ Sets booking to "cancelled" on full refund
  - ✅ Maintains status "succeeded" on partial refund
  - ✅ Throws error for non-succeeded payments
  - ✅ Tracks cumulative refund amount

  // findOne tests
  - ✅ Retrieves payment with booking details
  - ✅ Enforces organization isolation (404 for wrong org)
  - ✅ Returns full customer/vehicle context
})
```

**Run**: `npm run test -- payment.service.spec.ts`

### Integration Tests

**Location**: `backend/src/payment/payment.controller.integration.spec.ts` (425 lines)

**Coverage**:
- Full HTTP request/response cycles (e2e from HTTP layer)
- JWT authentication and authorization
- Input validation (DTOs)
- Response format standardization (success/error envelope)
- HTTP status codes (200, 201, 400, 401, 404, 500)

**Key Test Suites**:
```typescript
describe('PaymentController (Integration)', () => {
  // POST /payments/intents
  - ✅ Returns 200 with valid request
  - ✅ Returns 400 for missing bookingId
  - ✅ Returns 401 without JWT
  - ✅ Returns 404 for non-existent booking

  // GET /payments/intents/:id
  - ✅ Returns 200 with payment details
  - ✅ Returns 404 for non-existent payment
  - ✅ Returns 401 without JWT

  // POST /payments/intents/:id/confirm
  - ✅ Returns 200 and updates status to "succeeded"
  - ✅ Returns 400 if payment already succeeded
  - ✅ Returns 404 if payment doesn't exist
  - ✅ Returns 401 without JWT

  // POST /payments/intents/:id/cancel
  - ✅ Returns 200 and sets status to "failed"
  - ✅ Returns 400 if payment already succeeded
  - ✅ Returns 404 if payment doesn't exist

  // POST /payments/:id/refund
  - ✅ Returns 200 with refund details
  - ✅ Returns 400 if refund exceeds balance
  - ✅ Returns 400 if payment not succeeded
  - ✅ Returns 404 if payment doesn't exist

  // Response Format
  - ✅ All responses have { success, data, timestamp } envelope
  - ✅ Error responses have { success: false, error, timestamp } envelope
})
```

**Run**: `npm run test:integration -- payment`

### E2E Tests

**Location**: `e2e-tests/tests/payment-processing.spec.ts` (planned)

**Coverage**:
- Complete user workflows (customer making payment)
- Booking status transitions
- Refund processing
- UI component interactions

**Planned Test Cases**:
- Customer creates booking → initiates payment → confirms payment
- Booking status updates to "confirmed" in dashboard
- Dealership initiates refund from booking details
- Payment history shows all transactions
- Error handling (invalid card, payment timeout)

**Run**: `cd e2e-tests && npm test -- payment-processing`

### Test Data / Fixtures

**Location**: Test data inline in spec files (no separate fixture file currently)

**Mock Data Pattern**:
```typescript
const mockPayment = {
  id: 'payment-123',
  bookingId: 'booking-123',
  amountCents: 50000,
  currency: 'usd',
  status: 'pending',
  stripePaymentId: 'pi_mock_123',
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBooking = {
  id: 'booking-123',
  totalCents: 50000,
  status: 'pending',
  vehicle: {
    location: { organizationId: 'org-1' }
  },
  customer: { id: 'customer-123', email: 'test@example.com' },
};
```

**Factory Functions** (could be extracted to `src/test/fixtures/payment.fixture.ts`):
```typescript
export const createPayment = (overrides?: Partial<Payment>) => ({
  id: 'payment-' + Math.random().toString(36).substr(2, 9),
  amountCents: 50000,
  status: 'pending',
  ...overrides
});
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` in `backend/src/common/guards/jwt-auth.guard.ts`
- **Token Location**: Authorization header (`Bearer {token}`) or HttpOnly cookie
- **Validation**: JWT strategy extracts user context (id, email, organizationId)
- **Endpoint Protection**: All payment endpoints decorated with `@UseGuards(JwtAuthGuard)`
- **Token Expiry**: 15 minutes for access token; refresh token mechanism for long sessions

### Authorization

- **Organization Isolation**: All queries filter by `organizationId` from JWT token
  ```typescript
  // In service methods:
  if (payment.organizationId !== organizationId) {
    throw new NotFoundException(); // Returns 404, not 403 (security by obscurity)
  }
  ```
- **Role-Based Access** (future enhancement):
  - Create intent: All authenticated users (customers + staff)
  - Confirm payment: Staff only
  - Refund: Manager+ role only
- **Resource-Level Authorization**: Each payment implicitly scoped to user's organization

### Input Validation

- **DTO Classes**: `class-validator` decorators on all DTOs
  ```typescript
  // CreatePaymentIntentDto
  @IsString() bookingId!: string;
  @IsOptional()
  @IsInt()
  @Min(1) amountCents?: number;
  @IsOptional()
  @IsString() currency?: string;
  ```
- **Automatic Validation**: Global `ValidationPipe` in `main.ts` rejects invalid requests with 400 status
- **Sanitization**: No XSS/CSRF concerns (API-only); SQL injection prevented by Prisma ORM
- **File Uploads**: N/A for payment module

### Rate Limiting

- **Global**: 100 requests/minute (via `@nestjs/throttler`)
- **Auth Endpoints**: 5 requests/15 minutes (stricter for login/token endpoints)
- **Payment Endpoints**: Covered by global limit; no payment-specific override currently

### Data Protection

- **No Card Details Stored**: Payment method ID from Stripe is temporary; never persisted
- **No Secrets in Logs**: Client secret returned in response but not logged
- **HTTPS Only**: Production deployments enforce HTTPS (TLS 1.3)
- **Database Encryption**: PostgreSQL at-rest encryption (deployment-level, not app-level)
- **Sensitive Data Logging**: DTO objects logged without sensitive fields (if sensitive fields added, sanitize before logging)

## Performance Optimization

### Database Queries

- **Indexes Used**:
  - `Payment.bookingId` - Direct lookup for GET payment details
  - `Payment.organizationId` - Filter by tenant
  - `Payment.status` - Dashboard queries for pending/succeeded/refunded payments
  - `Payment.stripePaymentId` - Reverse lookup from Stripe ID
- **N+1 Prevention**:
  - `findOne()` includes related booking/customer/vehicle data in single query
  - `confirmPayment()` and `refundPayment()` include booking details
- **Query Optimization**: Prisma generates optimal SQL; indexes used automatically

### Caching

- **Idempotency Cache**: Redis stores full HTTP response for 24 hours
  - Prevents duplicate payment intent creation if frontend retries
  - Significantly reduces payment processing load on network retries
  - Safe for read-only and mutation endpoints
- **No Payment-Specific Cache**: Payment records not cached (state changes frequently)

### Frontend Optimization

- **Code Splitting**: Payment modal could be lazy-loaded (component not yet implemented)
- **React Query**: Mutations for payment operations with automatic refetch on success
- **Memoization**: Payment amount calculations memoized to avoid recalculation

## Monitoring & Observability

### Logging

- **Level**: Info (production), Debug (development)
- **Format**: JSON via Pino logger
- **Key Events Logged**:

```typescript
// In createPaymentIntent:
this.logger.logWithFields('info', 'Creating payment intent', {
  bookingId: createDto.bookingId,
  organizationId,
});

this.logger.logWithFields('info', 'Payment intent created', {
  type: 'payment_event',
  event: 'payment_intent.created',
  paymentId: payment.id,
  bookingId: booking.id,
  amount: amountCents,
});

// In confirmPayment (success):
this.logger.logWithFields('info', 'Payment succeeded', {
  type: 'payment_event',
  event: 'payment.succeeded',
  paymentId: payment.id,
  bookingId: payment.bookingId,
  amount: payment.amountCents,
});

// In confirmPayment (failure):
this.logger.warn('Payment failed', {
  type: 'payment_event',
  event: 'payment.failed',
  paymentId: payment.id,
  reason: paymentIntent.last_payment_error.message,
});

// In refundPayment:
this.logger.logWithFields('info', 'Refund created', {
  type: 'payment_event',
  event: 'payment.refunded',
  paymentId: payment.id,
  refundId: refund.id,
  amount: refundAmountCents,
  isFullyRefunded,
});
```

### Metrics (Future)

- **Latency**: p50, p95, p99 for:
  - POST /payments/intents (create intent)
  - POST /payments/intents/:id/confirm (confirm)
  - POST /payments/:id/refund (refund)
- **Error Rate**: 4xx, 5xx by endpoint (% of requests)
- **Business Metrics**:
  - Payment success rate (succeeded / total)
  - Refund rate (refunded / succeeded)
  - Average payment amount
  - Average refund amount
  - Booking confirmed vs cancelled (impact of payment refunds)

### Alerts (Future)

- **Error Spike**: >10 payment errors/minute
- **Latency**: p99 > 2 seconds for payment endpoints
- **Payment Failures**: >20% failure rate in 5-minute window (fraud/system issue)
- **Refund Spike**: Unusual refund volume (potential mass cancellation)

## Deployment Considerations

### Environment Variables

```bash
# Stripe Mock Configuration (for development)
STRIPE_MOCK_ENABLED=true

# Real Stripe Configuration (future production)
STRIPE_API_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Idempotency Cache (Redis)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
```

### Database Migrations

```bash
# Apply migrations (includes Payment model)
npx prisma migrate deploy

# Rollback (if needed, manually restore from backup)
# No automated rollback; involves database schema reversal
```

### Feature Flags

- **Flag Name**: `payment_enabled`
- **Default**: On (all organizations can use)
- **Rollout Strategy**: Instant (no gradual rollout needed; mock service is safe)
- **Future**: Could add `real_stripe_enabled` to toggle mock vs real Stripe

## Known Technical Debt

- [ ] **No Real Stripe Integration**: StripeMockService insufficient for production; needs real Stripe SDK
- [ ] **No Payment Method Tokenization**: Cannot save cards for future use; one-time payment only
- [ ] **No Webhook Signature Verification**: Mock webhooks not secured; real implementation needs verification
- [ ] **Limited Error Detail**: Generic error messages; real Stripe provides detailed error codes
- [ ] **No Retry Logic**: Failed payments not automatically retried; manual retry UI needed
- [ ] **No Payment Timeline**: Ledger/audit trail of payment state changes not implemented
- [ ] **No Concurrent Payment Handling**: Only one active intent per booking; multiple simultaneous charges blocked (edge case)
- [ ] **No Fraud Detection**: No address verification, CVC checks, or 3D Secure
- [ ] **Refund Reason Enum**: Refund reasons limited; could support more (e.g., "policy_violation")

## Troubleshooting

### Common Issues

**Issue**: "Booking not found" when creating payment
- **Cause**: Invalid booking ID, or booking belongs to different organization
- **Fix**:
  1. Verify booking ID is correct UUID
  2. Verify user's organization matches booking's organization
  3. Check if booking was deleted
- **Prevention**: Frontend validation before API call; UI feedback if booking not found

**Issue**: "Payment already succeeded" error on confirmation
- **Cause**: Payment confirmed twice (network retry or double-submit)
- **Fix**: Idempotency key should prevent this; check if header included
  - If happening repeatedly: Database state corrupted; manual review needed
- **Prevention**: Frontend disables confirm button after submission; idempotency enabled

**Issue**: "Refund amount exceeds remaining payment amount"
- **Cause**: User requested refund larger than (original - already_refunded)
- **Fix**: Calculate remaining balance before refund
  - Remaining = originalAmount - totalRefundedSoFar
  - Validate: requestedRefund <= remaining
- **Prevention**: UI shows remaining refundable amount; blocks over-refunding

**Issue**: Payment status stuck in "processing"
- **Cause**: Webhook update from Stripe didn't arrive (network issue or mock stalled)
- **Fix**: Resubmit confirmation or manually update via admin panel
- **Prevention**: Timeout handling (future job); webhook retry logic

**Issue**: Cross-tenant payment access (shouldn't happen, but security check)
- **Cause**: JWT organizationId doesn't match payment's organizationId
- **Fix**: Returns 404 (payment appears not found)
- **Prevention**: Database queries always filter by organizationId; no bypasses

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check payment records directly
cd backend
npx prisma studio
# Navigate to Payment model, filter by bookingId or status

# Test payment creation manually
curl -X POST http://localhost:3001/api/v1/payments/intents \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"bookingId":"booking-uuid","amountCents":5000}'

# Check Redis idempotency cache
redis-cli
> KEYS idempotency:*
> GET idempotency:{specific-key}
```

## Development Workflow

### Adding New Payment Functionality

1. Update Prisma schema (if new fields needed) → `npx prisma generate`
2. Create migration → `npx prisma migrate dev --name [description]`
3. Create/update DTO classes in `dto/` folder
4. Add method to `PaymentService` with business logic
5. Add controller endpoint calling service method
6. Write unit tests (test service logic in isolation)
7. Write integration tests (test HTTP request/response)
8. Add E2E test (test user workflow in browser)
9. Update API documentation
10. Update this technical documentation

### Example: Adding Payment Metadata Field

```bash
# 1. Update schema
# In backend/prisma/schema.prisma, add to Payment model:
# metadata Json?

# 2. Create migration
cd backend
npx prisma migrate dev --name add_payment_metadata
# Generates migration file in backend/prisma/migrations/

# 3. Create DTO (if user-provided metadata)
# backend/src/payment/dto/create-payment-intent.dto.ts:
# @IsOptional()
# @IsObject() metadata?: Record<string, any>;

# 4. Update service
# backend/src/payment/payment.service.ts - store metadata in createPaymentIntent:
# data: { ..., metadata: createDto.metadata }

# 5. Test
npm run test -- payment.service.spec.ts
npm run test:integration -- payment

# 6. Deploy
npx prisma migrate deploy  # In production
```

### Local Testing

```bash
# Backend - Unit + Integration tests
cd backend
npm run test -- payment   # Run payment tests
npm run test:cov -- payment  # With coverage

# Backend - Start dev server for manual testing
npm run start:dev
# API available at http://localhost:3001/api/v1/payments

# Frontend - Start dev server
cd frontend
npm run dev
# Navigate to http://localhost:3000/booking/[id]/checkout

# E2E - Run Playwright tests
cd e2e-tests
npm test -- payment-processing
npm run test:headed -- payment-processing  # See browser
npm run test:debug -- payment-processing   # Step through

# Manual API testing with curl
curl http://localhost:3001/api/v1/payments/intents/payment-id \
  -H "Authorization: Bearer {token}"
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md) - Payment model details
- [API Standards](../../api/standards.md) - Response format, error handling, pagination
- [Testing Guide](../../testing/) - Unit, integration, E2E patterns
- [Prisma Schema](../../../backend/prisma/schema.prisma) - Complete schema definition
- [Stripe Mock Service](../../../backend/src/stripe-mock/stripe-mock.service.ts) - Payment processing simulation
- [JWT Authentication](../../../backend/src/auth/strategies/jwt.strategy.ts) - Token validation
- [Idempotency Implementation](../../api/idempotency.md) - Request deduplication

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/payment/payment.service.ts` (495 lines)
  - `createPaymentIntent()` - Line 25-118
  - `confirmPayment()` - Line 123-247
  - `cancelPayment()` - Line 252-315
  - `refundPayment()` - Line 320-423
  - `findOne()` - Line 429-481
  - `handleWebhook()` - Line 486-494

- Backend Controller: `backend/src/payment/payment.controller.ts` (99 lines)
  - Route definitions and auth guard

- Frontend Component: `frontend/app/(customer)/booking/[id]/checkout/page.tsx` (to be created)

- Tests: `backend/src/payment/payment.*.spec.ts` (934 lines total)

## Architecture Decision Records (ADRs)

### ADR-1: Use Mock Stripe Service for Development

- **Date**: 2024-12-28
- **Context**: Need payment processing without real Stripe account or PCI compliance for early development
- **Decision**: Implement `StripeMockService` that simulates Stripe API locally
- **Consequences**:
  - Pros: No PCI concerns, fast iteration, no API keys to manage
  - Cons: Not production-ready, limited error cases, webhook mocking incomplete
- **Future**: Replace with real Stripe SDK when ready for production

### ADR-2: Store Amounts in Cents (Integer)

- **Date**: 2024-12-28
- **Context**: Floating-point arithmetic is imprecise for money; need to avoid rounding errors
- **Decision**: All monetary amounts stored as integers in cents (e.g., $50.00 = 5000)
- **Consequences**:
  - Pros: Exact arithmetic, prevents rounding errors, matches Stripe convention
  - Cons: Frontend must convert from user input (dollars) to cents for API
- **Implementation**: DTO validation ensures `amountCents` is integer with `@IsInt()`

### ADR-3: Idempotency via Redis Cache

- **Date**: 2024-12-28
- **Context**: Payment creation could be duplicated if network retries occur
- **Decision**: Use `IdempotencyInterceptor` to cache full responses for 24 hours based on `Idempotency-Key` header
- **Consequences**:
  - Pros: Prevents duplicate charges, transparent to service logic, industry-standard approach
  - Cons: Requires Redis, adds memory usage, cache misses not handled gracefully
- **Implementation**: Global interceptor in `main.ts`; frontend includes `Idempotency-Key` header auto-generated

### ADR-4: Organization Isolation via Database Filtering

- **Date**: 2024-12-28
- **Context**: Multi-tenant system needs strict data isolation between organizations
- **Decision**: Every query filters by `organizationId` at service layer; return 404 for cross-tenant access
- **Consequences**:
  - Pros: Simple, database-level enforcement possible, standard multi-tenant pattern
  - Cons: No 403 Forbidden (confusing security posture), assumes JWT organizationId is trustworthy
- **Implementation**: All service methods check `payment.organizationId !== organizationId` and throw NotFoundException

---

**Last Technical Review**: 2024-12-28
**Reviewer**: Backend Team
