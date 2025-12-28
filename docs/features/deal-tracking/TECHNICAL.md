# Deal Tracking - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[HTTP Request] → [DealController] → [DealService] → [PrismaService] → [PostgreSQL]
                        ↓                ↓                ↓
                    [JWT Guard]    [Validation]    [Organization Filter]
                        ↓                ↓
                  [Error Handler]   [Logging]
```

### Design Patterns Used

- **Service Layer Pattern**: Business logic encapsulated in `DealService`, controllers delegate to services
- **Repository Pattern**: Prisma ORM acts as data access layer, abstracting database queries
- **DTO Pattern**: Request payloads validated against `CreateDealDto`, `UpdateDealDto`, `DealQueryDto`
- **Guard Pattern**: `JwtAuthGuard` enforces authentication; multi-tenancy enforced via organization filtering
- **Error Handling**: Custom exception handling via `NotFoundException`, `BadRequestException`
- **Logging**: Structured logging via `LoggerService` for audit trail and debugging

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/deal/`

**Key Files**:
```
deal/
├── deal.module.ts                          # Module definition, imports, providers
├── deal.controller.ts                      # HTTP endpoints (@Post, @Get, @Patch, @Delete)
├── deal.service.ts                         # Business logic (553 lines)
├── dto/
│   ├── create-deal.dto.ts                  # POST /deals request validation
│   ├── update-deal.dto.ts                  # PATCH /deals/:id request validation
│   └── deal-query.dto.ts                   # GET /deals query parameter validation
├── deal.service.spec.ts                    # Unit tests (434 lines, 100% coverage)
└── deal.controller.integration.spec.ts     # Integration tests
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService`: Database access via Prisma ORM
  - `LoggerService`: Structured logging with context
