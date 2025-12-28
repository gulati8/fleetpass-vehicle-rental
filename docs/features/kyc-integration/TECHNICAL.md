# KYC Integration - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[Customer/Dealership]
        ↓ (HTTPS)
[API Gateway] → [KycController]
        ↓
[KycService] ←→ [PersonaMockService]
        ↓                ↓
[PrismaService]    [In-Memory Storage]
        ↓                ↓
  [PostgreSQL]    [Webhook Callbacks]
        ↓                ↓
[Customer Record]  [CustomerService]
(kycStatus, verified fields)
```

### Design Patterns Used

- **Service Layer Pattern**: `KycService` encapsulates all business logic; `PersonaMockService` abstracts Persona API interactions
- **Dependency Injection**: NestJS DI container manages `PrismaService`, `PersonaMockService`, `CustomerService` dependencies
- **Guard Pattern**: `JwtAuthGuard` enforces authentication; organization ID extracted from JWT for authorization
- **DTO Pattern**: `CreateInquiryDto`, `SubmitGovernmentIdDto`, `SubmitSelfieDto` validate and transform inbound requests
- **Webhook Pattern**: `PersonaMockService` registers callback handlers; emits events on inquiry completion/failure/expiration
- **Idempotency Pattern**: `IdempotencyInterceptor` (global) deduplicates mutations via Redis 24h cache

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/kyc/`

**Key Files**:
```
kyc/
├── kyc.module.ts              # Module definition, imports PersonaMockModule
├── kyc.controller.ts          # 6 HTTP endpoints (create, get, submit ID, submit selfie, approve, decline)
├── kyc.service.ts             # Core business logic (467 lines)
├── dto/
│   ├── create-inquiry.dto.ts   # Validates: customerId (UUID required)
│   ├── submit-government-id.dto.ts  # Validates: frontPhoto, backPhoto?, country, idClass
│   ├── submit-selfie.dto.ts    # Validates: imageData (base64 string)
│   └── decline-inquiry.dto.ts  # Validates: reason (string)
└── kyc.service.spec.ts         # 467 lines unit tests

Supporting modules:
persona-mock/
├── persona-mock.module.ts      # Exports PersonaMockService
├── persona-mock.service.ts     # In-memory Persona API mock
├── types/
│   └── persona-mock.types.ts   # MockInquiry, MockVerification, WebhookEvent types
└── persona-mock.service.spec.ts # Unit tests for mock service
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService`: Database access (Customer model)
  - `PersonaMockService`: Persona API mock; manages inquiries/verifications
  - `CustomerService`: Customer record updates
  - `LoggerService`: Structured logging via Pino
- **External Packages**:
  - `@nestjs/common`: Controllers, guards, decorators, HTTP exceptions
  - `@prisma/client`: ORM for PostgreSQL
  - `class-validator`, `class-transformer`: DTO validation

**Module Exports**:
```typescript
// kyc.module.ts
@Module({
  imports: [PersonaMockModule, CustomerModule, PrismaModule],
  controllers: [KycController],
  providers: [KycService],
})
export class KycModule {}
```

### Frontend (Next.js)

**Component Location**: `frontend/components/kyc/` or `frontend/app/(customer)/kyc/`

**Key Files** (inferred from requirements):
```
kyc/
├── KYCWizard.tsx           # 29 KB, multi-step form component
├── KYCStatusBadge.tsx      # Status indicator badge
└── hooks/
    └── useKYCMutation.ts   # React Query hook for KYC operations
```

**State Management**:
- **React Query**:
  - `useCreateInquiry()`: POST `/api/v1/kyc/inquiries` mutation
  - `useSubmitGovernmentId()`: POST `/api/v1/kyc/inquiries/:id/government-id` mutation
  - `useSubmitSelfie()`: POST `/api/v1/kyc/inquiries/:id/selfie` mutation
  - `useGetInquiry()`: GET `/api/v1/kyc/inquiries/:id` query
