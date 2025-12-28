# Customer Management

> **Status**: ✅ Production
> **Owner**: Development Team
> **Last Updated**: 2025-12-28

## Overview

Customer Management enables dealership administrators to create, maintain, and track customer profiles with integrated KYC (Know Your Customer) verification. This feature provides a centralized database of all customers, tracks their booking history, manages identity verification status, and supports deal tracking and lead conversion workflows.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to create and manage customer profiles so that I can track who is renting vehicles and their rental history.**

- Add new customers with name, contact information, and driver's license details
- View customer profiles with complete rental and deal history
- Update customer information (contact details, license info) without disrupting their records
- Search and filter customers by name, email, phone, license number, or KYC status
- Delete customer records (only if no active bookings exist)

**As a compliance officer, I want to verify customer identities through KYC so that the dealership meets legal requirements.**

- Track KYC verification status (pending, in_progress, approved, rejected)
- Mark customers as verified after KYC checks
- Filter customers by KYC status for compliance reporting
- View when each customer was verified and by whom

**As a sales agent, I want to see customer details and their booking history so that I can provide personalized service and upsell.**

- View customer's previous rental history (last 5 bookings with vehicle details)
- See aggregate statistics (total bookings, leads, deals associated with customer)
- Quick access to customer details when creating new bookings
- Link customers to leads and deals in the sales pipeline

### Supported Workflows

1. **Customer Onboarding**
   - Step 1: Sales agent collects customer information (name, email, phone, date of birth)
   - Step 2: System validates email uniqueness within organization and phone format
   - Step 3: Driver's license information captured and stored
   - Step 4: Customer profile created with "pending" KYC status
   - Outcome: Customer can now book vehicles; KYC verification required before rental completion

2. **KYC Verification Workflow**
   - Step 1: Compliance officer reviews customer profile with pending KYC
   - Step 2: Officer initiates KYC verification process (via Persona integration)
   - Step 3: System marks customer as "in_progress" for KYC
   - Step 4: After verification completes, status updated to "approved" or "rejected"
   - Step 5: System records verification timestamp and inquiry ID
   - Outcome: Customer can proceed with bookings (if approved) or is flagged for alternative verification (if rejected)

3. **Customer Information Update**
   - Step 1: Sales agent or customer requests profile update
   - Step 2: System validates new email is unique (if changed)
   - Step 3: All fields updated except KYC status (managed separately)
   - Step 4: Update timestamp recorded
   - Outcome: Customer profile reflects latest information

4. **Booking History Retrieval**
   - Step 1: Sales agent views customer detail page
   - Step 2: System displays last 5 bookings in reverse chronological order
   - Step 3: Each booking shows vehicle details (make, model, year, VIN)
   - Step 4: Aggregate counts show total bookings, leads, deals
   - Outcome: Agent has full customer context for sales and service decisions

5. **Customer Deletion**
   - Step 1: Admin initiates customer deletion
   - Step 2: System checks for active bookings (pending, confirmed, active status)
   - Step 3: If active bookings exist, deletion is blocked with clear message
   - Step 4: Only customers with no active bookings can be deleted
   - Step 5: All associated historical data is preserved in bookings/deals/leads
   - Outcome: Customer record safely removed without data loss

## Business Rules

### Validations