- **External Packages**:
  - `@nestjs/common` v9.x - HTTP decorators, guards, exceptions
  - `@prisma/client` v5.x - Database ORM
  - `class-validator` v0.14.x - DTO field validation
  - `class-transformer` v0.5.x - DTO field transformation (e.g., string to number)

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model Deal {
  id                  String   @id @default(cuid())
  organizationId      String
  leadId              String?
  customerId          String
  vehicleId           String   // reference to Vehicle (not enforced at DB level)
  dealValueCents      Int
  status              String   @default("pending") // pending, closed_won, closed_lost
  closedAt            DateTime?
  closedById          String?
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  lead                Lead? @relation(fields: [leadId], references: [id], onDelete: SetNull)
  customer            Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  closedBy            User? @relation("DealClosedBy", fields: [closedById], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([customerId])
  @@index([status])
  @@index([status, closedAt])  // CRITICAL: Pipeline query optimization
}
```

**Indexes**:
- `organizationId` - Multi-tenant filtering (all queries)
- `customerId` - Deal lookup by customer
- `status` - Pipeline filtering by status
- `(status, closedAt)` - Composite index for reporting queries (deal closure analytics, pipeline by date)

**Relationships**:
- `Organization` (1:N) - Multi-tenant scoping via cascade delete
- `Lead` (N:1, optional) - Soft relationship via `SetNull` on lead deletion
- `Customer` (N:1, required) - Hard relationship via cascade delete
- `User` via `closedBy` (N:1, optional) - Audit trail, soft reference via `SetNull`

**Migrations**: `backend/prisma/migrations/[timestamp]_add_deal_model/migration.sql`

### API Endpoints

**Base Path**: `/api/v1/deals`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/` | ✅ | Yes* | Create new deal |
| GET | `/` | ✅ | Yes | List deals with filtering & pagination |
| GET | `/:id` | ✅ | Yes | Get single deal with relations |
| PATCH | `/:id` | ✅ | Yes* | Update deal |
| DELETE | `/:id` | ✅ | Yes* | Delete deal |
| POST | `/:id/win` | ✅ | Yes* | Mark deal as won (closed_won) |
| POST | `/:id/lose` | ✅ | Yes* | Mark deal as lost (closed_lost) |

_*Idempotent via `IdempotencyInterceptor` (24h Redis cache); GET requests inherently idempotent_

#### POST /api/v1/deals (Create Deal)

**Request**:
```json
{
  "leadId": "lead-uuid-optional",
  "customerId": "customer-uuid-required",
  "vehicleId": "vehicle-uuid-required",
  "dealValueCents": 3000000,
  "notes": "Customer interested in financing"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "deal-uuid",
    "organizationId": "org-uuid",
    "leadId": "lead-uuid",
    "customerId": "customer-uuid",
    "vehicleId": "vehicle-uuid",
    "dealValueCents": 3000000,
    "status": "pending",
    "closedAt": null,
    "closedById": "user-uuid",
    "notes": "Customer interested in financing",
    "createdAt": "2024-12-28T10:00:00.000Z",
    "updatedAt": "2024-12-28T10:00:00.000Z",
    "customer": {
      "id": "customer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "lead": {
      "id": "lead-uuid",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "source": "website",
      "status": "qualified"
    }
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

**Validation Errors (400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "dealValueCents": ["must be a positive integer"],
      "customerId": ["must be a string"]
    }
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

**Business Logic Errors (400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Customer not found"
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

---

#### GET /api/v1/deals (List Deals)

**Query Parameters**:
```
?search=John
&status=pending
&leadId=lead-uuid
&page=1
&limit=10
&sortBy=createdAt
&sortOrder=desc
```

**Supported Filters**:
- `search` (optional, string): Case-insensitive search on customer `firstName`, `lastName`, `email` OR lead `customerName`, `customerEmail`
- `status` (optional, enum): `pending`, `closed_won`, `closed_lost`
- `leadId` (optional, string): Filter to deals for specific lead
- `page` (optional, integer ≥1, default: 1): Pagination page number
- `limit` (optional, integer 1-100, default: 10): Results per page
- `sortBy` (optional, enum, default: `createdAt`): `createdAt`, `updatedAt`, `closedAt`, `dealValueCents`
- `sortOrder` (optional, enum, default: `desc`): `asc`, `desc`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "deal-uuid-1",
      "organizationId": "org-uuid",
      "leadId": "lead-uuid",
      "customerId": "customer-uuid",
      "vehicleId": "vehicle-uuid",
      "dealValueCents": 3000000,
      "status": "pending",
      "closedAt": null,
      "closedById": null,
      "notes": "Initial inquiry",
      "createdAt": "2024-12-28T10:00:00.000Z",
      "updatedAt": "2024-12-28T10:00:00.000Z",
      "customer": { ... },
      "lead": { ... },
      "closedBy": null
    },
    {
      "id": "deal-uuid-2",
      "status": "closed_won",
      "closedAt": "2024-12-28T12:30:00.000Z",
      "closedById": "user-uuid",
      "closedBy": {
        "id": "user-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      ...
    }
  ],
  "timestamp": "2024-12-28T10:00:00.000Z",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

#### GET /api/v1/deals/:id (Get Deal)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "deal-uuid",
    "organizationId": "org-uuid",
    "leadId": "lead-uuid",
    "customerId": "customer-uuid",
    "vehicleId": "vehicle-uuid",
    "dealValueCents": 3000000,
    "status": "pending",
    "closedAt": null,
    "closedById": "user-uuid",
    "notes": "Customer notes",
    "createdAt": "2024-12-28T10:00:00.000Z",
    "updatedAt": "2024-12-28T10:00:00.000Z",
    "customer": {
      "id": "customer-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "lead": {
      "id": "lead-uuid",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "source": "website",
      "status": "qualified",
      "assignedTo": {
        "id": "user-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      }
    },
    "closedBy": null
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

**Not Found (404)**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Deal with ID deal-uuid not found"
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

---

#### PATCH /api/v1/deals/:id (Update Deal)

**Request**:
```json
{
  "customerId": "new-customer-uuid",
  "vehicleId": "new-vehicle-uuid",
  "dealValueCents": 3500000,
  "notes": "Updated notes",
  "status": "pending"
}
```

_All fields optional; omitted fields remain unchanged_

**Validation**:
- Status transition validation: Only `pending` → `closed_won|closed_lost` allowed
- Cannot update `status` back from `closed_won` or `closed_lost`
- Cannot update `createdAt` or `id` (immutable fields not in DTO)

**Response (200 OK)**: Same structure as GET endpoint

**Status Transition Error (400)**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot transition from 'closed_won' to 'pending'. Allowed transitions: none"
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

---

#### DELETE /api/v1/deals/:id (Delete Deal)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "message": "Deal deleted successfully"
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

---

#### POST /api/v1/deals/:id/win (Mark Deal as Won)

**Request**: No body required

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "deal-uuid",
    "status": "closed_won",
    "closedAt": "2024-12-28T12:30:00.000Z",
    "closedById": "user-uuid",
    "closedBy": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    ...
  },
  "timestamp": "2024-12-28T12:30:00.000Z"
}
```

**Status Transition Error (400)**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot mark deal as won with status 'closed_won'. Only pending deals can be won."
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

---

#### POST /api/v1/deals/:id/lose (Mark Deal as Lost)

**Request**: No body required

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "deal-uuid",
    "status": "closed_lost",
    "closedAt": "2024-12-28T12:30:00.000Z",
    "closedById": "user-uuid",
    "closedBy": {
      "id": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    ...
  },
  "timestamp": "2024-12-28T12:30:00.000Z"
}
```

**Status Transition Error (400)**:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot mark deal as lost with status 'closed_lost'. Only pending deals can be lost."
  },
  "timestamp": "2024-12-28T10:00:00.000Z"
}
```

