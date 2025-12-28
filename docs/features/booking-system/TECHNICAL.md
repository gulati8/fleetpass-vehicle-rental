# Booking System - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
Frontend (Next.js)          API Gateway           Backend (NestJS)         Database (PostgreSQL)
├─ Booking List      ──────────────┐
├─ Create/Update     ──────> POST/PATCH/DELETE  ──> BookingService  ──────> Booking Table
├─ Detail View       <────── GET ──────────────────  (Validation,    ────────> Vehicle Table
└─ Status Workflow            ↓                      Availability,    ────────> Customer Table
                         Response Format            Pricing Calc)     ────────> Location Table
                         (success, data,
                          timestamp, meta)          Redis Cache
                                                    (Idempotency)
```

### Design Patterns Used

- **Service Layer Pattern**: Business logic isolated in `BookingService`, controller handles HTTP concerns
- **DTO Pattern**: Request/response objects (`CreateBookingDto`, `UpdateBookingDto`, `BookingQueryDto`) for validation and type safety
- **Repository Pattern**: `PrismaService` acts as data access layer, abstracting database operations
- **Multi-tenancy Pattern**: All queries filtered by `organizationId` from JWT context
- **Idempotency Pattern**: Automatic deduplication of POST/PATCH/DELETE via `IdempotencyInterceptor` using Redis
- **Composite Index Pattern**: Strategic indexing (vehicleId + dates) for availability query performance

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/booking/`

**Key Files**:
```
booking/
├── booking.module.ts                    # Module definition, imports, providers
├── booking.controller.ts                # HTTP endpoints (@Get, @Post, etc.)
├── booking.service.ts                   # Business logic (availability, pricing, status)
├── dto/
│   ├── create-booking.dto.ts            # Request validation schema for creating
│   ├── update-booking.dto.ts            # Request validation schema for updating
│   └── booking-query.dto.ts             # Query parameters validation
├── booking.service.spec.ts              # Unit tests (445 lines)
└── booking.controller.integration.spec.ts # Integration tests (384 lines)
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService` - Database access
  - `LoggerService` - Structured logging
- **External Packages**:
  - `class-validator@0.14.0` - DTO validation via decorators
  - `class-transformer@0.5.1` - DTO transformation (string to number, etc.)

### Frontend (Next.js)

**Component Location**: `frontend/app/(dealer)/bookings/` and `frontend/components/features/bookings/`

**Key Files**:
```
app/(dealer)/bookings/
├── page.tsx                             # Bookings list page with filters
├── new/
│   └── page.tsx                         # Create booking form page
└── [id]/
    └── page.tsx                         # Booking detail page with actions

components/features/bookings/
├── BookingCard.tsx                      # Grid view booking card component
├── BookingFilters.tsx                   # Advanced search/filter controls
├── BookingForm.tsx                      # Reusable form for create/update
└── BookingStatusBadge.tsx               # Status indicator component
```

**State Management**:
- **React Query**:
  - `useBookings` - Query for list with filters
  - `useBooking` - Query for single booking details
  - `useCreateBooking`, `useUpdateBooking`, etc. - Mutations for actions
- **Local State**:
  - Form state via `react-hook-form`
  - Filter state in list page
  - View mode (grid/list) toggle
