# Booking System

> **Status**: ✅ Production
> **Owner**: FleetPass Engineering
> **Last Updated**: 2025-12-28

## Overview

The Booking System enables dealership managers to create, manage, and track vehicle rental bookings. It handles the complete lifecycle of a rental from creation through completion, including availability checking, pricing calculations, deposit tracking, and status workflow management.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to create a new booking so that I can reserve a vehicle for a customer.**

- Select a customer and vehicle
- Choose pickup and dropoff locations and dates
- Review calculated pricing and deposit
- Confirm the booking

**As a dealership manager, I want to track booking status so that I can monitor the rental lifecycle.**

- View all bookings with filtering by status, customer, vehicle, and date range
- Transition bookings through the workflow (pending → confirmed → active → completed)
- Cancel bookings when needed

**As a dealership manager, I want to manage booking dates and pricing so that I can adjust reservations.**

- Update pickup/dropoff dates while respecting vehicle availability
- Modify deposit amounts
- Add notes for special instructions

### Supported Workflows

1. **Create New Booking**
   - Step 1: Navigate to Create Booking page
   - Step 2: Select customer, vehicle, locations, and dates
   - Step 3: System validates availability and calculates pricing
   - Step 4: Booking is created in "pending" status with unique booking number

2. **Confirm Pending Booking**
   - Step 1: View pending booking details
   - Step 2: Click confirm to move to "confirmed" status
   - Step 3: Booking is locked for the selected dates

3. **Activate Confirmed Booking**
   - Step 1: When customer arrives, activate the booking
   - Step 2: Status changes to "active"
   - Step 3: Vehicle is considered in-use for the rental period

4. **Complete Active Booking**
   - Step 1: When customer returns vehicle, mark as complete
   - Step 2: Status changes to "completed"
   - Step 3: Vehicle is returned to available inventory

5. **Cancel Booking**
   - Step 1: From pending or confirmed status, initiate cancellation
   - Step 2: Status changes to "cancelled"
   - Step 3: Dates are released for other bookings

## Business Rules

### Validations

- **Pickup before dropoff**: Pickup datetime must be strictly before dropoff datetime
- **Future dates**: Bookings must be for current or future dates
- **Vehicle availability**: Vehicle must be available for rent and have no conflicting bookings for the requested date range
- **Customer exists**: Customer must exist in the system and belong to the dealership organization
- **Locations exist**: Both pickup and dropoff locations must be valid dealership locations
- **Date boundaries**: Bookings with pending/confirmed/active status block availability for other bookings

### Constraints

- **Status workflow**: Status transitions follow strict rules:
  - `pending` → can transition to `confirmed` or `cancelled`
  - `confirmed` → can transition to `active` or `cancelled`
  - `active` → can only transition to `completed`
  - `completed` → terminal state (no further transitions)
  - `cancelled` → terminal state (no further transitions)
- **Unique booking numbers**: Each booking gets a unique identifier in format `BP-YYYY-NNNNNN` (e.g., `BP-2024-000001`)
- **Pricing immutability**: Daily rate is captured at booking creation and remains fixed
- **Deposit default**: If not specified, deposit defaults to $100.00 (10,000 cents)
- **Tax rate**: Currently set to 0% for simplicity
- **Duration calculation**: Rental days are calculated using ceiling division (partial days count as full days)

### Permissions

- **Who can access**: Authenticated users within the dealership organization
- **Access level**: Read/Write for bookings within their organization
- **Multi-tenant isolation**: Each organization can only view and manage their own bookings. Database queries are automatically filtered by `organizationId` to prevent cross-organization data access.

## User Interface

### Key Screens/Components

**Bookings List Page**
- **Location**: `/bookings`
- **Purpose**: View all bookings with filtering and search capabilities
- **Key Actions**:
  - Create new booking
  - Search by booking number, customer name, or vehicle
  - Filter by status (pending, confirmed, active, completed, cancelled)
  - Filter by customer and vehicle
  - Filter by pickup date range
  - Sort by different columns
  - Toggle between grid and list view
  - Click to view booking details