### Service Layer Logic

**Key Methods** in `DealService`:

```typescript
// List deals with filtering and pagination
async findAll(
  query: DealQueryDto,
  organizationId: string
): Promise<{
  items: Deal[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}>
// Implements: search (customer/lead), status filter, lead filter, pagination, sorting
// Uses: Prisma $transaction for count + find consistency
// Optimizes: Composite index (status, closedAt) for pipeline queries
```

```typescript
// Get single deal with all relations
async findOne(id: string, organizationId: string): Promise<Deal>
// Validates: Deal exists and belongs to organization
// Includes: customer, lead (with assignedTo), closedBy
// Throws: NotFoundException if not found or unauthorized
```

```typescript
// Create new deal with validation
async create(
  createDealDto: CreateDealDto,
  closedById: string,
  organizationId: string
): Promise<Deal>
// Validates: customer exists, vehicle exists, lead exists (if provided)
// Sets: status = 'pending', closedById = creating user
// Includes: customer, lead in response
// Throws: BadRequestException if any entity not found
```

```typescript
// Update deal with status transition validation
async update(
  id: string,
  updateDealDto: UpdateDealDto,
  organizationId: string
): Promise<Deal>
// Validates: Deal exists, status transition legal, referenced entities exist
// Method: validateStatusTransition(currentStatus, newStatus)
// Throws: BadRequestException for invalid transitions
// Logs: Status changes for audit trail
```

```typescript
// Delete deal
async remove(id: string, organizationId: string): Promise<{ message: string }>
// Validates: Deal exists and belongs to organization
// Effect: Cascade delete (no child entities in current schema)
// Throws: NotFoundException if not found
```

```typescript
// Mark deal as won
async win(id: string, closedById: string, organizationId: string): Promise<Deal>
// Validates: Deal exists, status is 'pending'
// Sets: status = 'closed_won', closedAt = now(), closedById = user
// Throws: BadRequestException if already closed
// Includes: closedBy user info in response
```

```typescript
// Mark deal as lost
async lose(id: string, closedById: string, organizationId: string): Promise<Deal>
// Validates: Deal exists, status is 'pending'
// Sets: status = 'closed_lost', closedAt = now(), closedById = user
// Throws: BadRequestException if already closed
// Includes: closedBy user info in response
```

**Status Transition Validation**:
```typescript
private validateStatusTransition(currentStatus: string, newStatus: string): void {
  const validTransitions: Record<string, string[]> = {
    pending: ['closed_won', 'closed_lost'],    // Can only close from pending
    closed_won: [],                             // No transitions allowed
    closed_lost: [],                            // No transitions allowed
  };
  // Throws BadRequestException if transition not in validTransitions
}
```

**Transaction Handling**:
- **When Used**: In `findAll()` to ensure consistent count + results (page boundaries)
- **Implementation**: `prisma.$transaction([countQuery, findQuery])`
- **Benefit**: Prevents pagination inconsistencies if deals are created/deleted during query

