# Payment Processing

> **Status**: Production
> **Owner**: Backend Team
> **Last Updated**: 2024-12-28

## Overview

Payment Processing is a mock Stripe integration system that simulates payment intent creation, confirmation, and refunds for bookings in the FleetPass platform. It enables dealerships to collect deposits and payments from customers with a secure, idempotent, and transaction-aware payment pipeline.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to collect payment deposits from customers so that I can confirm bookings and mitigate no-show risk.**

**As a customer, I want to securely authorize payment for my vehicle rental so that I can complete my booking.**

**As a dealership, I want to refund payments when customers cancel so that I maintain customer trust and comply with refund policies.**

### Supported Workflows

1. **Payment Intent Creation**
   - Step 1: Customer initiates checkout for a booking
   - Step 2: System creates a payment intent linked to the booking
   - Step 3: Client receives payment intent ID and client secret
   - Step 4: Frontend captures payment details from customer

2. **Payment Confirmation**
   - Step 1: Customer submits payment details with payment method ID
   - Step 2: System confirms the payment intent with the payment processor
   - Step 3: Payment status updates (pending → processing → succeeded/failed)
   - Step 4: If successful, booking status changes to "confirmed" and deposit is marked as paid

3. **Payment Cancellation (Pre-Confirmation)**
   - Step 1: Customer cancels before confirming payment (within timeout window)
   - Step 2: System cancels the payment intent
   - Step 3: Payment status changes to "failed" with reason "Canceled by user"
   - Step 4: Booking remains in pending status for rescheduling

4. **Full/Partial Refunds (Post-Confirmation)**
   - Step 1: Dealership initiates refund for succeeded payment (e.g., customer cancellation)
   - Step 2: System validates refund amount does not exceed paid amount
   - Step 3: Refund is processed and recorded
   - Step 4: If fully refunded, booking status changes to "cancelled"
   - Step 5: Customer receives refund notification

## Business Rules

### Validations

- **Booking Must Exist**: Payment intent creation requires a valid, existing booking ID
- **Amount Validation**: Payment amount must be >= 1 cent and <= booking's total amount
- **Currency Support**: Defaults to USD; other currencies accepted but backend mocks all as USD
- **Status Transitions**:
  - Pending → Processing/Failed/Succeeded (on confirm)
  - Succeeded → Refunded (full refund) or Succeeded (partial refund)
  - Cannot cancel payments already succeeded (use refund instead)
  - Cannot refund non-succeeded payments
- **Refund Limits**: Total refunded amount cannot exceed original payment amount
- **Single Payment Per Booking**: Only one active payment intent per booking at a time

### Constraints

- **Multi-Tenancy**: Payments are strictly isolated by organization ID; cross-organization access is blocked
- **Idempotency**: All payment mutations are idempotent via `Idempotency-Key` header (24h Redis cache)
- **Amounts in Cents**: All monetary values stored as integers in cents (e.g., $50.00 = 5000 cents)
- **Mock Service**: Uses in-memory StripeMockService, not real Stripe API (for testing/demo only)
- **No Card Storage**: Payment method details not persisted; only payment intent ID tracked

### Permissions

- **Who can access**: Authenticated dealership users (admins, managers, sales agents) and customers
- **Access level**:
  - Create/Confirm/Cancel: Dealership staff
  - Refund: Dealership staff with manager+ role (future enhancement)
  - Get Details: Staff only (customer cannot view payment details directly)
- **Multi-tenant isolation**: All queries filtered by user's `organizationId` from JWT token

## User Interface

### Key Screens/Components

**Payment Checkout Modal** (Customer-Facing)
- **Location**: `/booking/[id]/checkout` or modal overlay
- **Purpose**: Collect payment details and confirm payment
- **Key Actions**:
  - Enter card details (payment method)
  - Confirm payment (submit)
  - Cancel and go back to booking

**Payment Status Card** (Booking Details)
- **Location**: `/booking/[id]/details` or dashboard widget
- **Purpose**: Display payment status and deposit info
- **Key Actions**:
  - View payment history
  - Initiate refund (if succeeded)

**Payment History Tab** (Booking Management)
- **Location**: `/bookings/[id]/payments`
- **Purpose**: Show all payment events and refunds
- **Key Actions**:
  - View payment timeline
  - Process refunds with reason
  - Download payment receipt