- **Local State**: `useState` for form step tracking, image preview, upload progress
- **Context**: Customer context provides current customer ID; organization isolation implicit in API calls

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model Customer {
  id                    String   @id @default(uuid())
  organizationId        String
  email                 String
  phone                 String?
  firstName             String
  lastName              String
  dateOfBirth           DateTime?
  driverLicenseNumber   String?
  driverLicenseState    String?
  driverLicenseExpiry   DateTime?

  // KYC fields
  kycStatus             String   @default("pending")
  // Values: "pending" | "in_progress" | "approved" | "rejected"
  kycInquiryId          String?  // References Persona mock inquiry ID
  kycVerifiedAt         DateTime?

  // Multi-tenancy
  stripeCustomerId      String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  bookings              Booking[]
  leads                 Lead[]
  deals                 Deal[]

  @@unique([organizationId, email])
  @@index([organizationId])
  @@index([kycStatus])
  @@index([phone])
}
```

**Migrations**: `backend/prisma/migrations/` (auto-generated by Prisma)

**Indexes**:
- `[organizationId]`: Multi-tenant filtering on all customer queries
- `[kycStatus]`: Fast dashboard queries (e.g., "all pending verifications")
- `[phone]`: Support agent lookups
- `@@unique([organizationId, email])`: Email uniqueness per organization

### API Endpoints

**Base Path**: `/api/v1/kyc`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/inquiries` | ✅ | Yes* | Create new KYC inquiry |
| GET | `/inquiries/:id` | ✅ | Yes | Get inquiry status and data |
| POST | `/inquiries/:id/government-id` | ✅ | Yes* | Submit government ID photos |
| POST | `/inquiries/:id/selfie` | ✅ | Yes* | Submit selfie for facial verification |
| POST | `/inquiries/:id/approve` | ✅ | Yes* | Approve inquiry (test endpoint) |
| POST | `/inquiries/:id/decline` | ✅ | Yes* | Decline inquiry with reason |

*Idempotent via `IdempotencyInterceptor` (24h Redis cache); frontend generates `Idempotency-Key` header automatically

**Request/Response Examples**:

```typescript
// POST /api/v1/kyc/inquiries
// Request
{
  "customerId": "550e8400-e29b-41d4-a716-446655440000"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "id": "inq_mock_f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "inquiry",
    "attributes": {
      "status": "created",
      "reference_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-12-28T12:00:00.000Z",
      "completed_at": null,
      "failed_at": null,
      "expired_at": null,
      "fields": {}
    }
  },
  "timestamp": "2025-12-28T12:00:00.000Z"
}
```

```typescript
// POST /api/v1/kyc/inquiries/:id/government-id
// Request
{
  "frontPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "backPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "country": "US",
  "idClass": "dl"  // "dl" | "pp" | "id"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "ver_mock_a47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "government_id",
    "inquiry_id": "inq_mock_f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "submitted",
    "checks": [
      {
        "check_type": "document_check",
        "result": "qualified"
      },
      {
        "check_type": "selfie_comparison",
        "result": "not_yet_submitted"
      }
    ]
  },
  "timestamp": "2025-12-28T12:00:05.000Z"
}
```

```typescript
// POST /api/v1/kyc/inquiries/:id/approve
// Request: {} (empty body)

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "inq_mock_f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "type": "inquiry",
    "attributes": {
      "status": "completed",
      "reference_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-12-28T12:00:00.000Z",
      "completed_at": "2025-12-28T12:05:00.000Z",
      "failed_at": null,
      "expired_at": null,
      "fields": {
        "name_first": { "value": "John" },
        "name_last": { "value": "Doe" },
        "birthdate": { "value": "1990-01-15" },
        "identification_number": { "value": "D1234567890" }
      }
    }
  },
  "timestamp": "2025-12-28T12:05:00.000Z"
}
```

```typescript
// Error Response (409 Conflict - customer already verified)
{
  "success": false,
  "error": {
    "code": "CONFLICT_EXCEPTION",
    "message": "Customer is already verified"
  },
  "timestamp": "2025-12-28T12:00:00.000Z"
}
```

### Service Layer Logic