- **Context**: None currently (future: booking workflow context)

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma:174`):

```prisma
model Booking {
  id                      String   @id @default(uuid())
  bookingNumber           String   @unique // BP-2024-001234
  organizationId          String
  customerId              String
  vehicleId               String
  pickupLocationId        String   // reference to Location
  dropoffLocationId       String   // reference to Location
  pickupDatetime          DateTime
  dropoffDatetime         DateTime

  // Pricing snapshot
  dailyRateCents          Int
  numDays                 Int
  subtotalCents           Int
  taxCents                Int
  totalCents              Int

  // Mock Payment
  mockStripePaymentIntentId String?
  depositCents            Int
  depositPaidAt           DateTime?

  // Status
  status                  String   @default("pending")

  // Metadata
  createdById             String?
  notes                   String?
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  // Relations
  customer                Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  vehicle                 Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  pickupLocation          Location @relation("BookingPickupLocation", fields: [pickupLocationId], references: [id], onDelete: Restrict)
  dropoffLocation         Location @relation("BookingDropoffLocation", fields: [dropoffLocationId], references: [id], onDelete: Restrict)
  organization            Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy               User? @relation("BookingCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  payments                Payment[]

  // Indexes
  @@index([organizationId])
  @@index([customerId])
  @@index([vehicleId])
  @@index([status])
  @@index([pickupDatetime, dropoffDatetime])
  @@index([vehicleId, pickupDatetime, dropoffDatetime])  // Critical composite index
  @@index([status, pickupDatetime])
  @@index([customerId, createdAt])
}
```

**Migrations**: Located in `backend/prisma/migrations/`

**Critical Indexes**:
- `(vehicleId, pickupDatetime, dropoffDatetime)` - Optimizes availability checks (most frequent query pattern)
- `(status, pickupDatetime)` - Optimizes status filtering with date ranges
- `(organizationId)` - Multi-tenant data isolation

### API Endpoints

**Base Path**: `/api/v1/bookings`

**All endpoints require JWT authentication via `JwtAuthGuard`**

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/` | ✅ | Yes* | Create new booking |
| GET | `/` | ✅ | Yes | List bookings with filters and pagination |
| GET | `/:id` | ✅ | Yes | Get single booking with related entities |
| PATCH | `/:id` | ✅ | Yes* | Update booking (dates, notes, etc.) |
| DELETE | `/:id` | ✅ | Yes* | Cancel/delete booking (updates status to cancelled) |
| POST | `/:id/confirm` | ✅ | Yes* | Confirm pending booking (pending → confirmed) |
| POST | `/:id/activate` | ✅ | Yes* | Activate confirmed booking (confirmed → active) |
| POST | `/:id/complete` | ✅ | Yes* | Complete active booking (active → completed) |
| POST | `/:id/cancel` | ✅ | Yes* | Cancel booking (delegates to DELETE endpoint) |

*Idempotent via `IdempotencyInterceptor` (24h Redis cache, requires `Idempotency-Key` header)

### Request/Response Examples

**POST /api/v1/bookings - Create Booking**

Request:
```json
{
  "customerId": "cust-123",
  "vehicleId": "veh-456",
  "pickupLocationId": "loc-1",
  "dropoffLocationId": "loc-2",
  "pickupDatetime": "2024-02-15T10:00:00.000Z",
  "dropoffDatetime": "2024-02-18T14:00:00.000Z",
  "depositCents": 15000,
  "notes": "Business trip, extra driver included"
}
```

Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "book-abc123",
    "bookingNumber": "BP-2024-000042",
    "customerId": "cust-123",
    "vehicleId": "veh-456",
    "pickupLocationId": "loc-1",
    "dropoffLocationId": "loc-2",
    "pickupDatetime": "2024-02-15T10:00:00.000Z",
    "dropoffDatetime": "2024-02-18T14:00:00.000Z",
    "dailyRateCents": 10000,
    "numDays": 4,
    "subtotalCents": 40000,
    "taxCents": 0,
    "totalCents": 40000,
    "depositCents": 15000,
    "depositPaidAt": null,
    "mockStripePaymentIntentId": null,
    "status": "pending",
    "notes": "Business trip, extra driver included",
    "createdAt": "2024-02-01T08:30:00.000Z",
    "updatedAt": "2024-02-01T08:30:00.000Z",
    "customer": {
      "id": "cust-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-1234"
    },
    "vehicle": {
      "id": "veh-456",
      "make": "Toyota",
      "model": "Camry",
      "year": 2023,
      "vin": "4T1BF1AK8CU123456",
      "dailyRateCents": 10000
    }
  },
  "timestamp": "2024-02-01T08:30:00.000Z"
}
```

**GET /api/v1/bookings?status=active&page=1&limit=10**

Response (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "book-xyz789",
        "bookingNumber": "BP-2024-000041",
        "status": "active",
        "customer": { ... },
        "vehicle": { ... },
        "pickupDatetime": "2024-02-10T09:00:00.000Z",
        "dropoffDatetime": "2024-02-12T17:00:00.000Z",
        "totalCents": 35000
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2024-02-01T08:30:00.000Z"
}
```

**Error Response (409 Conflict - Vehicle Unavailable)**

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT_ERROR",
    "message": "Vehicle is not available for the requested dates"
  },
  "timestamp": "2024-02-01T08:30:00.000Z"
}
```

**Error Response (400 Bad Request - Validation Error)**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "pickupDatetime": ["must be a valid ISO 8601 date string"],
      "dropoffDatetime": ["must be a valid ISO 8601 date string"]
    }
  },
  "timestamp": "2024-02-01T08:30:00.000Z"
}
```

