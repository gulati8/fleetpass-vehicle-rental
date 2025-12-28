# [Feature Name] - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[External System] → [API Gateway] → [Feature Module] → [Database]
                                          ↓
                                    [Cache/Queue]
```

### Design Patterns Used
- **[Pattern Name]**: [Why and where it's used]
- **[Pattern Name]**: [Why and where it's used]

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/[module-name]/`

**Key Files**:
```
[module-name]/
├── [module].module.ts          # Module definition, imports, providers
├── [module].controller.ts      # HTTP endpoints (@Get, @Post, etc.)
├── [module].service.ts         # Business logic
├── dto/
│   ├── create-[entity].dto.ts  # Request validation schemas
│   └── update-[entity].dto.ts
├── entities/
│   └── [entity].entity.ts      # TypeORM/Prisma entity (if applicable)
└── [module].service.spec.ts    # Unit tests
```

**Dependencies**:
- **Injected Services**: `[ServiceName]`, `PrismaService`, `RedisService`
- **External Packages**: `package-name@version` - [purpose]

### Frontend (Next.js)

**Component Location**: `frontend/app/[route]/` or `frontend/components/`

**Key Files**:
```
[feature]/
├── page.tsx                    # Main route/page component
├── components/
│   ├── [Component].tsx         # Feature-specific components
│   └── [Component].test.tsx    # Component tests
└── hooks/
    └── use[Feature].ts         # Custom React hooks
```

