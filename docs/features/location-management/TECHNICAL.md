# Location Management - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[API Request]
     ↓
[LocationController] - HTTP routing, request parsing
     ↓
[LocationService] - Business logic, validation, database ops
     ↓
[PrismaService] - Query builder and database abstraction
     ↓
[PostgreSQL Database] - Location records with indexes
     ↓
[Redis] - Idempotency cache (24h TTL) - optional, via IdempotencyInterceptor
```

### Design Patterns Used

- **CRUD Service Pattern**: Standard create, read, update, delete operations with validation
- **Dependency Injection**: NestJS constructor injection for `PrismaService` and `LoggerService`
- **Multi-Tenant Filtering**: Organization isolation enforced at service layer via `organizationId` parameter
- **Error Handling**: Custom exceptions (`NotFoundException`) with structured error responses
- **Pagination**: Offset-based pagination with configurable limit (default 10)
- **Logging**: Structured logging via Pino logger with context fields for debugging

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/location/`

**Key Files**:
```
location/
├── location.module.ts              # Module definition, imports, providers
├── location.controller.ts           # HTTP endpoints (@Get, @Post, @Patch, @Delete)
├── location.service.ts              # Business logic and database operations
├── location.service.spec.ts         # Unit tests (432 lines)
├── location.controller.integration.spec.ts  # Integration tests (495 lines)
└── dto/
    ├── create-location.dto.ts       # Request validation for POST
    ├── update-location.dto.ts       # Request validation for PATCH
    └── location-query.dto.ts        # Query parameter validation for GET list
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService` - Database query builder
  - `LoggerService` - Structured logging via Pino
- **External Packages**:
  - `class-validator` - DTO validation decorators
  - `class-transformer` - DTO type transformation (e.g., string to number)
  - `@nestjs/common` - NestJS core (decorators, exceptions)

### Frontend (Next.js)

**Component Location**: `frontend/app/(dealer)/locations/` (planned/reference)

**Key Files** (reference implementation structure):
```
locations/
├── page.tsx                         # Main locations list page
├── [id]/
│   └── page.tsx                     # Location detail/edit page
└── components/
    ├── LocationList.tsx             # Table displaying all locations
    ├── LocationForm.tsx             # Create/edit form component
    └── LocationDetail.tsx           # Detail view modal or page
```

**State Management**:
- **React Query**:
  - `useQuery('locations', fetchLocations)` - List with caching
  - `useMutation(createLocation)` - Create operation
  - `useMutation(updateLocation)` - Update operation
  - `useMutation(deleteLocation)` - Delete operation
- **Local State**: `useState` for form fields, pagination state
- **Form Handling**: `react-hook-form` with Zod validation schema matching DTOs

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model Location {
  id              String   @id @default(uuid())
  organizationId  String
  name            String
  addressLine1    String
  addressLine2    String?
  city            String
  state           String
  postalCode      String
  country         String   @default("US")
  latitude        Float?
  longitude       Float?
  phone           String?
  hoursOfOperation Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  vehicles              Vehicle[]
  pickupBookings        Booking[] @relation("BookingPickupLocation")
  dropoffBookings       Booking[] @relation("BookingDropoffLocation")

  @@index([organizationId])
}
```

**Migrations**: `backend/prisma/migrations/` - Schema evolution tracked via migration files

**Indexes**:
- `@@index([organizationId])` - Optimizes multi-tenant filtering in `findAll` queries where clause
- Composite index not needed yet; single field sufficient for current query patterns

**Foreign Keys**:
- `organizationId` → `Organization.id` with `onDelete: Cascade` - Ensures organization deletion cascades to all locations
- `vehicles` - One-to-many relationship; vehicles point to location via `locationId`
- `pickupBookings`, `dropoffBookings` - Relations for booking reference without foreign key constraints (allows deletion)

### API Endpoints

**Base Path**: `/api/v1/locations`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/` | ✅ JWT | Yes* | Create new location |
| GET | `/` | ✅ JWT | Yes | List all locations with filters & pagination |
| GET | `/:id` | ✅ JWT | Yes | Get single location details |
| PATCH | `/:id` | ✅ JWT | Yes* | Update location fields |
| DELETE | `/:id` | ✅ JWT | Yes* | Delete location (if no vehicles) |