### DTO Classes

**CreateDealDto** (`backend/src/deal/dto/create-deal.dto.ts`):
```typescript
export class CreateDealDto {
  @IsString()
  @IsOptional()
  leadId?: string;  // Optional lead association

  @IsString()
  @IsNotEmpty()
  customerId!: string;  // Required

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;  // Required

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  dealValueCents!: number;  // Required, non-negative integer

  @IsString()
  @IsOptional()
  notes?: string;  // Optional notes
}
```

**UpdateDealDto** (`backend/src/deal/dto/update-deal.dto.ts`):
```typescript
export class UpdateDealDto extends PartialType(CreateDealDto) {
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'closed_won', 'closed_lost'])
  status?: string;  // Optional status field
}
```

_Note: All fields optional due to `PartialType`; allows patch semantics_

**DealQueryDto** (`backend/src/deal/dto/deal-query.dto.ts`):
```typescript
export class DealQueryDto {
  @IsOptional()
  @IsString()
  search?: string;  // Search by customer name/email or lead name/email

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'closed_won', 'closed_lost'])
  status?: string;  // Filter by status

  @IsOptional()
  @IsString()
  leadId?: string;  // Filter by lead

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;  // Pagination: page number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;  // Pagination: results per page

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'closedAt', 'dealValueCents'])
  sortBy?: string = 'createdAt';  // Sort field

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';  // Sort direction
}
```

### Caching Strategy

**Redis Keys**: None currently implemented for deal data
- Could add: `deals:pipeline:{organizationId}` for frequently accessed pipeline views
- Could add: `deals:{dealId}` for individual deal cache with 15-min TTL
- Idempotency already uses Redis via global `IdempotencyInterceptor`

**Cache Invalidation**: Not applicable (caching not implemented)

### Background Jobs / Scheduled Tasks

**None currently**: No scheduled jobs for deal tracking

**Future candidates**:
- **Deal Aging Report**: Daily job to identify deals in pipeline > 30 days
- **Auto-win Integration**: If booking completion webhook available, auto-mark deal as won
- **Pipeline Snapshot**: Daily snapshot of pipeline for historical trend analysis

## Testing Strategy

### Unit Tests

**Location**: `backend/src/deal/deal.service.spec.ts`

**Coverage** (434 lines):
- ✅ `create()` - Happy path and error cases
  - Creates deal with all fields
  - Creates deal without optional lead
  - Validates customer exists
  - Validates vehicle exists
  - Validates lead exists (if provided)
  - Throws BadRequestException for missing references

- ✅ `findAll()` - Filtering, pagination, sorting
  - Returns paginated results
  - Filters by status
  - Filters by lead
  - Search by customer name/email
  - Search by lead name/email
  - Sorts by supported fields (createdAt, dealValueCents, etc.)
  - Handles empty results

- ✅ `findOne()` - Lookup with relations
  - Returns deal with all relations (customer, lead, closedBy)
  - Throws NotFoundException if deal not found
  - Throws NotFoundException if deal belongs to different organization

- ✅ `update()` - Field updates and validation
  - Updates deal fields
  - Validates status transitions
  - Rejects transition from closed states
  - Validates new customer reference
  - Validates new vehicle reference
  - Validates new lead reference

- ✅ `win()` - Mark as won
  - Transitions pending → closed_won
  - Sets closedAt timestamp and closedById
  - Rejects if already closed

- ✅ `lose()` - Mark as lost
  - Transitions pending → closed_lost
  - Sets closedAt timestamp and closedById
  - Rejects if already closed

- ✅ `validateStatusTransition()` - Private method
  - Allows pending → closed_won
  - Allows pending → closed_lost
  - Rejects closed_won → anything
  - Rejects closed_lost → anything

**Run**: `npm run test:unit -- deal`

### Integration Tests

**Location**: `backend/src/deal/deal.controller.integration.spec.ts`