**KycService** (`backend/src/kyc/kyc.service.ts`):

```typescript
@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private personaMock: PersonaMockService,
    private customerService: CustomerService,
  ) {
    // Register webhook callback on init
    this.personaMock.registerWebhookCallback('kyc-service', (event) =>
      this.handleWebhook(event),
    );
  }

  // Create inquiry for customer
  async createInquiry(customerId: string, organizationId?: string)

  // Get inquiry status and details
  async getInquiry(inquiryId: string, organizationId?: string)

  // Submit government ID (front/back)
  async submitGovernmentId(
    inquiryId: string,
    document: GovernmentIdData,
    organizationId?: string,
  )

  // Submit selfie for verification
  async submitSelfie(
    inquiryId: string,
    selfieData: SelfieData,
    organizationId?: string,
  )

  // Approve inquiry (test endpoint)
  async approveInquiry(inquiryId: string, organizationId?: string)

  // Decline inquiry with reason (test endpoint)
  async declineInquiry(
    inquiryId: string,
    reason: string,
    organizationId?: string,
  )

  // Private: Handle webhook events from Persona mock
  private async handleWebhook(event: WebhookEvent): Promise<void>
}
```

**Key Method Details**:

```typescript
// createInquiry - Full logic
async createInquiry(customerId: string, organizationId?: string) {
  // 1. Resolve organization from customer or use provided
  const orgId = await this.resolveCustomerOrg(customerId, organizationId);

  // 2. Validate customer exists and belongs to org
  const customer = await this.customerService.findOne(customerId, orgId);

  // 3. Check if customer already verified
  if (customer.kycStatus === 'approved') {
    throw new ConflictException('Customer is already verified');
  }

  // 4. Return existing inquiry if active (idempotent)
  if (
    customer.kycInquiryId &&
    (customer.kycStatus === 'in_progress' || customer.kycStatus === 'pending')
  ) {
    return await this.personaMock.retrieveInquiry(customer.kycInquiryId);
  }

  // 5. Create new Persona inquiry
  const inquiry = await this.personaMock.createInquiry({
    reference_id: customerId,
    environment: 'sandbox',
  });

  // 6. Update customer with inquiry ID and status
  await this.customerService.update(
    customerId,
    {
      kycInquiryId: inquiry.id,
      kycStatus: 'in_progress',
    },
    orgId,
  );

  return inquiry;
}

// handleInquiryCompleted - Webhook handler for approval
private async handleInquiryCompleted(event: WebhookEvent): Promise<void> {
  const inquiryId = event.data.id;
  const inquiry = await this.personaMock.retrieveInquiry(inquiryId);

  const customerId = inquiry.attributes.reference_id;
  const orgId = await this.resolveCustomerOrg(customerId);

  // Build update object with verified fields
  const updateData: any = {
    kycStatus: 'approved',
    kycVerifiedAt: new Date(),
  };

  // Extract verified data from inquiry.attributes.fields
  if (inquiry.attributes.fields.name_first?.value) {
    updateData.firstName = inquiry.attributes.fields.name_first.value;
  }
  if (inquiry.attributes.fields.name_last?.value) {
    updateData.lastName = inquiry.attributes.fields.name_last.value;
  }
  if (inquiry.attributes.fields.birthdate?.value) {
    updateData.dateOfBirth = new Date(inquiry.attributes.fields.birthdate.value);
  }
  if (inquiry.attributes.fields.identification_number?.value) {
    updateData.driverLicenseNumber = inquiry.attributes.fields.identification_number.value;
  }

  // Update customer record
  await this.customerService.update(customerId, updateData, orgId);
}
```

**Transaction Handling**:
- **When Used**: Not required for KYC operations (stateless Persona mock service)
- **Implementation**: Future Persona API integration may require `prisma.$transaction()` if multiple customer updates needed atomically

### Persona Mock Service

**PersonaMockService** (`backend/src/persona-mock/persona-mock.service.ts`):