*Idempotent via `IdempotencyInterceptor` (24h Redis cache using `Idempotency-Key` header)

**Request/Response Examples**:

```typescript
// POST /api/v1/locations
// Request
{
  "name": "Downtown LA Branch",
  "addressLine1": "123 Main St",
  "addressLine2": "Suite 400",
  "city": "Los Angeles",
  "state": "CA",
  "postalCode": "90001",
  "country": "US",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "phone": "+12125551234",
  "hoursOfOperation": {
    "monday": { "open": "09:00", "close": "18:00" },
    "tuesday": { "open": "09:00", "close": "18:00" },
    "wednesday": { "open": "09:00", "close": "18:00" },
    "thursday": { "open": "09:00", "close": "18:00" },
    "friday": { "open": "09:00", "close": "18:00" },
    "saturday": { "open": "10:00", "close": "16:00" },
    "sunday": null
  }
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organizationId": "org-123",
    "name": "Downtown LA Branch",
    "addressLine1": "123 Main St",
    "addressLine2": "Suite 400",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US",
    "latitude": 34.0522,
    "longitude": -118.2437,
    "phone": "+12125551234",
    "hoursOfOperation": { ... },
    "createdAt": "2024-12-28T10:30:00.000Z",
    "updatedAt": "2024-12-28T10:30:00.000Z",
    "organization": {
      "id": "org-123",
      "name": "Acme Car Dealership",
      "slug": "acme-auto"
    },
    "_count": { "vehicles": 0 }
  },
  "timestamp": "2024-12-28T10:30:00.000Z"
}

// GET /api/v1/locations?search=downtown&state=CA&page=1&limit=10
// Response (200 OK)
{
  "success": true,
  "data": {
    "items": [
      { /* location object */ },
      { /* location object */ }
    ],
    "total": 2,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "timestamp": "2024-12-28T10:30:00.000Z",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}

// Error Response (400 Bad Request - Validation)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "state": ["Must be exactly 2 characters"],
      "postalCode": ["Invalid ZIP code format"]
    }
  },
  "timestamp": "2024-12-28T10:30:00.000Z"
}

// Error Response (404 Not Found)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Location with ID 550e8400-e29b-41d4-a716-446655440000 not found or does not belong to your organization"
  },
  "timestamp": "2024-12-28T10:30:00.000Z"
}

// Error Response (400 Bad Request - Cannot Delete)
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot delete location with 5 vehicle(s). Please reassign or remove vehicles first."
  },
  "timestamp": "2024-12-28T10:30:00.000Z"
}
```

### Service Layer Logic

**Key Methods** (from `location.service.ts`):

```typescript
class LocationService {
  /**
   * Create a new location
   * @param organizationId - Owner organization
   * @param createLocationDto - Location data
   * @returns Created location with organization details and vehicle count
   * @throws Any database error propagates (logged)
   */
  async create(
    organizationId: string,
    createLocationDto: CreateLocationDto
  ): Promise<LocationWithOrganization>

  /**
   * List all locations with filtering and pagination
   * Filters:
   *   - search: Searches name, city, addressLine1 (case-insensitive)
   *   - state: Exact match on state code
   *   - city: Exact match on city
   *   - page, limit: Pagination
   * @returns { items, total, page, limit, totalPages }
   */
  async findAll(
    organizationId: string,
    query: LocationQueryDto
  ): Promise<PaginatedResponse<Location[]>>

  /**
   * Get single location by ID
   * @throws NotFoundException if not found or doesn't belong to org
   */
  async findOne(
    id: string,
    organizationId: string
  ): Promise<LocationWithOrganization>

  /**
   * Update location fields
   * First verifies existence via findOne (acts as authorization check)
   * @throws NotFoundException if not found
   */
  async update(
    id: string,
    organizationId: string,
    updateLocationDto: UpdateLocationDto
  ): Promise<LocationWithOrganization>

  /**
   * Delete location
   * First verifies existence and that no vehicles are assigned
   * @throws NotFoundException if not found
   * @throws Error if vehicles exist at location
   */
  async remove(
    id: string,
    organizationId: string
  ): Promise<{ message: string }>
}
```