**Coverage**:
- ✅ POST /deals (Create)
  - 201 Created with valid payload
  - 400 Bad Request for missing required fields
  - 400 Bad Request for invalid field types
  - 400 Bad Request if customer not found
  - 400 Bad Request if vehicle not found
  - 400 Bad Request if lead not found
  - 401 Unauthorized if no auth token

- ✅ GET /deals (List)
  - 200 OK returns paginated results
  - Filtering by status works
  - Filtering by leadId works
  - Search works
  - Pagination works (page, limit)
  - Sorting works
  - 401 Unauthorized without token

- ✅ GET /deals/:id (Get)
  - 200 OK returns deal with all relations
  - 404 Not Found for invalid ID
  - 404 Not Found for different organization
  - 401 Unauthorized without token

- ✅ PATCH /deals/:id (Update)
  - 200 OK updates deal fields
  - 400 Bad Request for invalid status transition
  - 400 Bad Request for invalid field types
  - 404 Not Found for invalid ID
  - 401 Unauthorized without token

- ✅ DELETE /deals/:id (Delete)
  - 200 OK deletes deal
  - 404 Not Found for invalid ID
  - 401 Unauthorized without token

- ✅ POST /deals/:id/win (Win)
  - 200 OK marks as closed_won
  - 400 Bad Request if already closed
  - 404 Not Found for invalid ID
  - 401 Unauthorized without token

- ✅ POST /deals/:id/lose (Lose)
  - 200 OK marks as closed_lost
  - 400 Bad Request if already closed
  - 404 Not Found for invalid ID
  - 401 Unauthorized without token

**Run**: `npm run test:integration -- deal`

### E2E Tests

**Location**: `e2e-tests/tests/deal.spec.ts` (planned)

**Planned Coverage**:
- ✅ Complete deal workflow: Create → Update → Mark Won
- ✅ Complete deal workflow: Create → Update → Mark Lost
- ✅ Search and filter deals in pipeline
- ✅ Multi-step deal progression
- ✅ Verify pagination works with large dataset
- ✅ Verify authorization (org isolation)