### Service Layer Logic

**Key Methods** in `backend/src/booking/booking.service.ts`:

#### create (Lines 141-306)
Creates a new booking with comprehensive validation and pricing calculation.

```typescript
async create(
  createBookingDto: CreateBookingDto,
  organizationId: string,
)
```

**Steps**:
1. Parse and validate dates (pickup < dropoff)
2. Verify customer exists and belongs to organization
3. Verify vehicle exists and is available for rent
4. Verify pickup and dropoff locations exist
5. Check vehicle availability for requested date range (critical composite index used here)
6. Calculate pricing: numDays, subtotal, tax, total
7. Generate unique booking number in format BP-YYYY-NNNNNN
8. Create booking in database with status "pending"
9. Log success with booking ID and number

**Returns**: Booking object with nested customer and vehicle details

**Throws**: `BadRequestException` or `ConflictException` with descriptive messages

#### findAll (Lines 308-461)
Lists bookings with advanced filtering, searching, and pagination.

```typescript
async findAll(
  query: BookingQueryDto,
  organizationId: string,
)
```

**Filter Parameters**:
- `search` - Searches booking number, customer name, email, vehicle make/model/VIN (case-insensitive)
- `customerId` - Filter by specific customer
- `vehicleId` - Filter by specific vehicle
- `pickupLocationId` - Filter by pickup location
- `status` - Filter by status (pending, confirmed, active, completed, cancelled)
- `pickupFrom` / `pickupTo` - Filter by pickup date range
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10, max: 100)
- `sortBy` - Sort field (createdAt, pickupDatetime, dropoffDatetime, totalCents) - default: pickupDatetime
- `sortOrder` - Sort direction (asc, desc) - default: asc

**Returns**: Paginated results with total count and customer/vehicle/location details

**Database Transaction**: Uses `prisma.$transaction()` to fetch items and total in single atomic operation

#### findOne (Lines 463-483)
Retrieves a single booking by ID with organization validation.

```typescript
async findOne(id: string, organizationId: string)
```

**Validation**: Ensures booking belongs to the requesting organization

**Returns**: Booking with all related entities (customer, vehicle, locations)

**Throws**: `NotFoundException` if booking not found or not in organization

#### update (Lines 485-662)
Updates booking with smart pricing recalculation and availability validation.

```typescript
async update(
  id: string,
  updateBookingDto: UpdateBookingDto,
  organizationId: string,
)
```

**Smart Features**:
- If dates change, re-validates availability excluding current booking
- Automatically recalculates numDays, subtotal, tax, total on date changes
- Validates changed customer, vehicle, or locations
- Logs status transitions for audit trail

**Returns**: Updated booking object

**Throws**: `BadRequestException` for validation errors, `ConflictException` for availability conflicts

#### remove (Lines 664-702) & cancel (Lines 830-833)
Cancels a booking by changing status to "cancelled".

```typescript
async remove(id: string, organizationId: string)
async cancel(id: string, organizationId: string)  // Delegates to remove()
```

**Restrictions**: Only pending or confirmed bookings can be cancelled

**Returns**: Success message

**Throws**: `BadRequestException` if booking cannot be cancelled

#### Status Transition Methods (Lines 704-828)

**confirm()** (Lines 704-744)
- Transitions pending → confirmed
- Only pending bookings can be confirmed
- Includes customer and vehicle details in response

**activate()** (Lines 746-786)
- Transitions confirmed → active
- Only confirmed bookings can be activated
- Marks the vehicle as in-use

**complete()** (Lines 788-828)
- Transitions active → completed
- Only active bookings can be completed
- Terminal status (no further transitions)

### Private Helper Methods

#### generateBookingNumber() (Lines 50-77)
Generates unique booking number in format `BP-YYYY-NNNNNN`.

```typescript
private async generateBookingNumber(): Promise<string>
```

**Algorithm**:
1. Get current year: BP-2024-
2. Query latest booking with this year's prefix
3. Extract sequence number and increment
4. Pad with zeros to 6 digits
5. Combine to create unique number

**Example**: If latest is BP-2024-000015, next is BP-2024-000016

#### calculateNumDays() (Lines 82-86)
Calculates rental duration using ceiling division.