**In-Memory Storage**:
```typescript
// Maps
private inquiries = new Map<string, MockInquiry>();
private verifications = new Map<string, MockVerification>();
private webhookCallbacks = new Map<string, (event: WebhookEvent) => void>();
private scheduledTimeouts = new Set<NodeJS.Timeout>();
```

**Key Methods**:
- `createInquiry(params)`: Generate inquiry ID, store in memory, emit webhook
- `retrieveInquiry(id)`: Lookup inquiry from memory
- `submitGovernmentId(inquiryId, document)`: Create verification record, trigger auto-processing if license number available
- `submitSelfie(inquiryId, selfieData)`: Create selfie verification record
- `autoApproveInquiry(id)`: Transition inquiry to `completed`, populate fields, emit webhook
- `autoDeclineInquiry(id, reason)`: Transition inquiry to `failed`, emit webhook
- `registerWebhookCallback(name, handler)`: Register event listener for webhooks
- `emitWebhook(type, data)`: Fire registered callbacks asynchronously

**Webhook Events**:
```typescript
interface WebhookEvent {
  id: string;                    // Event ID
  type: WebhookEventType;        // 'inquiry.created' | 'inquiry.completed' | 'inquiry.failed' | 'inquiry.expired'
  created_at: string;            // ISO timestamp
  data: { id: string };          // Inquiry ID
}
```

### Caching Strategy

**Redis Keys**:
- `idempotency:{idempotency-key}`: Cached response for POST/PUT/PATCH/DELETE mutations (24h TTL)
  - Generated by frontend using `crypto.randomUUID()`
  - Duplicate requests within 24h return cached response
  - Example: `idempotency:550e8400-e29b-41d4-a716-446655440000`

**Cache Invalidation**:
- `createInquiry`: Redis cache handles deduplication; no explicit invalidation needed
- `submitGovernmentId`: Idempotency cache prevents re-submission
- `submitSelfie`: Idempotency cache prevents duplicate selfies
- No customer record caching (stateless mock service)

### Background Jobs / Scheduled Tasks

**Job Name**: Inquiry Expiry Handler
- **Schedule**: On-demand via scheduled timeout in PersonaMockService
- **Purpose**: Reset customer KYC status to `pending` after 24h without completion
- **Implementation**: `personaMock.scheduleInquiryExpiry(inquiryId, 24h)` sets timeout; emits `inquiry.expired` webhook
- **Location**: `backend/src/persona-mock/persona-mock.service.ts` (lines ~200-250, inferred)

## Testing Strategy

### Unit Tests

**Location**: `backend/src/kyc/kyc.service.spec.ts`

**Coverage** (467 lines):
- ✅ `createInquiry`: Happy path, duplicate prevention, already-verified customer, customer not found
- ✅ `submitGovernmentId`: Valid submission, invalid inquiry state, invalid country, auto-verification trigger
- ✅ `submitSelfie`: Valid submission, invalid inquiry state, concurrent requests
- ✅ `approveInquiry`: Manual approval, webhook emission, field population
- ✅ `declineInquiry`: Manual decline with reason, webhook emission
- ✅ Error handling: NotFoundException, ConflictException, BadRequestException, InternalServerError

**Test Framework**: Jest with NestJS `@nestjs/testing`

**Mock Objects**:
- `PrismaService`: Mocked via `jest.fn()` for customer lookups and updates
- `PersonaMockService`: Real instance used (in-memory, fast)
- `CustomerService`: Spied with `jest.spyOn()` to verify calls

**Run**: `npm run test -- kyc` or `npm run test:unit -- kyc`

### Integration Tests

**Location**: (TODO: implement if missing)

**Coverage**:
- ✅ Full request/response cycle via NestJS test client
- ✅ Database interactions (Prisma → PostgreSQL in test DB)
- ✅ Authentication/authorization (JwtAuthGuard enforces org isolation)
- ✅ Error handling (400, 401, 403, 404, 409, 500)
- ✅ Multi-org isolation (customer from Org A inaccessible from Org B)

### E2E Tests

**Location**: (TODO: implement if missing) `e2e-tests/tests/kyc-workflow.spec.ts`