**Create Booking Page**
- **Location**: `/bookings/new`
- **Purpose**: Create a new rental booking
- **Key Actions**:
  - Select customer from dropdown
  - Select vehicle from available inventory
  - Choose pickup location
  - Choose dropoff location
  - Set pickup datetime
  - Set dropoff datetime
  - Optionally specify custom deposit amount
  - Add notes for special instructions
  - Submit to create booking

**Booking Details Page**
- **Location**: `/bookings/[id]`
- **Purpose**: View and manage individual booking
- **Key Actions**:
  - View complete booking information
  - View pricing breakdown (daily rate, number of days, subtotal, tax, total)
  - View deposit information
  - Update booking (dates, notes, etc.)
  - Confirm booking (pending → confirmed)
  - Activate booking (confirmed → active)
  - Complete booking (active → completed)
  - Cancel booking (pending/confirmed → cancelled)
  - View associated customer and vehicle details

### Components

**BookingCard**
- Displays booking summary in grid view
- Shows booking number, customer name, vehicle, dates, status badge
- Clickable to navigate to booking details

**BookingFilters**
- Advanced search and filtering controls
- Search by booking number, customer, or vehicle
- Filter by status, customer, vehicle, location, date range
- Sort options with ascending/descending toggle

**BookingForm**
- Reusable form component for create and update
- Handles form submission and validation
- Displays calculated pricing in real-time

**BookingStatusBadge**
- Color-coded status indicator
- Visual feedback for booking state
- Used throughout the UI for quick status recognition

## Data Model

### Key Entities

**Booking**
- **Fields**:
  - `bookingNumber` (String, unique): Format `BP-YYYY-NNNNNN`, auto-generated
  - `customerId` (String): Reference to the customer
  - `vehicleId` (String): Reference to the rented vehicle
  - `pickupLocationId` (String): Reference to pickup dealership location
  - `dropoffLocationId` (String): Reference to dropoff dealership location
  - `pickupDatetime` (DateTime): When the rental starts
  - `dropoffDatetime` (DateTime): When the rental ends
  - `dailyRateCents` (Int): Rental rate per day in cents (e.g., 5000 = $50.00)
  - `numDays` (Int): Calculated number of days (ceiling)
  - `subtotalCents` (Int): dailyRateCents × numDays
  - `taxCents` (Int): Calculated tax (currently 0%)
  - `totalCents` (Int): subtotalCents + taxCents
  - `depositCents` (Int): Security deposit amount in cents
  - `depositPaidAt` (DateTime, optional): Timestamp when deposit was paid
  - `mockStripePaymentIntentId` (String, optional): Mock payment identifier
  - `status` (String): One of pending, confirmed, active, completed, cancelled
  - `notes` (String, optional): Special instructions or comments
  - `createdById` (String, optional): User who created the booking
  - `organizationId` (String): For multi-tenant isolation
  - `createdAt` (DateTime): Created timestamp
  - `updatedAt` (DateTime): Last updated timestamp

- **Relationships**:
  - Belongs to `Organization`
  - Belongs to `Customer` (cascade delete)
  - Belongs to `Vehicle` (cascade delete)
  - Belongs to `Location` (pickup, restrict delete)
  - Belongs to `Location` (dropoff, restrict delete)
  - Belongs to `User` (creator, optional)
  - Has many `Payment` records

- **Indexes** (for performance optimization):
  - `(organizationId)` - Multi-tenant filtering
  - `(customerId)` - Customer booking history
  - `(vehicleId)` - Vehicle booking history
  - `(status)` - Status-based queries
  - `(pickupDatetime, dropoffDatetime)` - Date range queries
  - `(vehicleId, pickupDatetime, dropoffDatetime)` - Critical for availability checks (composite index)
  - `(status, pickupDatetime)` - Status with date range filtering