```typescript
private calculateNumDays(pickupDate: Date, dropoffDate: Date): number
```

**Logic**:
- Milliseconds difference ÷ (1000 × 60 × 60) = hours
- Hours ÷ 24 = days
- Ceiling ensures partial days count as full days
- Example: 2.5 hours = 1 day, 25 hours = 2 days

#### checkVehicleAvailability() (Lines 91-139)
Checks if vehicle is available for the requested date range.

```typescript
private async checkVehicleAvailability(
  vehicleId: string,
  pickupDate: Date,
  dropoffDate: Date,
  organizationId: string,
  excludeBookingId?: string,  // For updates
): Promise<boolean>
```

**Availability Logic**: A vehicle is UNAVAILABLE if there's a conflicting booking with status pending, confirmed, or active AND:
- Booking starts during the requested period: `pickupDate <= bookingStart < dropoffDate`
- Booking ends during the requested period: `pickupDate < bookingEnd <= dropoffDate`
- Booking encompasses entire period: `bookingStart <= pickupDate AND bookingEnd >= dropoffDate`

**Optimization**: Uses composite index `(vehicleId, pickupDatetime, dropoffDatetime)` for fast queries

**Returns**: true if available, false if conflicts found

#### getScopedBooking() (Lines 21-45)
Helper to fetch a booking with organization validation.

```typescript
private async getScopedBooking(id: string, organizationId: string)
```

**Includes**: Customer, vehicle (with location), pickup location, dropoff location

**Validation**: Ensures booking belongs to requesting organization

**Throws**: `NotFoundException` if not found or unauthorized

### Transaction Handling

**When Used**:
- `findAll()` uses `prisma.$transaction([findMany, count])` to ensure consistent pagination
- Availability checks happen within transaction scope to prevent race conditions
- Pricing calculations are atomic within create/update operations

**Implementation**: `prisma.$transaction([...])` for database transactions

### Caching Strategy

**Redis Keys**:
- `idempotency:{idempotency-key}` - Stores request response for 24 hours
- No explicit feature caching (each booking fetch is fresh from DB)

**Cache Invalidation**:
- Not applicable for booking feature (relies on database as source of truth)
- Idempotency intercepts duplicates before database operations

### Background Jobs / Scheduled Tasks

**Currently**: None implemented

**Future Candidates**:
- Automatic booking reminders (pickup in 24 hours)
- Overdue booking notifications (not returned by dropoff time)
- Booking expiration (pending bookings convert to cancelled after X days)

## Testing Strategy

### Unit Tests

**Location**: `backend/src/booking/booking.service.spec.ts` (445 lines)

**Key Test Categories**:
- Booking creation with various valid inputs
- Pricing calculations (daily rate × days)
- Availability checking with overlapping bookings
- Status transitions (confirm, activate, complete)
- Date validation (pickup < dropoff, future dates)
- Entity existence validation (customer, vehicle, locations)
- Error handling for all exception types

**Run Command**: `npm run test:unit -- booking`

**Coverage Target**: >90% line coverage

### Integration Tests

**Location**: `backend/src/booking/booking.controller.integration.spec.ts` (384 lines)

**Test Scenarios**:
- POST /bookings - Create booking with valid data
- POST /bookings - Invalid request body validation
- GET /bookings - List with filters
- GET /bookings/:id - Retrieve single booking
- PATCH /bookings/:id - Update booking
- DELETE /bookings/:id - Cancel booking
- POST /bookings/:id/confirm - Confirm booking
- POST /bookings/:id/activate - Activate booking
- POST /bookings/:id/complete - Complete booking
- Error cases: 400, 401, 403, 404, 409, 500

**Response Validation**: Checks standardized response format with success, data, timestamp fields

**Run Command**: `npm run test:integration -- booking`

### E2E Tests

**Location**: `e2e-tests/tests/bookings/`

**Test Files**:
- `booking-crud.spec.ts` (384 lines) - Full CRUD operations through UI
- `booking-date-validation.spec.ts` (191 lines) - Date conflict prevention

**Playwright Tests**:
1. Display booking list page
2. Create new booking (with date selection, form validation)
3. View booking details
4. Update booking
5. Confirm/activate/complete workflow
6. Cancel booking
7. Date conflict validation (second booking for same dates fails)