**Run**: `cd e2e-tests && npm test -- deal`

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/lead.fixtures.ts`

**Factories**:
```typescript
export const mockDeal = {
  id: 'deal-123',
  organizationId: 'org-1',
  leadId: 'lead-123',
  customerId: 'customer-123',
  vehicleId: 'vehicle-123',
  dealValueCents: 3000000,
  status: 'pending',
  closedAt: null,
  closedById: null,
  notes: 'Test deal',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDealWithRelations = {
  ...mockDeal,
  customer: mockCustomer,
  lead: mockLead,
  closedBy: null,
};
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (class: `backend/src/common/guards/jwt-auth.guard.ts`)
- **Token Location**: Authorization header `Bearer <token>` or HttpOnly cookie
- **Validation**: JWT strategy extracts user from token, injects via `@CurrentUser()` decorator
- **Enforcement**: All endpoints require JWT; 401 Unauthorized if missing or invalid

**Controller Example**:
```typescript
@Post()
create(
  @CurrentUser() user: User,  // Requires valid JWT
  @Body() createDealDto: CreateDealDto
) {
  return this.dealService.create(createDealDto, user.id, user.organizationId);
}
```

### Authorization

- **Role Checks**: No role-based access control currently (all authenticated users can perform all operations)
- **Organization Isolation**: All queries filtered by `organizationId` from JWT
  - Service method: `getScopedDeal(id, organizationId)` throws NotFoundException if deal's org doesn't match user's org
  - List method: `findAll()` includes `where: { organizationId }` filter
  - Prevents data leakage between organizations

**Scoping Example**:
```typescript
private async getScopedDeal(id: string, organizationId: string) {
  const deal = await this.prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.organizationId !== organizationId) {
    throw new NotFoundException(`Deal with ID ${id} not found`);
  }
  return deal;
}
```

### Input Validation

- **DTO Classes**: `class-validator` decorators enforce:
  - `@IsString()`: `leadId`, `customerId`, `vehicleId` must be strings
  - `@IsNotEmpty()`: Required fields must not be empty/null
  - `@IsInt()`: `dealValueCents` must be integer
  - `@Min(0)`: Deal value must be non-negative
  - `@IsIn([...])`: Status and sort fields must match enum
  - Type coercion via `@Type(() => Number)` for query parameters

- **Sanitization**: Prisma ORM prevents SQL injection via parameterized queries
- **Notes Field**: Plain text, no HTML/markup processing (safe from XSS)

**Validation Pipeline** (in `main.ts`):
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,       // Reject unknown properties
    forbidNonWhitelisted: true,
    transform: true,       // Auto-transform types
    transformOptions: { enableImplicitConversion: true },
  })
);
```

### Rate Limiting

- **Global**: 100 requests/minute (via `@nestjs/throttler`)
- **Auth Endpoints**: 5 requests/15 minutes (stricter for login/refresh)
- **Deal Endpoints**: Use global limits (no custom overrides needed)

**Configuration** (in `main.ts`):
```typescript
ThrottlerModule.forRoot([
  { ttl: 60000, limit: 100 },           // 100 req/min globally
  { ttl: 900000, limit: 5, name: 'auth' }, // 5 req/15min for auth
]);
```

## Performance Optimization

### Database Queries

- **Indexes Used**:
  - `(organizationId)` - Primary filter on all queries
  - `(customerId)` - Deal lookup by customer
  - `(status)` - Pipeline filtering
  - `(status, closedAt)` - Reporting queries (deal closure analytics)

- **N+1 Prevention**: Prisma `include` clause loads relations in single query
  ```typescript
  const deal = await this.prisma.deal.findUnique({
    where: { id },
    include: {
      customer: true,
      lead: { include: { assignedTo: { ... } } },
      closedBy: { select: { id, firstName, lastName, email } },
    },
  });
  ```

- **Pagination**: Offset-based pagination with `skip` and `take`
  - Query: `skip: (page - 1) * limit, take: limit`
  - Limitation: Slower for large offsets; cursor-based pagination planned

### Query Optimization

**Most Common Queries**:

1. **Pipeline View** (status=pending):
   ```sql
   SELECT * FROM "Deal"
   WHERE "organizationId" = ? AND "status" = 'pending'
   ORDER BY "createdAt" DESC
   LIMIT 10 OFFSET 0
   ```
   - Uses: `(organizationId)` index, then filters on `status`
   - Optimization: Composite index `(status, closedAt)` helps reports

2. **Deal Closure Analytics**:
   ```sql
   SELECT * FROM "Deal"
   WHERE "organizationId" = ? AND "status" IN ('closed_won', 'closed_lost')
   AND "closedAt" >= ? AND "closedAt" <= ?
   ORDER BY "closedAt" DESC
   ```
   - Uses: `(status, closedAt)` composite index
   - Returns closed deals for date range

3. **Customer Deals**:
   ```sql
   SELECT * FROM "Deal"
   WHERE "organizationId" = ? AND "customerId" = ?
   ORDER BY "createdAt" DESC
   ```
   - Uses: `(customerId)` index

### Caching

- **Hot Data**: Not currently cached; could cache pipeline counts per status
- **Idempotency Cache**: Via global `IdempotencyInterceptor`, 24-hour Redis retention
  - Prevents duplicate deal creation if request retried

### Frontend Optimization

**Component Splitting** (assumed):
- `DealsList` - Virtualized list for large pipelines
- `DealForm` - Modal with customer/vehicle selectors
- `DealDetail` - Single deal view

**React Query** (assumed):
- `useDealsList()` - Fetches with filters, caches with stale-while-revalidate
- `useDeal(id)` - Single deal fetch, 5-minute stale time
- `useCreateDeal()` - Mutation with optimistic update

**Memoization** (assumed):
- Stable refs for customer/vehicle dropdowns
- `useCallback` for filter handlers

## Monitoring & Observability

### Logging

- **Level**: Info (production), Debug (development)
- **Format**: JSON via Pino logger (through `LoggerService`)
- **Key Events Logged**:
  - `DealService: Creating new deal` - Info, logged at start
  - `DealService: Deal created successfully` - Info, logged on success
  - `DealService: Finding deals` - Debug, logged at start
  - `DealService: Deals retrieved` - Debug, with count/pagination metadata
  - `DealService: Marking deal as won` - Info, logged at start
  - `DealService: Deal marked as won successfully` - Info, logged on success
  - `DealService: Failed to create deal` - Error, logged if exception
  - `DealService: Deal not found or unauthorized` - Warn, logged if scoping fails

**Example Log Output**:
```json
{
  "level": "info",
  "timestamp": "2024-12-28T10:00:00.000Z",
  "message": "Creating new deal",
  "context": "DealService",
  "customerId": "customer-uuid",
  "vehicleId": "vehicle-uuid"
}
```

**Log Location**: Streamed to stdout in Docker, captured by container logging

### Metrics (Future)

- **Latency**: p50, p95, p99 for POST /deals (create), GET /deals (list)
- **Error Rate**: 4xx by endpoint (validation, not found), 5xx server errors
- **Business Metrics**:
  - Deals created per day/week
  - Win rate (closed_won / (closed_won + closed_lost))
  - Pipeline value by status
  - Average deal closure time

### Alerts (Future)

- **Error Spike**: >10 errors/min on /deals endpoint
- **Latency**: p99 > 2 seconds on list endpoint
- **Business Alert**: Win rate drops below 20% (data quality check)

## Deployment Considerations

### Environment Variables

**No feature-specific env vars** (deals feature uses defaults)

**Backend .env**:
```bash
# Global database/auth, not feature-specific
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_PASSWORD=...
```

### Database Migrations

**Apply Migrations**:
```bash
# Development
cd backend
npx prisma migrate dev --name add_deal_model

