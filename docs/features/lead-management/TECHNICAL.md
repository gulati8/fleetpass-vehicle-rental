# Lead Management - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[Frontend - Lead Dashboard/Forms]
         ↓
[API Gateway @ /api/v1/leads]
         ↓
[NestJS Lead Controller]
         ↓
[Lead Service - Business Logic]
         ↓
[Prisma ORM]
         ↓
[PostgreSQL - Lead + Related Tables]
         ↓
[Redis - Idempotency Cache]
```

### Design Patterns Used

- **Service-Based Architecture**: LeadService encapsulates all business logic; controller delegates to service
- **DTO Validation**: Class-validator decorators on DTOs enforce input contracts before service execution
- **Repository Pattern**: PrismaService acts as data access layer (implicit via Prisma client)
- **Multi-Tenancy**: Organization isolation via `organizationId` filter on all queries (no explicit tenant middleware needed)
- **Idempotency**: Global `IdempotencyInterceptor` caches responses by idempotency-key header (24h TTL in Redis)
- **Status Machine**: Private `validateStatusTransition()` method enforces valid state transitions (declarative rule map)
- **Transaction Boundaries**: Lead conversion wrapped in `prisma.$transaction()` for atomicity (Deal + Lead update)

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/lead/`

**Key Files**:
```
lead/
├── lead.module.ts                    # Module registration, imports, providers
├── lead.controller.ts                # HTTP endpoints (7 routes)
├── lead.service.ts                   # Business logic (620 lines)
├── lead.service.spec.ts              # Unit tests (505 lines)
├── lead.controller.integration.spec.ts  # Integration tests
├── dto/
│   ├── create-lead.dto.ts            # POST /leads request validation
│   ├── update-lead.dto.ts            # PATCH /leads/:id request validation
│   ├── lead-query.dto.ts             # GET /leads query param validation
│   ├── assign-lead.dto.ts            # POST /leads/:id/assign request
│   └── convert-lead.dto.ts           # POST /leads/:id/convert request
└── entities/
    └── lead.entity.ts                # (if needed for response types)
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService` - Database access (lead, customer, vehicle, user, deal queries)
  - `LoggerService` - Structured logging via Pino
- **External Packages**:
  - `@nestjs/common` - NestJS framework (Injectable, exceptions, guards)
  - `class-validator` - DTO validation decorators
  - `@prisma/client` - Generated Prisma client

**Module Definition** (`lead.module.ts`):
```typescript
@Module({
  imports: [PrismaModule],           // Provides PrismaService
  controllers: [LeadController],      // Registers HTTP routes
  providers: [LeadService],           // Business logic
  exports: [LeadService],             // Exported for other modules (e.g., Deal)
})
export class LeadModule {}
```

### Frontend (Next.js)

**Component Location**: `frontend/app/(dealer)/leads/` or `frontend/components/Lead*`

**Potential Key Files** (not reviewed in detail):
```
leads/
├── page.tsx                          # Lead list dashboard
├── [id]/page.tsx                     # Lead detail view
├── components/
│   ├── LeadList.tsx                  # Table/grid of leads
│   ├── LeadDetail.tsx                # Single lead view
│   ├── LeadForm.tsx                  # Create/edit form
│   ├── ConvertLeadModal.tsx          # Conversion workflow
│   └── AssignLeadModal.tsx           # Assignment workflow
└── hooks/
    └── useLeads.ts                   # React Query hooks for API calls
```

**State Management**:
- **React Query**: `useLeadsQuery()`, `useLeadQuery()`, `useCreateLeadMutation()`, `useUpdateLeadMutation()`, `useConvertLeadMutation()`, `useAssignLeadMutation()`, `useDeleteLeadMutation()`
- **Form Handling**: react-hook-form with zod for schema validation
- **Idempotency**: Auto-generated `Idempotency-Key` header on mutations (POST/PATCH/DELETE)

### Database Schema

**Prisma Model** (`backend/prisma/schema.prisma`, lines 252-283):