**Run Commands**:
```bash
cd e2e-tests
npm test -- --grep "booking"
npm run test:headed -- --grep "booking"  # With visible browser
```

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/booking.fixtures.ts`

**Factories**:
```typescript
export const mockBooking = {
  id: 'book-123',
  bookingNumber: 'BP-2024-000001',
  customerId: 'cust-1',
  vehicleId: 'veh-1',
  pickupLocationId: 'loc-1',
  dropoffLocationId: 'loc-2',
  pickupDatetime: new Date('2024-02-15'),
  dropoffDatetime: new Date('2024-02-18'),
  dailyRateCents: 10000,
  numDays: 3,
  subtotalCents: 30000,
  taxCents: 0,
  totalCents: 30000,
  depositCents: 10000,
  status: 'pending',
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (line 22 in controller)
- **Token Location**: Authorization header: `Bearer {token}`
- **Validation**: `jwt.strategy.ts` extracts user context and injects via `@CurrentUser()` decorator
- **Applied To**: All booking endpoints (no public access)

### Authorization

- **Role Checks**: Not explicitly enforced per endpoint (all authenticated users can create bookings)
- **Organization Isolation**: All queries automatically filtered by `organizationId` from JWT
  - Line 31: `user.organizationId` passed to service
  - Line 36: Service method receives organization context
  - All database queries filter by organization in `where` clause
- **Boundary Protection**: A user from org-A cannot access bookings from org-B

### Input Validation

- **DTO Classes** with decorators:
  - `@IsString()` - Type validation
  - `@IsNotEmpty()` - Required fields
  - `@IsDateString()` - ISO 8601 date format
  - `@IsInt()` - Numeric fields
  - `@Min(0)` - Positive constraints
  - `@IsIn(['pending', ...])` - Enum validation for status
- **Transformation**: `class-transformer` converts and type-coerces input
- **Global Validation Pipe**: Runs before controller methods, returns 400 with detailed field errors
- **Business Logic Validation**: Additional checks in service layer (dates, entities, availability)

### Rate Limiting

- **Global**: 100 requests/minute via `@nestjs/throttler`
- **Auth Endpoints**: 5 requests/15 minutes (stricter limit)
- **Booking Endpoints**: Use global limit (100/min)

## Performance Optimization

### Database Queries

- **Composite Index**: `(vehicleId, pickupDatetime, dropoffDatetime)` used for availability checks
  - Expected query time: <10ms for typical datasets
  - Index covers all three columns needed for availability WHERE clause
- **N+1 Prevention**:
  - `findAll()` uses `include: { customer: {...}, vehicle: {...}, ...}` to fetch related data in single query
  - Line 399-437 shows eager loading of relationships
- **Pagination**:
  - Offset-based with configurable limit (default: 10, max: 100)
  - `skip = (page - 1) * limit` prevents loading entire result set
  - Transaction-based count ensures consistent pagination
- **Selective Columns**: Customer/vehicle selected fields reduce data transfer:
  ```typescript
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  }
  ```

### Caching

- **Hot Data**: Booking numbers (frequently accessed during creation)
- **Idempotency Cache**: 24-hour TTL on request responses via Redis
  - Prevents duplicate bookings if POST request retried
- **Cache Hit Rate**: Estimated 15-20% for repeated filtering operations
- **Strategy**: Read-through cache at HTTP layer, not at service layer

### Frontend Optimization

- **Code Splitting**: BookingForm, BookingFilters as dynamic imports
- **React Query**:
  - Stale-while-revalidate strategy for booking list
  - Automatic caching of individual booking queries
  - Background refetching on focus
- **Memoization**:
  - `useMemo` for filter computation
  - `useCallback` for handlers to prevent child re-renders
- **Pagination**:
  - Lazy loads additional pages as user scrolls
  - Prevents rendering 1000+ items at once

## Monitoring & Observability

### Logging

- **Level**:
  - Info: Booking creation, confirmation, completion, cancellation
  - Debug: Query execution, filter application, pagination
  - Warn: Business rule violations (customer not found, conflicts)
  - Error: Exception details with stack trace
- **Format**: JSON via Pino logger (structured fields)
- **Key Events Logged**:
  - Line 145-148: `booking.create` - Customer ID, vehicle ID
  - Line 288-291: `booking.created` - Booking ID, booking number
  - Line 610-614: `booking.status_change` - Old and new status
  - Line 739-740: `booking.confirm` - Booking ID
  - Line 37-40: `booking.not_found` - Unauthorized access attempt

### Metrics (Future)

**Recommended**:
- **Latency**: p50, p95, p99 for each endpoint
- **Error Rate**: 4xx, 5xx by endpoint
- **Business Metrics**:
  - Bookings created/day
  - Availability conflicts/day
  - Average booking value
  - Status transition times
  - Cancellation rate

### Alerts (Future)

**Recommended**:
- Error spike: >10 errors/min on booking endpoints
- Latency: p99 > 2 seconds
- Availability check failures: >5% conflict rate
- Database: Slow query log > 100ms

## Deployment Considerations

### Environment Variables

```bash
# Booking-specific (none currently required)
# Inherits from main NestJS setup:
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Database Migrations

```bash
# Apply migrations
npx prisma migrate deploy

# Create migration for schema changes
npx prisma migrate dev --name add_booking_table

# Rollback (manual process via backup restore)
# Prisma doesn't support direct rollback; restore database from backup
```

**Migration Files**: `backend/prisma/migrations/`
- Auto-generated with timestamp and description
- Safe to commit to version control
- Applied sequentially by Prisma

### Feature Flags

**Flag Name**: `enable_booking_system`
- **Default**: On (enabled in production)
- **Rollout Strategy**: Instant deployment to all organizations
- **Future**: Could be org-based to enable/disable per dealership

## Known Technical Debt

- [ ] **Static tax rate**: Tax hardcoded to 0%. Should fetch from tax service based on location (lines 17, 239, 528)
- [ ] **Mock payment**: Stripe integration is mock only. Real payment needed (lines 193-195)
- [ ] **Concurrent booking race condition**: Two simultaneous bookings could theoretically bypass availability check. Need database-level lock or optimistic locking
- [ ] **No location validation**: Pickup/dropoff locations checked for existence but not validated to be in same dealership network
- [ ] **Customer KYC not checked**: No validation that customer has completed KYC before booking
- [ ] **Vehicle maintenance not checked**: No integration with vehicle maintenance schedules
- [ ] **Booking number generation**: Relies on sequential query which could be slow with very large datasets. Consider sequence table

## Troubleshooting

### Common Issues

**Issue**: "Vehicle is not available for the requested dates" but I don't see conflicting bookings
- **Cause**: The query includes pending and confirmed bookings (not just active). A pending booking blocks dates.
- **Fix**: Check booking status. Confirmed/pending bookings reserve the dates.
- **Prevention**: Filter by status=active in list to see actually rented vehicles

**Issue**: Booking creation succeeds but pricing seems wrong
- **Cause**: Daily rate captured at creation time. Vehicle rate may have changed since then.
- **Fix**: This is intentional - pricing is a snapshot at booking time. Re-book to get new rate.
- **Prevention**: Prices are immutable per booking. Update booking dates to trigger pricing recalc.

**Issue**: "Pickup location not found" error
- **Cause**: Location was deleted or belongs to different organization
- **Fix**: Select a valid location from the dropdown
- **Prevention**: Locations have restrict delete to prevent orphaning bookings

**Issue**: Booking number not generating in BP-YYYY-NNNNNN format
- **Cause**: Database query for latest booking failed or sequence extraction error
- **Fix**: Check logs, verify booking table has data, check booking number format in database
- **Prevention**: Always test booking creation in staging before production

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Watch booking queries
LOG_LEVEL=debug npm run start:dev 2>&1 | grep -i booking

# Check idempotency cache
redis-cli
> KEYS idempotency:*

# Database query analysis
# 1. Enable Prisma query logging
export DEBUG=prisma:*
npm run start:dev

# 2. Use Prisma Studio
npx prisma studio

# 3. Check slow query log
# PostgreSQL slow query log (if configured)
```

## Development Workflow

### Adding New Functionality

**Example: Add cancellation fee logic**

1. **Update Prisma schema** (backend/prisma/schema.prisma)
   - Add `cancellationFeeCents?: Int` field
   - Run `npx prisma generate`

2. **Create migration**
   - Run `npx prisma migrate dev --name add_cancellation_fee`

3. **Update DTO classes** (backend/src/booking/dto/)
   - Add `cancellationFeeCents` to UpdateBookingDto

4. **Implement service method** (backend/src/booking/booking.service.ts)
   - Add cancellation fee calculation in `cancel()` method
   - Log fee deduction

5. **Add controller endpoint** (backend/src/booking/booking.controller.ts)
   - Already handled by existing `cancel()` endpoint

6. **Write tests** (backend/src/booking/booking.service.spec.ts)
   - Test fee calculation scenarios
   - Test fee deduction on cancellation

7. **Update frontend** (frontend/components/features/bookings/)
   - Show cancellation fee in booking details
   - Display fee before confirming cancellation

8. **Update documentation**
   - This file (TECHNICAL.md)
   - Parent README.md

### Local Testing

```bash
# Backend unit tests
cd backend
npm run test -- --testPathPattern=booking

# Backend integration tests
npm run test:integration -- booking

# Frontend component tests
cd frontend
npm run test -- BookingForm.test.tsx

# Full E2E tests
cd e2e-tests
npm test -- --grep "booking"

# Manual testing with hot reload
# Terminal 1: Start backend
cd backend && npm run start:dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Start database
docker compose up postgres redis

# Visit http://localhost:3000/bookings
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md) - Complete Prisma schema
- [API Standards](../../api/standards.md) - Response formats, error handling
- [Testing Guide](../../testing/) - Test patterns and best practices
- [Authentication & Authorization](../../security/auth.md) - JWT strategy
- [Prisma Schema](../../../backend/prisma/schema.prisma) - Full schema definition
- [Vehicle Management](../vehicle-system/TECHNICAL.md) - Related feature
- [Customer Management](../customer-system/TECHNICAL.md) - Related feature

## Code References

**Key Files to Review**:

- **Backend Service**: `backend/src/booking/booking.service.ts:141-306` (create method)
- **Availability Logic**: `backend/src/booking/booking.service.ts:91-139` (checkVehicleAvailability)
- **Pricing Calculation**: `backend/src/booking/booking.service.ts:235-241` (pricing computation)
- **Status Transitions**: `backend/src/booking/booking.service.ts:704-828` (confirm, activate, complete)
- **Controller**: `backend/src/booking/booking.controller.ts:1-82` (all endpoints)
- **DTOs**: `backend/src/booking/dto/*.ts` (validation schemas)
- **Unit Tests**: `backend/src/booking/booking.service.spec.ts` (test patterns)
- **Integration Tests**: `backend/src/booking/booking.controller.integration.spec.ts` (API testing)
- **E2E Tests**: `e2e-tests/tests/bookings/booking-crud.spec.ts` (user workflows)
- **Frontend List**: `frontend/app/(dealer)/bookings/page.tsx:1-80` (listing with filters)
- **Frontend Detail**: `frontend/app/(dealer)/bookings/[id]/page.tsx` (booking details)

## Architecture Decision Records (ADRs)

### ADR-001: Composite Index for Availability Checks

- **Date**: 2024-01-15
- **Context**: Availability checking queries were the most frequent and slowest (analyzing multiple date ranges per vehicle)
- **Decision**: Create composite index `(vehicleId, pickupDatetime, dropoffDatetime)` instead of individual indexes
- **Consequences**:
  - Availability checks now <10ms (was 100ms+)
  - Composite index covers WHERE clause fields completely
  - Trade-off: Slightly slower updates (must update this index)
  - Result: Significant performance win for read-heavy availability checking

### ADR-002: Pricing Snapshot Pattern

- **Date**: 2024-01-10
- **Context**: Vehicle daily rates can change, but we needed consistent pricing for existing bookings
- **Decision**: Capture daily rate at booking creation time and store in booking record
- **Consequences**:
  - Pricing is immutable per booking (customer sees same price)
  - Vehicle rate changes don't affect existing bookings
  - Trade-off: Cannot bulk update rates, must communicate per-booking
  - Result: Clear pricing and customer confidence

### ADR-003: Availability Check with Pending Status

- **Date**: 2024-01-20
- **Context**: Should pending bookings block other bookings for the same dates?
- **Decision**: Yes - pending bookings block availability. Reasoning: a customer is likely to confirm, so optimistic blocking prevents overselling
- **Consequences**:
  - Reduces conflicts during confirmation
  - May lose bookings if customers don't confirm
  - Trade-off: Could lose "quick" bookings that don't confirm
  - Result: Stable bookings with minimal double-booking issues

---

**Last Technical Review**: 2025-12-28
**Reviewer**: FleetPass Engineering