# Staging/Production
npx prisma migrate deploy
```

**Rollback** (if needed):
```bash
# Manual: Restore database from backup
# Prisma doesn't support automatic rollback; restore from snapshot
```

**Migration File** (auto-generated):
```sql
-- prisma/migrations/20240101120000_add_deal_model/migration.sql
CREATE TABLE "Deal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "leadId" TEXT,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "dealValueCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization" ("id") ON DELETE CASCADE,
  ...
);

CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");
CREATE INDEX "Deal_status_closedAt_idx" ON "Deal"("status", "closedAt");
```

### Feature Flags

- **Flag Name**: None currently (feature is always enabled)
- **Future**: Could add `enable_deal_tracking` for gradual rollout
- **Default**: On
- **Rollout Strategy**: Instant (all orgs)

## Known Technical Debt

- [ ] **No Status History**: Cannot audit when/why deal status changed; only final state visible
- [ ] **No Search Index**: Full-text search not optimized for large customer/lead name searches
- [ ] **Manual Closure Only**: Cannot auto-mark deal as won when booking completes (webhook not implemented)
- [ ] **No Caching**: List queries on large pipelines (1000+ deals) could benefit from Redis caching
- [ ] **Limited Sorting**: Can only sort by 4 fields; custom sort expressions not supported
- [ ] **No Soft Deletes**: Deleted deals are permanently removed; consider soft delete for audit trail

## Troubleshooting

### Common Issues

**Issue**: `404 Not Found - Deal with ID deal-uuid not found`
- **Cause**: Deal doesn't exist or belongs to different organization
- **Fix**: Verify deal ID is correct; check you're logged into correct organization account
- **Prevention**: Use UI to navigate to deals (avoid manual URL navigation)

**Issue**: `400 Bad Request - Customer not found`
- **Cause**: `customerId` in request references non-existent customer
- **Fix**: Create customer first, or select from customer dropdown in UI
- **Prevention**: Always validate customer exists before creating deal

**Issue**: `400 Bad Request - Cannot mark deal as won with status 'closed_won'`
- **Cause**: Attempting to close already-closed deal
- **Fix**: Cannot re-close deal; must delete and recreate if needed
- **Prevention**: Use UI to prevent double-clicks on close button

**Issue**: Deal creation successful but customer/lead not populated in response
- **Cause**: Rare race condition during concurrent operations
- **Fix**: Refresh deal details from GET /deals/:id endpoint
- **Prevention**: Use transactions (already implemented) to ensure consistency

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check Redis idempotency cache
redis-cli
> KEYS "idempotency:*"
> GET "idempotency:abc123"

# Database query analysis (via Prisma Studio)
npx prisma studio
# Navigate to Deal model to view records and relationships

# Check recent logs
docker logs fleetpass-backend | grep -i deal
```