**State Management**:
- **React Query**: `use[Feature]Query`, `use[Feature]Mutation`
- **Local State**: `useState`, `useReducer` - [what's stored]
- **Context**: `[Context]Provider` - [what's shared]

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model [ModelName] {
  id             String   @id @default(cuid())
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Feature-specific fields
  field1         String
  field2         Int?

  // Multi-tenancy
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Relations
  relatedEntity  RelatedModel @relation(fields: [relatedId], references: [id])
  relatedId      String

  @@index([organizationId])
  @@index([field1, organizationId]) // Query optimization
}
```

**Migrations**: `backend/prisma/migrations/YYYYMMDDHHMMSS_[description]/`

**Indexes**:
- `[organizationId]` - Multi-tenant filtering
- `[field1, organizationId]` - [Query pattern this optimizes]

### API Endpoints

**Base Path**: `/api/v1/[resource]`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| GET | `/[resource]` | ✅ | Yes | List all [resources] |
| GET | `/[resource]/:id` | ✅ | Yes | Get single [resource] |
| POST | `/[resource]` | ✅ | Yes* | Create new [resource] |
| PATCH | `/[resource]/:id` | ✅ | Yes* | Update [resource] |
| DELETE | `/[resource]/:id` | ✅ | Yes* | Delete [resource] |

_*Idempotent via `IdempotencyInterceptor` (24h Redis cache)_

**Request/Response Examples**:

```typescript
// POST /api/v1/[resource]
// Request
{
  "field1": "value",
  "field2": 123
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "cuid123",
    "field1": "value",
    "field2": 123,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field1": ["must be a string", "must not be empty"]
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Service Layer Logic

**Key Methods**:

```typescript
// [module].service.ts

class [Module]Service {
  // List with pagination
  async findAll(organizationId: string, page: number, limit: number) {
    // Implementation notes
  }

  // Single entity retrieval
  async findOne(id: string, organizationId: string) {
    // Implementation notes
  }

  // Creation
  async create(dto: Create[Entity]Dto, organizationId: string) {
    // Validation steps
    // Business logic
    // Database transaction
  }

  // Update
  async update(id: string, dto: Update[Entity]Dto, organizationId: string) {
    // Implementation notes
  }

  // Deletion
  async remove(id: string, organizationId: string) {
    // Cascade delete handling
  }
}
```

**Transaction Handling**:
- **When Used**: [Scenarios requiring transactions]
- **Implementation**: `prisma.$transaction([...])`

### Caching Strategy

**Redis Keys**:
- `[feature]:[organizationId]:[identifier]` - [What's cached]
- TTL: [Duration] - [Rationale]

**Cache Invalidation**:
- On `create`: Invalidate list cache
- On `update`: Invalidate specific entity + list cache
- On `delete`: Invalidate specific entity + list cache

### Background Jobs / Scheduled Tasks

**Job Name**: `[JobName]`
- **Schedule**: Cron expression or trigger
- **Purpose**: [What it does]
- **Implementation**: `@nestjs/schedule` or queue
- **Location**: `backend/src/[module]/jobs/[job].ts`

## Testing Strategy

### Unit Tests

**Location**: `backend/src/[module]/*.spec.ts`

**Coverage**:
- ✅ Service methods (happy path + error cases)
- ✅ DTO validation
- ✅ Business logic edge cases

**Key Test Files**:
- `[module].service.spec.ts` - [Coverage percentage]%

**Run**: `npm run test:unit -- [module]`

### Integration Tests

**Location**: `backend/src/[module]/*.integration.spec.ts`

**Coverage**:
- ✅ Full request/response cycle
- ✅ Database interactions
- ✅ Authentication/authorization
- ✅ Error handling (400, 401, 403, 404, 500)

**Run**: `npm run test:integration -- [module]`

### E2E Tests

**Location**: `e2e-tests/tests/[feature].spec.ts`

**Coverage**:
- ✅ User workflows (end-to-end)
- ✅ Multi-step interactions
- ✅ UI component behavior

**Run**: `cd e2e-tests && npm test -- [feature]`

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/[module].fixture.ts`

**Factories**:
```typescript
export const create[Entity] = (overrides?: Partial<[Entity]>) => ({
  id: 'test-id',
  field1: 'default-value',
  ...overrides
});
```

## Security Implementation

### Authentication
- **Method**: JWT via `JwtAuthGuard`
- **Token Location**: Authorization header or cookie
- **Validation**: `jwt.strategy.ts` extracts user context

### Authorization
- **Role Checks**: `@Roles()` decorator + `RolesGuard`
- **Organization Isolation**: All queries filtered by `organizationId` from JWT
- **Implementation**: `backend/src/[module]/guards/` (if custom)

### Input Validation
- **DTO Classes**: `class-validator` decorators
- **Sanitization**: [Any XSS/SQL injection prevention]
- **File Uploads**: [Validation rules for uploads, if applicable]

### Rate Limiting
- **Global**: 100 req/min (via `@nestjs/throttler`)
- **Endpoint-Specific**: `@Throttle(limit, ttl)` overrides

## Performance Optimization

### Database Queries
- **Indexes Used**: `[field1, organizationId]` for `WHERE` clauses
- **N+1 Prevention**: `include: { relatedEntity: true }` in Prisma
- **Pagination**: Cursor-based or offset-based

### Caching
- **Hot Data**: [What's cached in Redis]
- **Cache Hit Rate**: [Expected %]

### Frontend Optimization
- **Code Splitting**: Dynamic `import()` for heavy components
- **React Query**: Stale-while-revalidate strategy
- **Memoization**: `useMemo`, `useCallback` for expensive operations

## Monitoring & Observability

### Logging
- **Level**: Info (production), Debug (development)
- **Format**: JSON via Pino logger
- **Key Events Logged**:
  - `[module].create` - [What's logged]
  - `[module].error` - [Error scenarios]

### Metrics (Future)
- **Latency**: p50, p95, p99 for API endpoints
- **Error Rate**: 4xx, 5xx by endpoint
- **Business Metrics**: [Feature-specific KPIs]

### Alerts (Future)
- **Error Spike**: >10 errors/min
- **Latency**: p99 > 2s

## Deployment Considerations

### Environment Variables
```bash
# Feature-specific env vars
FEATURE_ENABLED=true
FEATURE_API_KEY=xxx
```

### Database Migrations
```bash
# Apply migrations
npx prisma migrate deploy

# Rollback (if needed)
# Manual process: restore from backup
```

### Feature Flags
- **Flag Name**: `enable_[feature]`
- **Default**: [On/Off]
- **Rollout Strategy**: [Gradual, instant, org-based]

## Known Technical Debt

- [ ] [Issue 1]: [Description and proposed fix]
- [ ] [Issue 2]: [Description and proposed fix]

## Troubleshooting

### Common Issues

**Issue**: [Error message or symptom]
- **Cause**: [Root cause]
- **Fix**: [Resolution steps]
- **Prevention**: [How to avoid]

**Issue**: [Error message or symptom]
- **Cause**: [Root cause]
- **Fix**: [Resolution steps]

### Debug Tips
```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Check Redis cache
redis-cli
> KEYS [feature]:*

# Database query analysis
# Check slow query log in Prisma Studio
```

## Development Workflow

### Adding New Functionality
1. Update Prisma schema (if needed) → `npx prisma generate`
2. Create migration → `npx prisma migrate dev --name [description]`
3. Update DTO classes
4. Implement service method
5. Add controller endpoint
6. Write tests (unit → integration → E2E)
7. Update this documentation

### Local Testing
```bash
# Backend
cd backend
npm run test -- [module]

# Frontend
cd frontend
npm run dev
# Test in browser at http://localhost:3000

# E2E
cd e2e-tests
npm test -- [feature]
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md)
- [API Standards](../../api/standards.md)
- [Testing Guide](../../testing/)
- [Prisma Schema](../../../backend/prisma/schema.prisma)

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/[module]/[module].service.ts:123`
- Controller: `backend/src/[module]/[module].controller.ts:45`
- Frontend Component: `frontend/app/[route]/page.tsx:67`
- Tests: `backend/src/[module]/[module].service.spec.ts`

## Architecture Decision Records (ADRs)

### [Decision Title]
- **Date**: YYYY-MM-DD
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Consequences**: [Trade-offs, impacts]

---

**Last Technical Review**: YYYY-MM-DD
**Reviewer**: [Name]