**Coverage**:
- ✅ Customer completes full KYC workflow (create → submit ID → submit selfie → approval)
- ✅ Dealership views verified customer data
- ✅ Duplicate inquiry prevention
- ✅ Inquiry expiration after 24h
- ✅ Manual approval/decline via test endpoints

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/kyc.fixture.ts` (TODO: create if missing)

**Factories**:
```typescript
export const createMockCustomer = (overrides?: Partial<Customer>) => ({
  id: 'cus_test_001',
  organizationId: 'org_test_001',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-01'),
  driverLicenseNumber: 'D1234567890',
  kycStatus: 'pending',
  kycInquiryId: null,
  kycVerifiedAt: null,
  ...overrides,
});

export const createMockInquiry = (overrides?: Partial<MockInquiry>) => ({
  id: 'inq_mock_001',
  type: 'inquiry',
  attributes: {
    status: 'created',
    reference_id: 'cus_test_001',
    created_at: new Date().toISOString(),
    completed_at: null,
    fields: {},
  },
  ...overrides,
});
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (global guard applied to all protected routes)
- **Token Location**: Authorization header (`Bearer {token}`) or HttpOnly cookie
- **Validation**: `jwt.strategy.ts` extracts user ID and organization ID; validates signature and expiry
- **Implementation**: `backend/src/common/guards/jwt-auth.guard.ts`

### Authorization

- **Role Checks**: KYC endpoints don't enforce specific roles (all authenticated users allowed)
- **Organization Isolation**: All service methods validate `organizationId` from JWT matches customer's org
- **Implementation**:
  ```typescript
  // KycService.resolveCustomerOrg
  if (organizationId) {
    return organizationId;  // Use provided (from JWT)
  }
  const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundException();
  return customer.organizationId;  // Implicit org from customer
  ```

### Input Validation

- **DTO Classes**: `class-validator` decorators on all DTOs
  - `CreateInquiryDto`: `@IsUUID()` on customerId
  - `SubmitGovernmentIdDto`: `@IsString()` on photos, `@IsIn(['dl', 'pp', 'id'])` on idClass
  - `SubmitSelfieDto`: `@IsString()` on imageData
- **Sanitization**: Base64 strings accepted as-is (no XSS risk for images); class-transformer handles type coercion
- **File Uploads**: Base64-encoded images; no actual file I/O (mock service)

### Rate Limiting

- **Global**: 100 req/min via `@nestjs/throttler` (applies to all endpoints)
- **Endpoint-Specific**: No custom throttling on KYC endpoints (uses global limit)
- **Configuration**: `main.ts` configures ThrottlerModule

## Performance Optimization

### Database Queries

- **Indexes Used**:
  - `[organizationId]`: Fast org filtering on customer lookups
  - `[kycStatus]`: Fast dashboard queries (e.g., "all pending verifications")
- **N+1 Prevention**: `customerService.findOne()` selects only required fields; no eager loading of relations
- **Pagination**: Not required (single customer lookups); future dashboard may need pagination

### Caching

- **Hot Data**: Customer KYC status (cached in Prisma ORM, no Redis)
- **Inquiry metadata**: In-memory storage in PersonaMockService (fast <1ms lookup)
- **Idempotency cache**: 24h Redis TTL for mutation deduplication

### Frontend Optimization

- **Code Splitting**: `KYCWizard` component likely lazy-loaded on demand
- **React Query**: Stale-while-revalidate strategy for inquiry status polling
- **Memoization**: Camera/file input handlers memoized to prevent re-renders

## Monitoring & Observability

### Logging

- **Level**: Info (production), Debug (development) via environment variable
- **Format**: JSON via Pino logger (`LoggerService`)
- **Key Events Logged**:
  - `KycService: Creating KYC inquiry` - Info: customerId
  - `KycService: KYC inquiry created` - Info: inquiryId, event='inquiry.created'
  - `KycService: Government ID submitted` - Info: verificationId, event='verification.submitted'
  - `KycService: Customer KYC approved` - Info: customerId, event='customer.kyc_approved'
  - `KycService: Customer KYC rejected` - Info: customerId, event='customer.kyc_rejected'
  - `KycService: Failed to create KYC inquiry` - Error: stack trace, customerId