## Integration Points

### Internal Dependencies

- **Vehicle Management**: Validates vehicle exists, is available for rent, and retrieves daily rate for pricing
- **Customer Management**: Validates customer exists and belongs to the organization
- **Location Management**: Validates pickup and dropoff locations exist
- **Payment System**: Associates bookings with payment records for deposit tracking
- **User Management**: Records which user created the booking

### External Services

- **Mock Stripe Payment**: Stores payment intent IDs for future payment integration (currently mocked)

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| Pickup date must be before dropoff date | User selected pickup date after or equal to dropoff date | Form validation error | Correct the date order |
| Vehicle is not available for the requested dates | Another booking exists for the same vehicle during the period | Booking creation fails | Choose different dates or vehicle |
| Customer not found | Selected customer does not exist or belongs to different organization | Form validation error | Select a valid customer |
| Vehicle not found | Selected vehicle does not exist or belongs to different organization | Form validation error | Select a valid vehicle |
| Pickup location not found | Selected location does not exist | Form validation error | Select a valid location |
| Cannot confirm booking with status 'X' | Booking is not in pending status | Status transition fails | Only pending bookings can be confirmed |
| Cannot activate booking with status 'X' | Booking is not in confirmed status | Status transition fails | Only confirmed bookings can be activated |
| Cannot complete booking with status 'X' | Booking is not in active status | Status transition fails | Only active bookings can be completed |
| Cannot cancel booking with status 'X' | Booking is not in pending or confirmed status | Cancellation fails | Only pending/confirmed bookings can be cancelled |

### Edge Cases

- **Booking number generation**: If two bookings are created simultaneously, the system uses database sequence ordering to ensure unique booking numbers in the format `BP-YYYY-NNNNNN`
- **Date range boundary matching**: Availability checking handles edge cases where:
  - One booking starts exactly when another ends (considered available)
  - Bookings that perfectly overlap other bookings (correctly identified as conflicts)
  - Bookings that encompass other bookings (correctly identified as conflicts)
- **Partial day rentals**: If a customer picks up at 10 AM and drops off at 2 PM the same day, it counts as 1 full day
- **Long rental periods**: Multi-week or multi-month rentals correctly calculate pricing and days
- **Same location pickups/dropoffs**: Pickup and dropoff can be the same location (no restrictions)
- **Deleted vehicles/locations**: Cascade delete rules prevent deletion of locations with active bookings but allow cascade deletion if the parent organization is deleted

## Testing

### Test Coverage

- ✅ **Unit Tests** (445 lines): `backend/src/booking/booking.service.spec.ts`
  - Booking creation with various scenarios
  - Pricing calculations
  - Availability checking logic
  - Status transitions
  - Date validation
  - Entity lookup validation

- ✅ **Integration Tests** (384 lines): `backend/src/booking/booking.controller.integration.spec.ts`
  - Full HTTP request/response cycles
  - Authentication and authorization
  - Error handling (400, 401, 403, 404, 409, 500)
  - Request validation and field validation
  - Response format standardization

- ✅ **E2E Tests**: `e2e-tests/tests/bookings/booking-crud.spec.ts` and `booking-date-validation.spec.ts`
  - Complete user workflows from UI
  - Booking creation through completion
  - Date conflict validation
  - Multi-step booking lifecycle

### Manual Testing Checklist