```prisma
model Lead {
  id                  String   @id @default(cuid())
  organizationId      String
  customerId          String?
  customerEmail       String?
  customerName        String?
  customerPhone       String?
  source              String?
  vehicleInterestId   String?
  status              String   @default("new")
  assignedToId        String?
  notes               String?
  createdById         String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization        Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer            Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  assignedTo          User? @relation("LeadAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)
  createdBy           User? @relation("LeadCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  deals               Deal[]

  @@index([organizationId])
  @@index([customerId])
  @@index([status])
  @@index([assignedToId])
  @@index([status, assignedToId, createdAt])    // CRITICAL composite
  @@index([source, status])                     // Analytics queries
}
```

**Key Design Decisions**:
- **No explicit VIN/vehicle_id FK**: `vehicleInterestId` is soft reference (String, no constraint). Allows leads without vehicle interest. Vehicle deletion doesn't cascade-delete leads.
- **Optional customer**: `customerId` nullable. Supports prospect leads (email/name only) that may later be linked to registered customer.
- **Soft customer delete**: `onDelete: SetNull` on customer FK. If customer deleted externally, lead survives but shows orphaned state.
- **Status enum as String**: Not an enum type (would require migration if adding statuses). Stored as VARCHAR, validated in code.

**Migrations**: Check `backend/prisma/migrations/` for Lead model creation and index additions.

**Indexes** (performance critical):
- `[organizationId]` - Multi-tenant filtering (every query)
- `[customerId]` - Find leads by customer
- `[status]` - Dashboard filtering
- `[assignedToId]` - "My leads" queries
- `[status, assignedToId, createdAt]` - **CRITICAL**: Handles dashboard queries with filters + sorting (most expensive query)
- `[source, status]` - Lead source funnel analytics

### API Endpoints

**Base Path**: `/api/v1/leads`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| GET | `/` | ✅ JWT | Yes | List all leads (paginated, filterable) |
| GET | `/:id` | ✅ JWT | Yes | Get single lead with relations |
| POST | `/` | ✅ JWT | Yes* | Create new lead |
| PATCH | `/:id` | ✅ JWT | Yes* | Update lead info (status, notes, customer, vehicle) |
| DELETE | `/:id` | ✅ JWT | Yes* | Delete lead (hard delete) |
| POST | `/:id/assign` | ✅ JWT | Yes* | Assign lead to user |
| POST | `/:id/convert` | ✅ JWT | Yes* | Convert lead to deal (transaction) |

*Idempotent via `IdempotencyInterceptor` - client must send `Idempotency-Key` header (24h Redis cache TTL). If duplicate request, cached response returned.

**Request/Response Examples**:

```typescript
// POST /api/v1/leads
// Request
{
  "customerId": "cust-123",           // Optional: link to existing customer
  "customerEmail": "john@example.com", // Optional: if not a customer yet
  "customerName": "John Doe",
  "customerPhone": "+1-555-0123",
  "source": "website",
  "vehicleInterestId": "vehicle-456",  // Optional: specific vehicle interest
  "notes": "Interested in SUVs under $50k"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "lead-cuid123",
    "organizationId": "org-1",
    "customerId": "cust-123",
    "customerEmail": "john@example.com",
    "customerName": "John Doe",
    "customerPhone": "+1-555-0123",
    "source": "website",
    "vehicleInterestId": "vehicle-456",
    "status": "new",
    "assignedToId": null,
    "notes": "Interested in SUVs under $50k",
    "createdById": "user-789",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "customer": {
      "id": "cust-123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-0123"
    },
    "assignedTo": null,
    "createdBy": {
      "id": "user-789",
      "firstName": "Jane",
      "lastName": "Manager",
      "email": "jane@dealership.com"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "customerEmail": ["must be a valid email"]
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// GET /api/v1/leads?status=qualified&assignedToId=user-123&page=1&limit=10
// Response (200 OK)
{
  "success": true,
  "data": {
    "items": [
      { /* lead object */ }
    ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// POST /api/v1/leads/:id/assign
// Request
{
  "assignedToId": "user-999"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "lead-123",
    "assignedToId": "user-999",
    "assignedTo": {
      "id": "user-999",
      "firstName": "John",
      "lastName": "Agent",
      "email": "john.agent@dealership.com",
      "role": "sales_agent"
    }
    // ... other lead fields
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// POST /api/v1/leads/:id/convert
// Request
{
  "vehicleId": "vehicle-456",
  "dealValueCents": 3000000,  // $30,000 in cents
  "notes": "Negotiated down from $35k"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "lead": {
      "id": "lead-123",
      "status": "converted",
      // ... other lead fields
    },
    "deal": {
      "id": "deal-cuid789",
      "leadId": "lead-123",
      "customerId": "cust-123",
      "vehicleId": "vehicle-456",
      "dealValueCents": 3000000,
      "status": "pending",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  },
  "timestamp": "2024-01-15T10:35:00.000Z"
}
```