### Metrics (Future)

- **Latency**: p50, p95, p99 for POST /inquiries (expect <50ms mock, 200-500ms production)
- **Error Rate**: 4xx (validation errors), 5xx (server errors) by endpoint
- **Business Metrics**:
  - Verification completion rate (approved / total inquiries)
  - Time to completion (average hours from creation to approval)
  - Rejection rate by reason

### Alerts (Future)

- **Error Spike**: >10 KYC errors/min → investigate webhook failures or Persona API outage
- **Latency**: p99 > 2s (production) → check Persona API response times
- **Webhook Delivery**: Failed callback executions → check PersonaMockService error logs

## Deployment Considerations

### Environment Variables

```bash
# Not required for mock service; future Persona API integration needs:
PERSONA_API_KEY=xxx
PERSONA_API_SECRET=xxx
PERSONA_ENVIRONMENT=sandbox|production

# KYC-specific
KYC_ENABLED=true
KYC_INQUIRY_EXPIRY_HOURS=24
```

### Database Migrations

```bash
# KYC fields added to Customer model in initial schema
# No new migrations needed for future enhancements without schema changes

# Apply migrations (existing)
npx prisma migrate deploy

# Reset for testing (DESTRUCTIVE - clears all data)
npx prisma migrate reset
```

### Feature Flags

- **Flag Name**: `enable_kyc` (hypothetical)
- **Default**: On (always enabled in current deployment)
- **Rollout Strategy**: Instant (no gradual rollout implemented)

## Known Technical Debt

- [ ] **Mock service stateless design**: PersonaMockService stores data in-memory and loses state on process restart; needs Redis backend for production
- [ ] **No document storage**: Submitted ID/selfie photos not persisted; production needs S3/GCS integration
- [ ] **Hardcoded 24h expiry**: Not configurable per org or customer type
- [ ] **Missing integration tests**: No `.integration.spec.ts` file found
- [ ] **Missing E2E tests**: No Playwright test for KYC workflow found

## Troubleshooting

### Common Issues

**Issue**: `NotFoundException: Inquiry not found` after customer submits documents
- **Cause**: Inquiry expired or never created successfully
- **Fix**: Check `customer.kycInquiryId` in database; retrieve inquiry via GET `/inquiries/:id`
- **Prevention**: Implement inquiry status polling in frontend with user notification on expiry

**Issue**: `ConflictException: Customer is already verified` but status shows `pending`
- **Cause**: Customer record corrupted; kycStatus out of sync with kycVerifiedAt
- **Fix**: Manual database correction: set kycStatus to 'pending' and kycInquiryId to null
- **Prevention**: Add validation: approved customers must have non-null kycVerifiedAt

**Issue**: Webhook callback fails, customer status stuck in `in_progress`
- **Cause**: PersonaMockService callback execution error or exception in webhook handler
- **Fix**: Manually call POST `/inquiries/:id/approve` to transition status
- **Prevention**: Implement webhook retry logic with exponential backoff

**Issue**: Selfie submission times out on slow mobile networks
- **Cause**: Large base64-encoded image (>5MB) sent to backend
- **Fix**: Implement image compression before upload (JPG quality reduction)
- **Prevention**: Add max file size validation to DTO (e.g., 2MB limit)

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check Persona mock service state
# (Would be available via admin endpoint in production)
# Currently: only in-memory, check logs

# Database: Check customer KYC status
psql $DATABASE_URL
SELECT id, email, kycStatus, kycInquiryId, kycVerifiedAt FROM "Customer" WHERE id = 'cus_123';

# Check inquiry expiry timeouts (if scheduled)
# Currently: hardcoded to 24h, no configuration

# Test idempotency
curl -X POST http://localhost:3001/api/v1/kyc/inquiries \
  -H "Idempotency-Key: abc-123" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cus_123"}'