### User Flow Diagram

```
Customer Initiates Booking
        ↓
[Create Payment Intent] → Generate Intent ID & Client Secret
        ↓
Customer Enters Payment Details
        ↓
[Confirm Payment] ← Customer Submits Payment Method
        ↓
Payment Processing (Mock Stripe)
        ↓
    ┌─────┴─────┐
    ↓           ↓
Succeeded    Failed
    ↓           ↓
Update      Retry or
Booking     Cancel
Status
```

## Data Model

### Key Entities

**Payment**
- **Fields**:
  - `id` (UUID): Unique payment record identifier
  - `bookingId` (string): Foreign key to booking
  - `amountCents` (integer): Payment amount in cents
  - `currency` (string): ISO currency code (default: "usd")
  - `status` (string): pending | processing | succeeded | failed | refunded
  - `stripePaymentId` (string): Mock Stripe payment intent ID
  - `stripeCustomerId` (string, optional): Mock Stripe customer ID
  - `paymentMethod` (string, optional): "card", "bank_transfer", etc.
  - `failureReason` (string, optional): Why payment failed (if failed)
  - `refundedAmountCents` (integer, optional): Total refunded amount
  - `organizationId` (string): Tenant isolation
  - `createdAt` (timestamp): When payment was created
  - `updatedAt` (timestamp): Last update timestamp

- **Relationships**:
  - Belongs to `Booking` (1:1)
  - Belongs to `Organization` (N:1) - for multi-tenancy

**Booking (Related)**
- **Key Payment Fields**:
  - `depositCents` (integer): Required deposit amount
  - `depositPaidAt` (timestamp): When deposit was confirmed (set on payment success)
  - `status` (string): Updated to "confirmed" when payment succeeds

## Integration Points

### Internal Dependencies

- **Booking Module**: Payment is tied to bookings; validates booking exists and belongs to correct organization
- **Organization Module**: All payments scoped by organization for multi-tenant isolation
- **Authentication**: JWT-protected endpoints; user's `organizationId` used for authorization

### External Services

- **StripeMockService** (in-process mock): Simulates Stripe payment intents, confirmations, and refunds
  - Not a real API call; all in-memory state
  - Used for development, testing, and demonstrations
  - Response format matches Stripe API schema

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| "Booking not found" (404) | Invalid booking ID or cross-tenant access attempt | Payment creation fails silently | Verify booking exists and user belongs to correct organization |
| "Payment already succeeded" (400) | Attempting to confirm an already-confirmed payment | User sees validation error | Check payment status before retrying; payment is already complete |
| "Cannot cancel succeeded payment. Use refund instead." (400) | User tries to cancel after payment succeeded | Cancellation blocked | Switch to refund workflow instead |
| "Can only refund succeeded payments" (400) | Attempting refund on failed/pending payment | Refund rejected | Only available after payment successfully completes |
| "Refund amount exceeds remaining payment amount" (400) | Refund amount > (original - already_refunded) | Refund rejected | Reduce refund amount or request full refund |
| "Payment not found" (404) | Invalid payment ID or cross-tenant access | Payment details not accessible | Verify payment ID and user's organization |

### Edge Cases

- **Concurrent Payment Requests**: Idempotency key prevents duplicate payment intents if same request sent twice
- **Booking Totals Change**: If booking amount changes (e.g., discount applied) after intent created, system uses original amount
- **Full Refund Logic**: Once fully refunded (total refunded = original amount), payment status becomes "refunded" and booking moves to "cancelled"
- **Partial Refunds**: Multiple partial refunds on same payment are supported; status remains "succeeded" until fully refunded
- **Payment Timeout**: No explicit timeout in mock service; real Stripe integration would need handling of expired intents
- **Cross-Organization Access**: All queries/mutations return 404 if payment doesn't belong to user's organization (security by obscurity)

## Testing

### Test Coverage

- **Unit Tests**: `backend/src/payment/payment.service.spec.ts` (509 lines)
  - Service method logic: payment creation, confirmation, cancellation, refunds
  - DTO validation
  - Multi-tenancy isolation checks
  - Edge case handling (failed payments, refund limits, etc.)