**Core Logic Details**:

1. **Create**: Directly inserts location with provided organization context
2. **FindAll**:
   - Builds dynamic `where` clause based on filters
   - Uses `prisma.$transaction([...])` to fetch items and total count atomically
   - Calculates `totalPages = Math.ceil(total / limit)`
   - Returns items ordered by `createdAt desc`
3. **FindOne**: Uses `findFirst` with both `id` and `organizationId` checks (prevents data leakage)
4. **Update**: Calls `findOne` first as authorization check, then updates via `update` (not `upsert`)
5. **Remove**:
   - Calls `findOne` first for authorization and existence check
   - Counts vehicles via `prisma.vehicle.count({ where: { locationId: id } })`
   - Throws error if count > 0 (prevents orphaned vehicle references)
   - Deletes via `prisma.location.delete`

**Transaction Handling**:
- `findAll` uses `prisma.$transaction([...])` to ensure count matches items (prevents pagination gaps)
- Other methods don't require transactions; single Prisma operations are atomic

### Caching Strategy

**Not Currently Implemented** - Redis idempotency cache handles duplicate requests only

**Potential Future Caching**:
- Redis key: `locations:{organizationId}:list:{state}:{city}` - Cache filtered results
- TTL: 5 minutes - Locations change infrequently
- Invalidation: Clear on any create/update/delete within organization

### Background Jobs / Scheduled Tasks

**None Currently** - Location feature is synchronous only

**Potential Future Jobs**:
- Validate geocoding weekly (check if coordinates are valid)
- Audit location usage (identify unused locations)

## Testing Strategy

### Unit Tests

**Location**: `backend/src/location/location.service.spec.ts` (432 lines)

**Coverage**:
- ✅ `create()` - Success and error scenarios
- ✅ `findAll()` - Pagination, filtering (search, state, city), empty results
- ✅ `findOne()` - Found, not found, organization isolation
- ✅ `update()` - Success, not found, partial updates
- ✅ `remove()` - Success, not found, cannot delete with vehicles
- ✅ Error handling - Logging and exception propagation

**Key Test Files**:
- `location.service.spec.ts` - ~90% coverage of service methods
- Tests use mocked Prisma service via `mockPrismaService()` utility
- Fixtures in `backend/src/test/fixtures/location.fixtures.ts` provide test data

**Run**: `npm run test:unit -- location`

### Integration Tests

**Location**: `backend/src/location/location.controller.integration.spec.ts` (495 lines)

**Coverage**:
- ✅ POST /api/v1/locations - Create with valid/invalid data
- ✅ GET /api/v1/locations - List with filters, pagination
- ✅ GET /api/v1/locations/:id - Retrieve details
- ✅ PATCH /api/v1/locations/:id - Update with partial data
- ✅ DELETE /api/v1/locations/:id - Delete (success and cascade protection)
- ✅ JWT authentication guard enforcement
- ✅ Organization isolation (user cannot access other org locations)
- ✅ Error responses (400 validation, 401 auth, 404 not found)
- ✅ Idempotency via Idempotency-Key header

**Run**: `npm run test:integration -- location`

### E2E Tests

**Status**: Not yet implemented (Phase 2 planned)

**Location**: `e2e-tests/tests/location.spec.ts` (planned)

**Planned Coverage**:
- User journey: Create → List → Update → Delete
- Multi-location management workflow
- UI form validation and error messaging
- Search and filter interactions