- **Email Format**: Must be valid email address (RFC 5322 compliant)
- **Email Uniqueness**: Email must be unique per organization (composite key: organizationId + email)
- **Phone Format**: If provided, must match international format: `+?1?\d{10,14}` (optional `+` prefix, optional `1` country code, 10-14 digits)
- **Driver's License Expiry**: If provided, system validates it's a valid date (no check that it's in the future during entry - business choice)
- **Name Fields**: First name and last name required; must be non-empty strings
- **Date of Birth**: Must be valid ISO 8601 date string if provided

### Constraints

- **Email Uniqueness per Organization**: Same email cannot be used twice within one organization (multi-tenant isolation)
- **Phone Uniqueness**: Phone number is not globally unique (same person can have one record per organization, useful for sales tracking)
- **Active Booking Protection**: Customers cannot be deleted if they have active bookings in "pending", "confirmed", or "active" status
- **KYC Status Transitions**: KYC status can move from any state to "approved" or "rejected" (verified via `/customers/:id/kyc` endpoint)
- **Booking History Window**: Only last 5 bookings are loaded in customer detail (for performance); full history available through booking list endpoint
- **Payment Integration**: Mock Stripe customer ID stored but not enforced for booking completion (payment module integration point)

### Permissions

- **Who can access**: Authenticated dealership users (any role with JWT token)
- **Access level**: Read/Write for own organization; no cross-organization visibility
- **Multi-tenant isolation**: All queries automatically filtered by `organizationId` from authenticated user's JWT token. A user cannot access customers from other organizations even if they somehow obtain another organization's customer ID
- **Role-based actions**:
  - All authenticated users can list, view, and create customers
  - Delete operations available to all authenticated users (age-appropriate in real system)
  - KYC status updates available to compliance/manager roles (enforced at business logic level)

## User Interface

### Key Screens/Components

**Customer List Page** (`/customers`)
- **Location**: `frontend/app/(dealer)/customers/page.tsx`
- **Purpose**: View all customers with filtering and search
- **Key Actions**:
  - Add new customer button
  - Search by name, email, phone, license number
  - Filter by KYC status (pending, in_progress, approved, rejected)
  - Sort by creation date, first name, last name, or email
  - View customer count with pagination (10 per page default)
  - Click row to view customer detail

**Customer Form** (`/customers/new` and `/customers/:id/edit`)
- **Location**: `frontend/app/(dealer)/customers/new/page.tsx`, `frontend/app/(dealer)/customers/[id]/edit/page.tsx`
- **Purpose**: Create or edit customer information
- **Key Actions**:
  - Enter first name, last name, email
  - Enter phone number (with format validation)
  - Enter date of birth
  - Enter driver's license number, state, expiry date
  - Submit to create/update
  - Cancel to return to list or detail page
  - Form validation shows errors inline

**Customer Detail Page** (`/customers/:id`)
- **Location**: `frontend/app/(dealer)/customers/[id]/page.tsx`
- **Purpose**: View complete customer profile with history
- **Key Actions**:
  - View all customer information (read-only view)
  - Edit customer info (button to `/edit` route)
  - View KYC status badge (visual indicator: pending/in_progress/approved/rejected)
  - View booking history (last 5 bookings with vehicle details)
  - View aggregate counts (total bookings, leads, deals)
  - Delete customer (if no active bookings)
  - Initiate KYC verification (link to KYC wizard)

**KYC Wizard Page** (`/customers/:id/kyc`)
- **Location**: `frontend/app/(dealer)/customers/[id]/kyc/page.tsx`
- **Purpose**: Manage KYC verification process
- **Key Actions**:
  - Display current KYC status
  - Show KYC verification timeline
  - Upload document images (front, back of license, selfie)
  - Submit to Persona for verification
  - View verification result (approved/rejected)
  - Update KYC status in system
  - Display verification timestamp

**Customer Card Component** (`CustomerCard.tsx`)
- **Location**: `frontend/components/features/customers/CustomerCard.tsx`
- **Purpose**: Display customer summary in list view
- **Key Info**: Name, email, phone, KYC status badge, booking count

**Customer Filters Component** (`CustomerFilters.tsx`)
- **Location**: `frontend/components/features/customers/CustomerFilters.tsx`
- **Purpose**: Provide search and filter controls
- **Controls**: Search box, KYC status filter, sort dropdown

**KYC Status Badge Component** (`KYCStatusBadge.tsx`)
- **Location**: `frontend/components/features/customers/KYCStatusBadge.tsx`
- **Purpose**: Visual indicator of KYC verification status
- **Display**: Color-coded badge showing pending/in_progress/approved/rejected

**Booking History Component** (`CustomerBookingHistory.tsx`)
- **Location**: `frontend/components/features/customers/CustomerBookingHistory.tsx`
- **Purpose**: Show last 5 bookings with vehicle details
- **Display**: Booking date range, vehicle info, booking status

### User Flow Diagram

```
[Dealership Manager]
         ↓
[Customers List] ← search/filter by KYC status, name, email
    ↙           ↘
[Create New]   [View Detail]
   ↓               ↓
[Customer Form] ← [Edit]
   ↓               ↓
[Save/Validate] [KYC Wizard]
   ↓               ↓
[Detail Page] ← [Update Status]
   ↓
[Booking History + Aggregate Counts]
   ↓
[Create Booking or Deal]
```

## Data Model

### Key Entities

**Customer**
- **Fields**:
  - `id` (string, CUID): Unique identifier
  - `organizationId` (string): Foreign key to Organization
  - `email` (string): Customer email address (unique per organization)
  - `phone` (string, optional): Phone number in international format
  - `firstName` (string): Customer first name
  - `lastName` (string): Customer last name
  - `dateOfBirth` (datetime, optional): Customer date of birth
  - `driverLicenseNumber` (string, optional): State driver's license number
  - `driverLicenseState` (string, optional): State code (e.g., "CA", "NY")
  - `driverLicenseExpiry` (datetime, optional): License expiration date
  - `kycStatus` (string): "pending", "in_progress", "approved", "rejected" (default: "pending")
  - `kycInquiryId` (string, optional): Reference to Persona inquiry
  - `kycVerifiedAt` (datetime, optional): When KYC verification completed (set when approved)
  - `stripeCustomerId` (string, optional): Mock Stripe customer ID for payment module
  - `createdAt` (datetime): Record creation timestamp
  - `updatedAt` (datetime): Last modification timestamp

- **Relationships**:
  - Belongs to `Organization` (organizationId foreign key)
  - Has many `Bookings` (one customer can have multiple bookings)
  - Has many `Leads` (one customer can have multiple leads in sales pipeline)
  - Has many `Deals` (one customer can have multiple deals)

- **Unique Constraints**:
  - `(organizationId, email)` - Email must be unique within organization

- **Indexes**:
  - `organizationId` - Multi-tenant filtering (all queries)
  - `kycStatus` - Quick filtering for compliance/verification workflows
  - `phone` - Fast lookup by phone for support and customer verification calls

## Integration Points

### Internal Dependencies

- **Booking Service**: Customer detail page displays last 5 bookings; booking creation requires valid customer. Booking deletion cascades related data.
- **Lead Service**: Customers can be linked to leads in the sales pipeline; lead conversion may create customer record
- **Deal Service**: Customers can have multiple deals; deal closure is tracked separately
- **KYC Service**: Customer KYC status integration with mock Persona service (not fully implemented, ready for real service integration)
- **Payment Service**: Mock Stripe integration; `stripeCustomerId` field available for booking payment processing

### External Services

- **Persona KYC (Mock)**: Customer sends `kycInquiryId` when verification initiated; system awaits callback/status update (currently mocked)
- **Stripe (Mock)**: `stripeCustomerId` stored for payment processing during booking (currently mocked, ready for integration)

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| 409 Conflict - Email already exists | Attempting to create or update to email already in use within organization | Form rejected, user sees error message | Provide unique email address |
| 404 Not Found | Accessing customer ID that doesn't exist or belongs to different organization | Blank page or redirect to list | Verify correct customer ID or access authorized customers only |
| 400 Bad Request - Invalid phone format | Phone number doesn't match required format | Form validation error on phone field | Use format: +14155551234 (with optional +, 10-14 digits) |
| 400 Bad Request - Invalid email format | Email doesn't match RFC 5322 standard | Form validation error on email field | Provide valid email (e.g., user@example.com) |
| 400 Bad Request - Cannot delete customer | Customer has active bookings (pending, confirmed, or active) | Delete operation blocked with explanatory message | Cancel or complete active bookings first, then retry delete |
| 500 Internal Server Error | Database connection failure or unexpected error | Generic error message with timestamp | Check server logs, retry operation |

### Edge Cases

- **Email Update with Conflict**: When updating customer email to one that already exists, system checks uniqueness before update and rejects with 409 Conflict
- **Phone Format Variations**: System accepts `+14155551234`, `14155551234`, and `4155551234` formats (all valid per regex); stores as provided
- **License Expiry in Past**: System does not validate that driver's license hasn't expired during customer creation (stored as-is); validation should happen at booking time
- **Deleted Organization Cascade**: When organization is deleted, all customers cascade-deleted along with bookings, leads, deals (data loss by design)
- **Scoped Customer Lookup**: If user from Organization A somehow knows customer ID from Organization B, `getScopedCustomer()` prevents unauthorized access by validating organizationId match before returning
- **Concurrent Email Updates**: If two requests simultaneously update customer to same new email, database unique constraint ensures only one succeeds; other gets 409 Conflict
- **KYC Status Without Verification**: User can manually set KYC status to "approved" without actual Persona verification (mock system; real system would integrate properly)
- **Partial Phone Numbers**: Phone field is optional; if provided but invalid format, validation fails

## Testing

### Test Coverage

- ✅ **Unit Tests**: `backend/src/customer/customer.service.spec.ts` (649 lines)
  - Service method unit tests covering create, update, findAll, findOne, remove, updateKycStatus
  - Error case handling (ConflictException, NotFoundException, BadRequestException)
  - Email uniqueness validation
  - Multi-tenant isolation via getScopedCustomer
  - Scoped queries ensuring organizationId filtering

- ✅ **Integration Tests**: `backend/src/customer/customer.controller.integration.spec.ts` (743 lines)
  - Full HTTP request/response cycle testing
  - All 6 API endpoints (POST, GET list, GET detail, PATCH, DELETE, PATCH /kyc)
  - Database interactions with real Prisma queries
  - Authentication (JwtAuthGuard) enforcement
  - Authorization (multi-tenant isolation)
  - Error responses (400, 401, 403, 404, 409, 500)
  - Pagination and filtering
  - KYC status update flow

- ✅ **E2E Tests**:
  - `e2e-tests/tests/customers/customer-crud.spec.ts` (330 lines) - Create, read, update, list, delete workflows
  - `e2e-tests/tests/customers/customer-form-validation.spec.ts` (205 lines) - Form validation and error messages
  - `e2e-tests/tests/customers/kyc-workflow.spec.ts` (347 lines) - KYC verification end-to-end flow

### Manual Testing Checklist

- [ ] Create customer with minimum required fields (firstName, lastName, email)
- [ ] Create customer with all optional fields (phone, DOB, license info)
- [ ] Verify email validation accepts valid emails and rejects invalid format
- [ ] Verify email uniqueness - attempt to create duplicate email in same organization
- [ ] Verify phone format validation (optional, accepts +1, 10-14 digits)
- [ ] Edit customer and update various fields
- [ ] Verify email conflict when updating to existing email
- [ ] View customer detail page - check booking history and aggregate counts
- [ ] Search customers by first name, last name, email, phone, license number
- [ ] Filter customers by KYC status (pending, in_progress, approved, rejected)
- [ ] Sort customers by createdAt, firstName, lastName, email
- [ ] Update KYC status from pending to in_progress
- [ ] Update KYC status from in_progress to approved (sets kycVerifiedAt timestamp)
- [ ] Update KYC status from in_progress to rejected
- [ ] Delete customer with no active bookings - should succeed
- [ ] Delete customer with active bookings - should fail with clear message
- [ ] Verify multi-tenant isolation - customer from Org A cannot be accessed by user from Org B
- [ ] Test pagination - list customers with page and limit parameters

## Performance Considerations

- **Expected Load**: Typical dealership with 100-10,000 customers; peak load during business hours with concurrent browsing and search
- **Optimization**:
  - **Index on phone**: Enables fast lookup for support calls ("customer lookup by phone")
  - **Index on kycStatus**: Quick filtering for compliance reports
  - **Composite index (organizationId, email)**: Ensures unique constraint check is fast
  - **Pagination**: Default 10 per page; findAll uses transaction for count + items in single operation
  - **Booking history window**: Only last 5 bookings loaded to prevent large result sets
  - **Aggregate counts**: Using Prisma `_count` to avoid N+1 queries for booking/lead/deal counts

- **Limits**:
  - **Pagination limit**: Min 1, no maximum enforced in code (business decision)
  - **Search fields**: Searches 5 fields (firstName, lastName, email, phone, driverLicenseNumber) case-insensitive
  - **Booking history**: Limited to 5 most recent bookings in detail view
  - **List page default**: 10 customers per page

## Security Considerations

- **Authentication**: JWT token required via `JwtAuthGuard` on all endpoints; user identity extracted from token
- **Authorization**:
  - Multi-tenant isolation enforced via organizationId matching in JWT vs. customer record
  - `getScopedCustomer()` method validates ownership before returning any customer data
  - User cannot access customers from other organizations even with direct ID

- **Data Protection**:
  - Driver's license information stored as-is (no encryption in current implementation)
  - Date of birth stored as-is (no special protection)
  - Email and phone stored as-is (no hashing - they are lookup fields)
  - Suggestion: Consider encryption for sensitive fields (DOB, license number) in production

- **Vulnerabilities Addressed**:
  - **SQL Injection**: Prevented via Prisma's parameterized queries
  - **Authorization Bypass**: Prevented via scoped customer lookup and organizationId validation
  - **XSS**: Form inputs validated via class-validator DTOs
  - **Unique constraint bypass**: Database-level unique constraint on (organizationId, email) prevents race conditions
  - **Rate Limiting**: Global rate limiting 100 req/min applied via @nestjs/throttler

## Known Limitations

- **KYC Integration**: Persona KYC service integration is mocked; real verification flow not implemented (ready for integration)
- **Stripe Integration**: Stripe customer ID field exists but payment integration is mocked (ready for integration)
- **Booking History Limit**: Only last 5 bookings shown in detail page; full history not accessible from UI (available via booking list API)
- **Phone Uniqueness**: Phone is not globally unique - same person can have one customer record per organization (may lead to duplicates across regions)
- **License Expiry Validation**: Driver's license expiry date not validated at customer creation (should be validated at booking time)
- **No Soft Deletes**: Customer deletion is permanent (no archive/soft delete option for compliance)
- **Email Format Validation**: Basic RFC 5322 validation; doesn't verify domain exists or email is deliverable

## Future Enhancements

- **Real KYC Integration**: Replace mock Persona integration with live API calls for document verification
- **Stripe Payment Integration**: Implement actual payment processing for booking deposits using stripeCustomerId
- **Email Verification**: Add email confirmation workflow to verify customer email address is valid
- **Phone Verification**: Optional SMS verification to confirm phone number
- **Customer Segments**: Add ability to tag/segment customers (VIP, frequent renter, first-time, etc.)
- **Communication History**: Track emails, SMS, and calls to customers
- **Duplicate Detection**: Alert when creating customers with similar names/emails (prevent accidental duplicates)
- **Soft Deletes**: Archive customers instead of permanent deletion for audit trail
- **Customer Import**: Bulk import customers from CSV/Excel
- **Customer Portal**: Self-service portal for customers to update their own profiles
- **Audit Logging**: Track who modified customer records and when (for compliance)

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Documentation](../../api/endpoints.md#customer-management)
- [Booking Feature](../booking-management/README.md)
- [KYC Integration](../../integrations/kyc.md)
- [Payment Integration](../payment-processing/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-28 | Initial documentation | Claude |