### Service Layer Logic

**Key Methods** (`backend/src/lead/lead.service.ts`):

```typescript
@Injectable()
export class LeadService {
  private readonly logger = new LoggerService('LeadService');
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new lead
   * - Validates customer exists (if customerId provided)
   * - Validates vehicle exists (if vehicleInterestId provided)
   * - Sets initial status to 'new'
   */
  async create(
    createLeadDto: CreateLeadDto,
    createdById: string,
    organizationId: string,
  ) {
    // Validation logic here
    // Creates lead with status='new'
    // Returns lead with relations (customer, assignedTo, createdBy)
  }

  /**
   * List leads with pagination and filtering
   * - Filters by status, source, assignedToId
   * - Supports full-text search across customer fields
   * - Returns paginated results + total count
   */
  async findAll(
    query: LeadQueryDto,
    organizationId: string,
  ) {
    // Builds where clause from filters
    // Executes find + count in transaction
    // Returns { items, total, page, limit, totalPages }
  }

  /**
   * Get single lead by ID
   * - Verifies organization ownership via getScopedLead()
   * - Includes relations: customer, assignedTo, createdBy, deals
   */
  async findOne(id: string, organizationId: string) {
    // Returns lead with full relations
  }

  /**
   * Update lead fields
   * - Validates status transitions (new→contacted→qualified→converted/lost)
   * - Validates customer exists (if updating customerId)
   * - Validates vehicle exists (if updating vehicleInterestId)
   */
  async update(
    id: string,
    updateLeadDto: UpdateLeadDto,
    organizationId: string,
  ) {
    // Validates transition rules
    // Updates lead data
    // Returns updated lead
  }

  /**
   * Delete lead (hard delete)
   * - Verifies organization ownership
   * - Deletes record from database
   */
  async remove(id: string, organizationId: string) {
    // Returns { message: 'Lead deleted successfully' }
  }

  /**
   * Assign lead to a user
   * - Validates user exists and is active
   * - Updates assignedToId
   */
  async assign(
    id: string,
    assignLeadDto: AssignLeadDto,
    organizationId: string,
  ) {
    // Returns lead with updated assignedTo relation
  }

  /**
   * Convert lead to a deal (ATOMIC TRANSACTION)
   * - Validates lead is not already converted
   * - Validates lead is not lost
   * - Validates vehicle exists
   * - Validates customer exists on lead
   * - Creates Deal record
   * - Updates lead status to 'converted'
   * - Returns { lead, deal }
   */
  async convert(
    id: string,
    convertLeadDto: ConvertLeadDto,
    organizationId: string,
  ) {
    // Wraps deal creation + lead update in prisma.$transaction()
    // Ensures atomic: both succeed or both fail
    // Returns { lead: updatedLead, deal: createdDeal }
  }

  /**
   * PRIVATE: Validate status transitions
   * - new → contacted, qualified, lost
   * - contacted → qualified, lost
   * - qualified → converted, lost
   * - converted → (terminal, no transitions)
   * - lost → (terminal, no transitions)
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const validTransitions: Record<string, string[]> = {
      new: ['contacted', 'qualified', 'lost'],
      contacted: ['qualified', 'lost'],
      qualified: ['converted', 'lost'],
      converted: [],
      lost: [],
    };
    // Throws BadRequestException if invalid
  }

  /**
   * PRIVATE: Fetch lead with organization scope check
   * - Ensures lead exists
   * - Ensures lead belongs to requesting organization
   * - Includes relations: customer, assignedTo, createdBy, deals
   */
  private async getScopedLead(
    id: string,
    organizationId: string,
  ) {
    // Throws NotFoundException if not found or wrong org
  }
}
```