- [ ] Create booking with minimum required fields
- [ ] Create booking with custom deposit amount
- [ ] Attempt to create booking with past dates (should fail)
- [ ] Attempt to create booking with dates in wrong order (should fail)
- [ ] Create overlapping bookings for same vehicle (second should fail)
- [ ] Create bookings at different vehicles (both should succeed)
- [ ] Update booking dates to new available window
- [ ] Attempt to update booking dates to conflicting window (should fail)
- [ ] View booking list with no filters
- [ ] Filter bookings by status
- [ ] Filter bookings by date range
- [ ] Search bookings by booking number
- [ ] Search bookings by customer name
- [ ] Search bookings by vehicle (make/model)
- [ ] Confirm pending booking
- [ ] Attempt to confirm already confirmed booking (should fail)
- [ ] Activate confirmed booking
- [ ] Complete active booking
- [ ] Cancel pending booking
- [ ] Cancel confirmed booking
- [ ] Attempt to cancel completed booking (should fail)
- [ ] Update notes on existing booking
- [ ] View detailed booking information with customer/vehicle details
- [ ] Verify pricing calculation: (daily rate × days) + tax

## Performance Considerations

- **Expected Load**: 100+ bookings per organization, with peaks during booking windows
- **Optimization**:
  - Composite index on `(vehicleId, pickupDatetime, dropoffDatetime)` optimizes availability checks (most frequent query)
  - Index on `(status, pickupDatetime)` optimizes status-based date range queries
  - Pagination (default limit: 10, configurable) prevents loading large datasets
  - Database transactions for consistent pricing calculations
- **Limits**:
  - Pagination limit: 10 bookings per page (default), max 100
  - Search is case-insensitive but requires explicit term matching
  - No hard limit on booking duration
  - Rate limiting: 100 requests/minute globally, 5 requests/15 minutes for auth endpoints

## Security Considerations

- **Authentication**: JWT via `JwtAuthGuard` - all endpoints require valid authentication
- **Authorization**:
  - Multi-tenant isolation via `organizationId` in JWT
  - All database queries filtered by organization automatically
  - Cannot access bookings from other organizations even with a valid token
- **Data Protection**:
  - Deposit payment information captured but not stored directly (mock intent IDs only)
  - Customer PII visible only within organization context
  - Audit trail via `createdById` and `createdAt` fields
- **Vulnerabilities Addressed**:
  - SQL Injection: Prisma ORM with parameterized queries
  - XSS: Response data is structured JSON, not HTML
  - CSRF: Idempotency keys on POST/PATCH/DELETE prevent duplicate bookings
  - Date validation: Strict date comparison prevents past-date bookings
  - Rate limiting: Prevents brute force attacks and booking spam

## Known Limitations

- **Tax calculation**: Currently hardcoded to 0% tax rate. Real-world implementation should fetch tax rates based on location
- **Payment integration**: Mock Stripe integration only. Real payment processing not yet implemented
- **Location mismatch validation**: Pickup and dropoff locations are references but not validated to be within the same dealership network
- **Customer KYC status**: No check that customer has completed KYC before booking. Should integrate with Customer KYC module
- **Vehicle insurance/maintenance**: No validation of vehicle insurance or maintenance status before booking
- **Overbooking prevention**: Relies on database state; no locking mechanism for true concurrent booking prevention
- **Dynamic pricing**: Daily rate is static per vehicle; no surge pricing or discount logic
- **Fuel/mileage tracking**: No integration with vehicle condition/mileage at pickup/dropoff

## Future Enhancements

- Implement real Stripe payment processing for deposit collection
- Add dynamic pricing based on demand and season
- Integrate with Customer KYC module to prevent booking before verification
- Add fuel/mileage tracking and damage assessment at pickup/dropoff
- Implement email notifications for booking lifecycle events
- Add extension workflow to allow extending rental periods
- Support partial/daily rate overrides per booking
- Add booking cancellation policies with refund rules
- Integrate with vehicle maintenance schedules to block availability
- Add revenue reporting and analytics dashboard
- Support customer self-service booking portal
- Add booking approval workflow for high-value rentals

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Documentation](../../api/endpoints.md#booking-system)
- [Vehicle Management](../vehicle-system/README.md)
- [Customer Management](../customer-system/README.md)
- [Payment System](../payment-system/README.md)
- [Location Management](../location-system/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-28 | Initial comprehensive documentation | FleetPass Engineering |