- **Integration Tests**: `backend/src/payment/payment.controller.integration.spec.ts` (425 lines)
  - Full HTTP request/response cycles
  - Authentication/authorization guards
  - Response format validation
  - Error handling (400, 401, 404, 500)

- **E2E Tests**: `e2e-tests/tests/booking-payment.spec.ts` (planned)
  - Customer payment flow through UI
  - Payment status updates in booking dashboard
  - Refund process

### Manual Testing Checklist

- [ ] Create payment intent for valid booking
- [ ] Retrieve payment intent details
- [ ] Confirm payment with valid payment method ID
- [ ] Attempt to confirm already-succeeded payment (should fail)
- [ ] Cancel pending payment before confirmation
- [ ] Attempt to cancel succeeded payment (should fail)
- [ ] Full refund on succeeded payment (booking should move to cancelled)
- [ ] Partial refund followed by another partial refund
- [ ] Attempt refund exceeding remaining balance (should fail)
- [ ] Cross-organization access attempt (should return 404)
- [ ] Duplicate payment intent (idempotency key should return same result)

## Performance Considerations

- **Expected Load**: Payments created at booking confirmation time; refunds processed asynchronously during cancellation workflows
- **Optimization**:
  - Indexes on `bookingId`, `organizationId`, `status`, `stripePaymentId` for quick lookup
  - Idempotency cache (Redis) prevents duplicate processing within 24 hours
  - No N+1 queries; booking and customer data included in single query
- **Limits**:
  - Global rate limit: 100 req/min (via `@nestjs/throttler`)
  - No payment-specific limits (can process as many as needed within global limit)
  - Refund amount validation prevents over-refunding at DB level

## Security Considerations

- **Authentication**: JWT via `JwtAuthGuard`; all endpoints require valid token with organization context
- **Authorization**:
  - User's `organizationId` from JWT used to filter payments
  - Cannot access/modify payments from other organizations (404 response)
  - Refund operations future-proofed for role-based access (manager+ only)
- **Data Protection**:
  - No sensitive payment data (card details, tokens) stored in database
  - Only Stripe payment intent IDs and customer IDs tracked (non-sensitive)
  - Passwords, tokens hashed before storage (handled by auth module)
- **Vulnerabilities Addressed**:
  - **OWASP A01 (Broken Access Control)**: Organization isolation enforced on all queries
  - **OWASP A04 (Insecure Input)**: All inputs validated via DTOs (class-validator)
  - **OWASP A05 (Broken Authentication)**: JWT-protected; secure refresh token flow
  - **SQL Injection**: Prisma ORM parameterization prevents injection attacks
  - **Idempotency**: Prevents duplicate charges from network retries

## Known Limitations

- **Mock Stripe Service**: Not production-ready; for development/testing only
  - No real card processing
  - No authentication via Stripe (all requests succeed in mock)
  - In-memory state lost on app restart
  - No webhook signature verification

- **No Real Card Validation**: Payment method ID not validated against real payment networks

- **No Customer Payment Method Storage**: Cannot save card for future use (one-time payment only)

- **Limited Currency Support**: Mocked as all USD; real multi-currency support requires Stripe API

- **No 3D Secure/2FA**: Mock skips all fraud detection and 2FA flows

## Future Enhancements

- **Real Stripe Integration**: Replace StripeMockService with actual Stripe API client
- **Recurring Billing**: Support subscription payments for long-term rentals
- **Payment Method Tokenization**: Store customer payment methods securely for future use
- **Advanced Fraud Detection**: Integrate Stripe Radar for fraud prevention
- **Multi-Currency**: Real support for EUR, GBP, AUD, etc. with exchange rates
- **Webhook Events**: Real-time payment status updates from Stripe webhooks
- **Payment Analytics**: Dashboard showing revenue, refund rates, failure rates by location
- **ACH/Bank Transfer**: Support alternative payment methods beyond cards
- **Split Payments**: Allow deposits + final payment on different dates
- **Payment Plans**: Installment payment plans for larger rentals

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Documentation](../../api/endpoints.md#payment-processing)
- [Booking Feature](../booking/README.md)
- [Stripe Mock Service](../../backend/src/stripe-mock/)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-28 | Initial payment processing documentation | Backend Team |