**Transaction Handling**:
- **When Used**: Lead conversion (create Deal + update Lead status)
- **Implementation**: `prisma.$transaction(async (tx) => { /* operations */ })`
  - Ensures atomicity: if Deal creation fails, Lead status not updated
  - If either operation fails, entire transaction rolled back
  - Provides isolation from concurrent conversions

**Error Handling**:
- `NotFoundException` - Lead not found or wrong organization (404)
- `BadRequestException` - Validation failure, invalid status transition, missing customer/vehicle (400)
- `ConflictException` - Lead already converted (409)
- Generic errors logged and re-thrown (500)

### Caching Strategy

**Redis Keys** (via global `IdempotencyInterceptor`):
- `idempotency:{idempotency-key}` - Cached response for mutation
- TTL: 24 hours
- Used by: POST (create), PATCH (update), DELETE (remove), POST (assign), POST (convert)

**No lead-specific caching** (considered but deferred):
- Could cache `lead:{leadId}` but invalidation complexity (update leads invalidates many lists)
- Prioritize database indexes over cache for this read-heavy feature

**Cache Invalidation**:
- Automatic via `IdempotencyInterceptor` on repeat idempotency-key
- No manual invalidation needed (HTTP-layer caching, not app-layer)

### Background Jobs / Scheduled Tasks

**None currently implemented**. Potential future jobs:
- Lead qualification timeout (warn if "new" for >3 days)
- Auto-mark lost after 30 days uncontacted
- Daily lead summary email to managers

### DTO Classes

**CreateLeadDto** (`dto/create-lead.dto.ts`):
```typescript
export class CreateLeadDto {
  @IsString()
  @IsOptional()
  customerId?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  vehicleInterestId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```
- All fields optional for flexibility
- Email validated if provided
- Strings validated for type, not length/pattern

**UpdateLeadDto** (partial):
```typescript
export class UpdateLeadDto {
  // Same as CreateLeadDto (all optional for PATCH)
  // Plus status field for workflow progression
}
```

**LeadQueryDto** (`dto/lead-query.dto.ts`):
```typescript
export class LeadQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
  status?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'status'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

**AssignLeadDto** (`dto/assign-lead.dto.ts`):
```typescript
export class AssignLeadDto {
  @IsString()
  @IsNotEmpty()
  assignedToId: string;
}
```

**ConvertLeadDto** (`dto/convert-lead.dto.ts`):
```typescript
export class ConvertLeadDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNumber()
  @IsPositive()
  dealValueCents: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

## Testing Strategy

### Unit Tests

**Location**: `backend/src/lead/lead.service.spec.ts` (505 lines)

**Coverage**:
- ✅ Service methods (happy path + error cases)
- ✅ DTO validation
- ✅ Business logic edge cases
- ✅ Status transition validation
- ✅ Organization isolation

**Key Test Suites**:
- `LeadService` → `create` (5 tests)
  - Happy path: create with customer
  - Error: customer not found
  - Error: vehicle not found
  - Happy path: create without customer
- `LeadService` → `findAll` (5 tests)
  - Pagination
  - Filter by status
  - Filter by source
  - Filter by assignedToId
  - Search by customer fields
- `LeadService` → `findOne` (2 tests)
  - Happy path: retrieve lead
  - Error: not found
- `LeadService` → `update` (7 tests)
  - Happy path: update lead
  - Error: lead not found
  - Validation: status transitions
  - Validation: customer exists
  - Validation: vehicle exists
- `LeadService` → `remove` (2 tests)
  - Happy path: delete
  - Error: not found
- `LeadService` → `assign` (4 tests)
  - Happy path: assign to user
  - Error: lead not found
  - Error: user not found
  - Error: user inactive