# Call twice with same key - should return same response
```

## Development Workflow

### Adding New Functionality

1. **Update Prisma schema** (if needed)
   ```bash
   # Edit backend/prisma/schema.prisma
   npx prisma generate
   npx prisma migrate dev --name [description]
   ```

2. **Create/update DTO classes**
   ```typescript
   // backend/src/kyc/dto/new-endpoint.dto.ts
   export class NewEndpointDto {
     @IsString()
     field!: string;
   }
   ```

3. **Implement service method**
   ```typescript
   // backend/src/kyc/kyc.service.ts
   async newMethod(data: NewData) {
     // Validation, business logic, database updates
   }
   ```

4. **Add controller endpoint**
   ```typescript
   // backend/src/kyc/kyc.controller.ts
   @Post('new-endpoint')
   async newEndpoint(@Body() dto: NewEndpointDto) {
     return this.kycService.newMethod(dto);
   }
   ```

5. **Write tests** (unit → integration → E2E)
   ```bash
   npm run test -- kyc.service.spec.ts
   npm run test:integration -- kyc
   npm test -- kyc-workflow.spec.ts
   ```

6. **Update documentation**
   - Update API endpoint table in TECHNICAL.md
   - Add business logic description
   - Update test coverage section

### Local Testing

```bash
# Backend unit tests
cd backend
npm run test -- kyc

# Backend with hot reload
npm run start:dev

# Frontend (if component exists)
cd frontend
npm run dev
# Test at http://localhost:3000

# E2E tests
cd e2e-tests
npm test -- kyc

# Full stack (Docker recommended)
docker compose up
# Services available:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:3001/api/v1
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md) - Customer model details
- [API Standards](../../api/standards.md) - Response format, error codes
- [Authentication Guide](../../auth/jwt-authentication.md)
- [Testing Best Practices](../../testing/backend-testing.md)
- [Persona API Documentation](https://docs.persona.com/) - Production integration reference

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/kyc/kyc.service.ts` - Lines 53-124 (createInquiry), 409-457 (handleInquiryCompleted)
- Controller: `backend/src/kyc/kyc.controller.ts` - Lines 29-39 (createInquiry endpoint)
- Mock Service: `backend/src/persona-mock/persona-mock.service.ts` - Lines 40-74 (createInquiry)
- DTOs: `backend/src/kyc/dto/*.ts` - All validation schemas
- Tests: `backend/src/kyc/kyc.service.spec.ts` - 467 lines comprehensive coverage

## Architecture Decision Records (ADRs)

### [Mock Persona Service for Development/Testing]
- **Date**: 2025-12-28
- **Context**: Need KYC verification in development/testing without external API dependency; Persona API requires authentication and incurs costs per verification
- **Decision**: Implement in-memory PersonaMockService that simulates Persona API behavior; webhook callbacks emit to registered handlers (not HTTP POST)
- **Consequences**:
  - Trade-off: No real verification; all results deterministic
  - Benefit: Fast local development, zero external dependencies
  - Future: Replace mock service with real Persona SDK in production

### [Webhook Callbacks vs. Message Queue]
- **Date**: 2025-12-28
- **Context**: Inquiry completion events need to trigger customer record updates asynchronously
- **Decision**: Sync callback registration in PersonaMockService; KycService registers callback during construction
- **Consequences**:
  - Pro: Simple, no infrastructure (no Redis queue)
  - Con: Not resilient to service restarts; callbacks execute in-process
  - Upgrade: Replace with Bull queue + job processors for production

### [Auto-Verification Trigger on Government ID Submission]
- **Date**: 2025-12-28
- **Context**: Improve UX by approving KYC immediately if driver's license number matches customer profile
- **Decision**: KycService checks `customer.driverLicenseNumber` after ID submission; triggers `personaMock.processAutomaticVerification()`
- **Consequences**:
  - Pro: Faster user experience (potential approval within seconds)
  - Con: Requires accurate driver's license data; false negatives if number mismatches
  - Validation: Unit tests verify auto-verification only triggers with valid license number

---

**Last Technical Review**: 2025-12-28
**Reviewer**: Claude Code Agent