**Run**: `cd e2e-tests && npm test -- location`

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/location.fixtures.ts`

**Factories**:
```typescript
export const createTestLocation = (overrides?: Partial<Location>) => ({
  id: 'test-location-123',
  organizationId: 'test-org-123',
  name: 'Test Branch',
  addressLine1: '123 Main St',
  addressLine2: null,
  city: 'Los Angeles',
  state: 'CA',
  postalCode: '90001',
  country: 'US',
  latitude: 34.0522,
  longitude: -118.2437,
  phone: '+12125551234',
  hoursOfOperation: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

export const createLocationDto = (overrides?: Partial<CreateLocationDto>) => ({
  name: 'Test Branch',
  addressLine1: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  postalCode: '90001',
  country: 'US',
  ...overrides
});

export const createLocationQueryDto = (overrides?: Partial<LocationQueryDto>) => ({
  page: 1,
  limit: 10,
  ...overrides
});
```

**Usage in Tests**:
```typescript
const location = createTestLocation({ name: 'My Custom Branch' });
const dto = createLocationDto({ state: 'NY' });
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` from `common/guards/jwt-auth.guard`
- **Token Location**: Authorization header (`Bearer {token}`) or HttpOnly cookie
- **Validation**: `jwt.strategy.ts` extracts user from token, validates signature and expiry
- **Endpoint Protection**: `@UseGuards(JwtAuthGuard)` decorator on LocationController

### Authorization

- **Organization Isolation**: All service methods receive `organizationId` from JWT user; filters are applied at database query level
- **No Role-Based Access**: All authenticated users have full location CRUD access (future enhancement opportunity)
- **Implementation**:
  ```typescript
  // Controller extracts organizationId from JWT user
  @Get()
  findAll(
    @Query() query: LocationQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.findAll(req.user.organizationId, query);
  }

  // Service enforces organizationId in all queries
  const location = await this.prisma.location.findFirst({
    where: { id, organizationId },  // Both must match
  });
  ```

### Input Validation

- **DTO Classes**: `class-validator` decorators enforce types and formats
  - `@IsString()`, `@IsNotEmpty()` - Basic type validation
  - `@Length(2, 2)` - Exact length for state code
  - `@Matches(/^\d{5}(-\d{4})?$/)` - Regex for ZIP code format
  - `@Matches(/^\+?1?\d{10,14}$/)` - International phone format
  - `@Type(() => Number)` - Transform string to number for geo-coordinates
- **Sanitization**: Trimming and lowercasing handled by database or application layer
- **File Uploads**: N/A for location feature

### Rate Limiting

- **Global**: 100 requests/minute (via `@nestjs/throttler`)
- **Endpoint-Specific**: No custom rate limits for location endpoints
- **Auth Protection**: General login endpoint has stricter limits (5 req/15min)

## Performance Optimization

### Database Queries

- **Indexes Used**: `@@index([organizationId])` optimizes WHERE clause filtering in findAll
- **N+1 Prevention**:
  ```typescript
  // Includes organization and vehicle count in single query
  include: {
    organization: { select: { id: true, name: true, slug: true } },
    _count: { select: { vehicles: true } }
  }
  ```
- **Pagination**: Offset-based with skip/take (default 10 items per page)
  ```typescript
  const skip = (page - 1) * limit;
  findMany({ skip, take: limit, ... })
  ```
- **Query Optimization**:
  - Search across 3 fields (name, city, address) uses case-insensitive OR
  - State and city filters use exact match (indexed fields)
  - Atomic transaction for list count ensures consistency

### Caching

- **Currently**: Only idempotency caching via Redis (24h TTL)
- **Not Cached**: List results; locations update frequently enough
- **Future Opportunity**: Cache filtered results (5 min TTL) for read-heavy workloads

### Frontend Optimization

- **Code Splitting**: Location components in route-based bundle only
- **React Query**: Stale-while-revalidate strategy prevents unnecessary requests
  ```typescript
  useQuery('locations', fetchLocations, {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
  ```
- **Memoization**: Location form fields memoized to prevent re-renders

## Monitoring & Observability

### Logging

- **Level**: Info (create/update/delete), Debug (list/read operations)
- **Format**: JSON via Pino logger (structured logging)
- **Key Events Logged**:
  - `location.create` - Includes locationId, organizationId, location name
  - `location.update` - Includes locationId, changed fields
  - `location.delete` - Includes locationId, success status
  - `location.error` - Includes error message, context, user organization

**Example**:
```typescript
this.logger.logWithFields('info', 'Location created successfully', {
  locationId: location.id,
  organizationId,
});
```

### Metrics (Future)

- **Latency**: p50, p95, p99 for each endpoint (POST, GET list, GET detail, PATCH, DELETE)
- **Error Rate**: 4xx (validation, not found), 5xx (server errors) by endpoint
- **Business Metrics**:
  - Total locations per organization
  - Locations with vehicles vs. empty
  - Average vehicles per location

### Alerts (Future)

- **Error Spike**: >10 location operation errors/minute
- **Latency**: p99 > 2s for any endpoint (indicates database slow query)

## Deployment Considerations

### Environment Variables

**No feature-specific environment variables** - Uses standard FleetPass config

```bash
DATABASE_URL=postgresql://...       # Prisma connection
REDIS_HOST=redis                    # Idempotency cache
REDIS_PASSWORD=...                  # Cache authentication
JWT_SECRET=...                      # Token signing
FRONTEND_URL=http://localhost:3000  # CORS configuration
```

### Database Migrations

```bash
# Create new migration (if schema changes)
cd backend
npx prisma migrate dev --name add_location_hours_validation

# Apply migrations in production
npx prisma migrate deploy

# Rollback (manual process)
# 1. Restore from backup
# 2. Re-run migrations from start

# Check migration status
npx prisma migrate status
```

### Feature Flags

**Not Currently Implemented** - Location feature always enabled

**Potential Future**:
- Flag: `enable_location_management`
- Default: On (all organizations)
- Rollout: N/A (foundational feature)

## Known Technical Debt

- [ ] **Concurrent Edit Detection**: No optimistic locking; simultaneous updates lose intermediate changes (implement row version/timestamp)
- [ ] **Hours Validation**: JSON format not validated; malformed `hoursOfOperation` accepted (add JSON schema)
- [ ] **Booking Cascade**: Cannot soft-delete locations with bookings; requires migration to soft-delete pattern
- [ ] **Geocoding**: Coordinates entered manually; no reverse geocoding from address (integrate Google Maps API)
- [ ] **Search Performance**: No full-text search index; LIKE queries on large datasets slow (add PostgreSQL full-text search)

## Troubleshooting

### Common Issues

**Issue**: `VALIDATION_ERROR` on state field
- **Cause**: State code must be exactly 2 characters (e.g., "CA", not "California")
- **Fix**: Use two-letter state abbreviation per US postal standards
- **Prevention**: Add state dropdown/autocomplete in frontend form

**Issue**: `Cannot delete location with X vehicle(s)`
- **Cause**: Vehicles are still assigned to the location
- **Fix**: Delete or reassign vehicles to another location first; then retry location deletion
- **Prevention**: UI should show vehicle count and require vehicle reassignment before allowing deletion

**Issue**: 404 Not Found when accessing location
- **Cause**: Location ID is incorrect or belongs to different organization
- **Fix**: Verify location ID and ensure you're logged into correct organization
- **Prevention**: Use centralized API client that handles organization context

**Issue**: Slow list response with many locations
- **Cause**: No database index on search fields; query does full table scan
- **Fix**: Add composite index on `(organizationId, city)` or implement full-text search
- **Prevention**: Monitor slow queries in logs; add caching layer for filtered results

### Debug Tips

```bash
# Enable debug logging
cd backend
LOG_LEVEL=debug npm run start:dev

# Check database directly
npx prisma studio

# Query locations for specific org
SELECT * FROM "Location" WHERE "organizationId" = 'org-123'
ORDER BY "createdAt" DESC;

# Check Redis idempotency cache
redis-cli
> KEYS locations:*
> GET locations:{idempotency-key}

# Test API endpoint with curl
curl -H "Authorization: Bearer {token}" \
  http://localhost:3001/api/v1/locations?search=downtown&state=CA
```

## Development Workflow

### Adding New Functionality

1. **Schema Update** (if needed):
   ```bash
   # Edit backend/prisma/schema.prisma
   # Add field to Location model
   npx prisma generate           # Regenerate Prisma client
   npx prisma migrate dev --name describe_change
   ```

2. **Update DTOs**:
   - `create-location.dto.ts` - Add validator decorators
   - `update-location.dto.ts` - Auto-extends CreateLocationDto (PartialType)
   - `location-query.dto.ts` - Add filter parameters if listing

3. **Implement Service Logic**:
   - Add method to `location.service.ts`
   - Include logging with context fields
   - Handle errors and null checks

4. **Add Controller Endpoint**:
   - Add method to `location.controller.ts` with appropriate HTTP decorator
   - Extract organizationId from request user
   - Pass to service method

5. **Write Tests**:
   - Unit tests in `location.service.spec.ts` (mock Prisma)
   - Integration tests in `location.controller.integration.spec.ts` (real HTTP)
   - Test error cases, validation, authorization

6. **Update Documentation**:
   - This TECHNICAL.md
   - README.md with business impact
   - API examples in TECHNICAL.md

### Local Testing

```bash
# Backend testing
cd backend
npm run test:unit -- location                    # Unit tests only
npm run test:integration -- location             # Integration tests only
npm run test -- location                         # All tests
npm run test:cov -- location                     # With coverage report

# Manual API testing
npm run start:dev                                # Start backend
# In another terminal:
curl -H "Authorization: Bearer {token}" \
  http://localhost:3001/api/v1/locations

# Frontend testing
cd frontend
npm run dev                                      # Start dev server
# Open http://localhost:3000/dealer/locations in browser

# E2E testing (planned)
cd e2e-tests
npm test -- location
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md) - Full Prisma schema overview
- [API Standards](../../api/standards.md) - Response format, error handling, idempotency
- [Testing Guide](../../testing/) - Backend testing patterns and fixtures
- [Prisma Schema](../../../backend/prisma/schema.prisma) - Complete ORM definition
- [Authentication](../../security/authentication.md) - JWT strategy and refresh token flow

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/location/location.service.ts` - Lines 1-304 (all methods)
- Controller: `backend/src/location/location.controller.ts` - Lines 1-71 (HTTP routing)
- DTOs: `backend/src/location/dto/*.ts` - Validation schemas
- Unit Tests: `backend/src/location/location.service.spec.ts` - Lines 1-432
- Integration Tests: `backend/src/location/location.controller.integration.spec.ts` - Lines 1-495
- Database Model: `backend/prisma/schema.prisma` - Lines 33-56

## Architecture Decision Records (ADRs)

### ADR-1: JSON Storage for Hours of Operation

- **Date**: 2024-12-01 (inferred from implementation)
- **Context**: Locations have variable hours across 7 days with different open/close times; needed flexible storage
- **Decision**: Store `hoursOfOperation` as JSON in PostgreSQL (no separate Hours table)
- **Consequences**:
  - Pro: Flexible schema, single query per location, no schema migration for rule changes
  - Con: Hours format not enforced; no indexing on specific days; query operations require JSON operators
- **Alternatives Considered**:
  - Separate `LocationHours` table (normalized but more complex queries)
  - Hours as string with parsing logic (error-prone)

### ADR-2: Cascade Delete on Organization

- **Date**: 2024-12-01 (inferred)
- **Context**: Locations are always owned by an organization; deletion of org should clean up all data
- **Decision**: Foreign key `organizationId` has `onDelete: Cascade`
- **Consequences**:
  - Pro: Automatic cleanup, no orphaned location records
  - Con: Cannot restore locations if organization deleted (not recoverable without backup)
- **Alternative**: Soft delete (add `deletedAt` timestamp) - deferred for Phase 3

### ADR-3: Prevent Location Deletion with Vehicles

- **Date**: 2024-12-01
- **Context**: Vehicles reference locations; deleting a location would break vehicle data integrity
- **Decision**: Check vehicle count before deletion; throw error if vehicles exist
- **Consequences**:
  - Pro: Prevents data inconsistency, forces deliberate vehicle reassignment
  - Con: UX friction (users must reassign vehicles before deleting location)
- **Alternative**: Auto-reassign vehicles to default location (risky, could move to wrong location)

---

**Last Technical Review**: 2024-12-28
**Reviewer**: Backend Team