- `LeadService` → `convert` (5 tests)
  - Happy path: convert to deal
  - Error: already converted
  - Error: lead is lost
  - Error: vehicle not found
  - Error: no customer on lead

**Run**: `npm run test:unit -- lead`

### Integration Tests

**Location**: `backend/src/lead/lead.controller.integration.spec.ts`

**Expected Coverage**:
- ✅ Full request/response cycle
- ✅ Database interactions
- ✅ Authentication/authorization
- ✅ Error handling (400, 401, 403, 404, 500)
- ✅ Response format validation

**Run**: `npm run test:integration -- lead`

### E2E Tests

**Location**: `e2e-tests/tests/lead.spec.ts` (expected)

**Expected Coverage**:
- ✅ User workflows (end-to-end)
- ✅ Dashboard lead list → detail → assign → convert
- ✅ Multi-step interactions
- ✅ UI component behavior (forms, filters, modals)

**Run**: `cd e2e-tests && npm test -- lead`

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/lead.fixtures.ts`

**Factories**:
```typescript
export const createLead = (overrides?: Partial<Lead>) => ({
  id: 'lead-123',
  organizationId: 'org-1',
  customerId: 'cust-123',
  customerEmail: 'john@example.com',
  customerName: 'John Doe',
  customerPhone: '+1-555-0123',
  source: 'website',
  vehicleInterestId: 'vehicle-456',
  status: 'new',
  assignedToId: null,
  notes: 'Test lead',
  createdById: 'user-789',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const mockLeadWithRelations = {
  ...createLead(),
  customer: mockCustomer,
  assignedTo: mockUser,
  createdBy: mockUser,
  deals: [mockDealWithRelations],
};
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (global on all endpoints)
- **Token Location**: Authorization header (`Authorization: Bearer <token>`) or HttpOnly cookie (via refresh token flow)
- **Validation**: `jwt.strategy.ts` extracts user context and injects via `@CurrentUser()` decorator

### Authorization

- **Role Checks**: Currently **none**. All authenticated users have equal access. Future improvement: restrict write to managers/admins.
- **Organization Isolation**: All queries filtered by `organizationId` from JWT payload. Impossible to access other organization's leads.
- **Implementation**: Query filter applied in service layer (`where: { organizationId }`)

**Example Authorization Flow**:
```typescript
// Controller extracts user from token
@Get()
findAll(@Query() query: LeadQueryDto, @CurrentUser() user: User) {
  // user.organizationId passed to service
  return this.leadService.findAll(query, user.organizationId);
}

// Service filters all queries by organizationId
async findAll(query: LeadQueryDto, organizationId: string) {
  const where: any = { organizationId }; // Enforced
  // ... rest of query
}
```

### Input Validation

- **DTO Classes**: `class-validator` decorators on all DTOs
  - Email validation: `@IsEmail()`
  - String validation: `@IsString()`
  - Enum validation: `@IsIn(['new', 'contacted', ...])`
  - Type coercion: `@Type(() => Number)`
  - Ranges: `@IsInt()`, `@Min(1)`
- **Sanitization**: No explicit XSS/SQL injection prevention needed (Prisma parameterization prevents SQL injection, no HTML output from API)
- **File Uploads**: Not applicable (Lead feature doesn't handle file uploads)

### Rate Limiting

- **Global**: 100 req/min via `@nestjs/throttler` (configured in `main.ts`)
- **Endpoint-Specific**: Could override with `@Throttle(limit, ttl)` if needed (not currently used)

## Performance Optimization

### Database Queries

- **Indexes Used**:
  - `[organizationId]` - Multi-tenant filtering
  - `[status, assignedToId, createdAt]` - Dashboard query (most critical)
  - `[source, status]` - Analytics queries
- **N+1 Prevention**:
  - `findAll` includes relations in single query (customer, assignedTo, deals)
  - `findOne` includes all relations via `getScopedLead()`
  - No separate queries for relations
- **Pagination**: Offset-based pagination with configurable limit (default 10, max 100)
  - Calculate `skip = (page - 1) * limit`
  - Use `take: limit` in Prisma

### Caching

- **Hot Data**: Idempotency responses cached in Redis (24h TTL)
- **Cache Hit Rate**: Expected 5-10% on mutations (retry scenarios, duplicate requests)
- **No lead-specific caching**: Database + indexes sufficient for read performance

### Frontend Optimization

- **Code Splitting**: Lead components likely lazy-loaded (dynamic `import()`)
- **React Query**: Stale-while-revalidate strategy for lead list (background refetch on window focus)
- **Memoization**: `useMemo` for expensive filters/sorts (if client-side sorting implemented)

## Monitoring & Observability

### Logging

- **Level**: Info (production), Debug (development)
- **Format**: JSON via Pino logger
- **Key Events Logged**:
  - `lead.create` - Lead created with ID, source
  - `lead.update` - Lead updated, status change tracked
  - `lead.assign` - Assignment changed
  - `lead.convert` - Lead converted to deal
  - `lead.error` - Validation errors, not found, permission issues

**Example Log Entry**:
```json
{
  "level": "info",
  "message": "Lead created successfully",
  "leadId": "lead-123",
  "customerEmail": "john@example.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Metrics (Future)

- **Latency**: p50, p95, p99 for each endpoint
- **Error Rate**: 4xx, 5xx by endpoint
- **Business Metrics**:
  - Leads created per day
  - Conversion rate (converted / total)
  - Average time-to-convert
  - Leads by source (funnel analysis)

### Alerts (Future)

- **Error Spike**: >10 errors/min
- **Latency**: p99 > 2s (dashboard query)
- **Failed Conversions**: >5% of conversion attempts fail

## Deployment Considerations

### Environment Variables

**Backend** (`.env`):
```bash
# No lead-specific env vars needed (uses common configuration)
# Uses: DATABASE_URL, REDIS_HOST, REDIS_PASSWORD, JWT_SECRET
```

### Database Migrations

**Create Lead Tables**:
```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev --name "add-lead-model"  # Create migration
npx prisma migrate deploy  # Apply in production
```

**Rollback** (if needed):
```bash
# Manual process: restore from backup
# Prisma doesn't support easy rollback; redo migration with reverse logic
```

### Feature Flags

**Flag Name**: `enable_leads` (potential)
- **Default**: On
- **Rollout Strategy**: Instant (all users)
- **Implementation**: Could gate endpoint at controller level if needed

## Known Technical Debt

- [ ] **No Audit Trail**: Status changes not logged to audit table. Future: add `LeadAudit` table with timestamp + user context.
- [ ] **Hardcoded Status Workflow**: Transitions defined in code. Future: move to database/config for client customization.
- [ ] **No Lead Scoring**: No algorithm for quality/priority. Future: add scoring service.
- [ ] **No Bulk Operations**: Each lead modified individually. Future: add batch update endpoints.
- [ ] **Vehicle Interest Soft Reference**: No FK constraint on vehicleInterestId. Could lead to orphaned references.

## Troubleshooting

### Common Issues

**Issue**: "Lead not found" error even though ID is correct
- **Cause**: Lead belongs to different organization (multi-tenant isolation)
- **Fix**: Verify JWT token is for correct organization. Check `organizationId` in database.
- **Prevention**: Always use correct JWT token; contact support if unsure of organization

**Issue**: Status transition rejected (e.g., "cannot transition from X to Y")
- **Cause**: Invalid status progression attempted (e.g., new → converted, skipping contacted/qualified)
- **Fix**: Follow allowed transitions: new→contacted→qualified→converted, or new→lost
- **Prevention**: Understand workflow rules; only managers can see allowed transitions per status

**Issue**: Conversion fails with "Lead must have an associated customer"
- **Cause**: Lead created without `customerId`, and no customer linked before conversion
- **Fix**: Link customer to lead via PATCH update, or create customer first
- **Prevention**: Ensure customer exists before attempting conversion

**Issue**: Assignment fails with "User not found or inactive"
- **Cause**: Target user doesn't exist or is marked inactive in organization
- **Fix**: Verify user exists and is active. Contact admin to reactivate if needed.
- **Prevention**: Only assign to active users visible in team list

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check lead data directly
npx prisma studio
# Navigate to Lead table, filter by organizationId

# Check idempotency cache (if debugging duplicate creation issues)
redis-cli
> KEYS idempotency:*
> GET idempotency:<key>

# Database query analysis
# Check slow query log in PostgreSQL
# Use EXPLAIN ANALYZE in psql for query plans
```

## Development Workflow

### Adding New Functionality

Example: Add "priority" field to leads

1. **Update Prisma schema** → Add `priority String @default("medium")`
   ```bash
   npx prisma generate        # Regenerate client
   npx prisma migrate dev --name "add-lead-priority"  # Create migration
   ```

2. **Create migration**
   - Migration auto-created in `backend/prisma/migrations/`

3. **Update DTO classes**
   - Add `priority?: string` to `CreateLeadDto`
   - Add `@IsIn(['low', 'medium', 'high'])` validation

4. **Implement service method**
   - Update `create()`, `update()` to handle priority

5. **Add controller endpoint** (if new route needed)
   - Or extend existing endpoints

6. **Write tests** (unit → integration → E2E)
   - Unit test: priorityHandling in service
   - Integration: POST with priority field
   - E2E: Set priority in UI, verify in list

7. **Update documentation**
   - Update README.md (business) and TECHNICAL.md (this file)
   - Update API endpoints documentation

### Local Testing

```bash
# Backend unit tests
cd backend
npm run test:unit -- lead

# Backend integration tests
npm run test:integration -- lead

# Start dev server (hot reload)
npm run start:dev

# Test in Postman/curl
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer <token>"

# Frontend
cd frontend
npm run dev
# Test at http://localhost:3000/dashboard/leads

# E2E
cd e2e-tests
npm test -- lead
npm run test:headed -- lead  # With visible browser
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md)
- [API Standards](../../api/standards.md)
- [Testing Guide](../../testing/)
- [Prisma Schema](../../../backend/prisma/schema.prisma)
- [Authentication & JWT](../../security/authentication.md)

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/lead/lead.service.ts:68-620` (main logic)
- Controller: `backend/src/lead/lead.controller.ts:27-84` (7 endpoints)
- Unit Tests: `backend/src/lead/lead.service.spec.ts:1-505` (test coverage)
- Integration Tests: `backend/src/lead/lead.controller.integration.spec.ts`
- DTOs: `backend/src/lead/dto/*` (validation contracts)

## Architecture Decision Records (ADRs)

### ADR-001: Status Workflow as String Enum (Not DB Enum)
- **Date**: 2024-01-10 (estimated)
- **Context**: Need flexible lead status workflow. Database enum types require migration for changes.
- **Decision**: Store status as VARCHAR with validation in code. Allowed values: new, contacted, qualified, converted, lost.
- **Consequences**:
  - Trade-off: lose database-level constraint, but gain flexibility
  - Validation happens at service layer (validateStatusTransition)
  - Can add new statuses without migration

### ADR-002: Soft Reference for Vehicle Interest
- **Date**: 2024-01-10 (estimated)
- **Context**: Lead may reference vehicle of interest, but vehicle can be deleted without lead.
- **Decision**: `vehicleInterestId` is String field with no FK constraint. Soft reference.
- **Consequences**:
  - Trade-off: lose referential integrity, but allow leads without vehicle
  - Handle orphaned references in app logic (show "vehicle deleted")
  - Future: could add cleanup job to nullify orphaned references

### ADR-003: Transaction for Lead Conversion
- **Date**: 2024-01-10 (estimated)
- **Context**: Converting lead creates Deal + updates Lead status. Both must succeed or fail together.
- **Decision**: Wrap in `prisma.$transaction()` for atomicity.
- **Consequences**:
  - Ensures no partial conversions (data consistency)
  - Slight latency increase for transaction overhead
  - Retries handled by client (via idempotency-key)

---

**Last Technical Review**: 2025-12-28
**Reviewer**: AI Assistant (Claude)
**Next Review Due**: 2026-03-28