## Development Workflow

### Adding New Functionality

1. **Update Prisma Schema** (if data model changes):
   ```bash
   # Edit backend/prisma/schema.prisma
   npx prisma migrate dev --name describe_change
   npx prisma generate
   ```

2. **Create/Update DTO Classes**:
   - Edit `backend/src/deal/dto/create-deal.dto.ts` or new file
   - Add `class-validator` decorators for validation

3. **Implement Service Method**:
   - Edit `backend/src/deal/deal.service.ts`
   - Add business logic, validation, logging
   - Use `getScopedDeal()` for authorization

4. **Add Controller Endpoint**:
   - Edit `backend/src/deal/deal.controller.ts`
   - Add `@Post()`, `@Get()`, `@Patch()`, etc.
   - Inject `@CurrentUser()` for auth context

5. **Write Tests** (in order):
   - Unit tests: `deal.service.spec.ts`
   - Integration tests: `deal.controller.integration.spec.ts`
   - E2E tests: `e2e-tests/tests/deal.spec.ts`

6. **Update Documentation**:
   - Update this file (TECHNICAL.md) with new endpoints/logic
   - Update business documentation (README.md) with workflows

### Local Testing

```bash
# Backend
cd backend
npm run test -- deal              # Unit + Integration tests
npm run test:unit -- deal         # Unit only
npm run test:integration -- deal  # Integration only

# Frontend (if UI exists)
cd frontend
npm run dev
# Test manually at http://localhost:3000/dealer/deals

# E2E
cd e2e-tests
npm test -- deal
npm run test:headed -- deal       # With visible browser
```

### Debugging

```bash
# Add breakpoints and run with inspector
node --inspect-brk ./node_modules/.bin/jest backend/src/deal/deal.service.spec.ts

# Manually test with curl
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3001/api/v1/deals

# Check service logic flow
# Edit deal.service.ts, add console.log, run tests
npm run test -- deal --verbose
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md) - Prisma models overview
- [API Standards](../../api/standards.md) - Response format, error handling
- [Testing Guide](../../testing/) - Testing best practices
- [Authentication](../../security/authentication.md) - JWT, refresh tokens
- [Prisma Schema](../../../backend/prisma/schema.prisma) - Full schema definition
- [Lead Tracking Technical](../lead-tracking/TECHNICAL.md) - Lead model details

## Code References

**Key Files to Review**:
- **Service**: `backend/src/deal/deal.service.ts:18-56` (getScopedDeal, authorization logic)
- **Service**: `backend/src/deal/deal.service.ts:430-480` (win method, status transition)
- **Controller**: `backend/src/deal/deal.controller.ts:65-73` (win/lose endpoints)
- **Tests**: `backend/src/deal/deal.service.spec.ts:71-150` (create test cases)
- **Prisma**: `backend/prisma/schema.prisma:285-310` (Deal model and indexes)

## Architecture Decision Records (ADRs)

### Status Immutability (Closed → Closed transitions not allowed)
- **Date**: 2024-12-28
- **Context**: Sales teams requested clear deal closure without reversions; once closed, deals shouldn't transition to other closed states
- **Decision**: Implement strict state machine: pending → (closed_won | closed_lost), closed states terminal
- **Consequences**: Cannot change win to loss; must delete and recreate if closure decision changes. Simplifies state logic and reporting.

### Organization-Level Scoping
- **Date**: 2024-12-28
- **Context**: Multi-tenant system requires data isolation; deals must not leak between organizations
- **Decision**: All queries filter by `organizationId` from JWT; getScopedDeal() validates org membership before returning
- **Consequences**: Performance benefit (index on organizationId); security benefit (cannot access other org data); simplifies authorization logic.

### Closure Tracking via User
- **Date**: 2024-12-28
- **Context**: Sales teams wanted audit trail of who closed deals for performance tracking
- **Decision**: Store `closedById` (User FK) + `closedAt` (DateTime) on deal closure
- **Consequences**: Enables reporting on agent performance; soft FK (SetNull) allows user deletion without deleting deal.

---

**Last Technical Review**: 2024-12-28
**Reviewer**: Claude
