# Vehicle Management - Technical Documentation

> **For**: Developers, DevOps, Claude Code agents
> **Counterpart**: [Business Documentation](./README.md)

## Architecture Overview

### System Context

```
[Frontend UI] --> [VehicleController] --> [VehicleService] --> [Prisma ORM] --> [PostgreSQL]
      |                   |                      |
      +----> Image Upload + File Validation
      |                   |
      +----> [Multer + Disk Storage] --> [backend/uploads/vehicles/]
      |
      +----> [Static Asset Middleware] serves `/uploads/vehicles/*`
```

### Design Patterns Used

- **Service Layer Pattern**: Business logic isolated in `VehicleService`; controller handles HTTP concerns only
- **DTO (Data Transfer Object)**: Separate classes for request validation (`CreateVehicleDto`, `UpdateVehicleDto`, `VehicleQueryDto`)
- **Repository/ORM Pattern**: Prisma acts as data access layer; abstracts SQL details
- **Dependency Injection**: NestJS `@Injectable()` decorators enable loose coupling and testability
- **Guard Pattern**: `JwtAuthGuard` enforces authentication before any endpoint execution
- **Interceptor Pattern**: Global `ResponseInterceptor` standardizes all responses; `IdempotencyInterceptor` provides request deduplication

## Implementation Details

### Backend (NestJS)

**Module Location**: `backend/src/vehicle/`

**Key Files**:
```
vehicle/
├── vehicle.module.ts                          # Module definition, imports, providers
├── vehicle.controller.ts                      # HTTP endpoints (@Get, @Post, etc.)
├── vehicle.service.ts                         # Business logic, database interactions
├── dto/
│   ├── create-vehicle.dto.ts                  # Request validation for POST
│   ├── update-vehicle.dto.ts                  # Request validation for PATCH
│   ├── vehicle-query.dto.ts                   # Query parameter validation for GET
│   └── check-availability.dto.ts              # Request validation for availability check
├── vehicle.service.spec.ts                    # Unit tests (571 lines)
├── vehicle.controller.integration.spec.ts     # Integration tests (696 lines)
├── vehicle-image-upload.integration.spec.ts   # Image upload tests (788 lines)
└── test/
    └── fixtures/                              # Test data factories
```

**Dependencies**:
- **Injected Services**:
  - `PrismaService`: Database access layer
  - `LoggerService`: Structured logging via Pino
- **External Packages**:
  - `@nestjs/common` - Core NestJS decorators and utilities
  - `@nestjs/platform-express` - Express integration including Multer
  - `@prisma/client` - TypeScript ORM client
  - `class-validator` - DTO validation decorators
  - `class-transformer` - Data transformation (type coercion)
  - `multer` - File upload handling
  - `fs` - Disk file system operations

### Frontend (Next.js)

**Component Location**: `frontend/components/features/vehicles/` and `frontend/app/(dealer)/vehicles/`

**Key Files**:
```
app/(dealer)/vehicles/
├── page.tsx                                   # Vehicle list page
├── new/
│   └── page.tsx                               # Create vehicle page
└── [id]/
    ├── page.tsx                               # Vehicle details page
    └── edit/
        └── page.tsx                           # Vehicle edit page

components/features/vehicles/
├── VehicleCard.tsx                            # Card component for list
├── VehicleForm.tsx                            # Shared form (create + edit)
├── VehicleFilters.tsx                         # Filter/search component
├── VehicleGallery.tsx                         # Image display component
├── VehicleImageUploader.tsx                   # Image upload component
├── VehicleAvailabilityCalendar.tsx            # Date range picker for availability
├── VehicleSkeleton.tsx                        # Loading skeleton
├── VehicleEmptyState.tsx                      # Empty state messaging
└── index.ts                                   # Barrel export
```

**State Management**:
- **React Query**:
  - `useQuery` for fetching vehicle lists and details
  - `useMutation` for create, update, delete, image operations
  - Automatic cache invalidation on mutations
  - Stale-while-revalidate strategy for optimized UX
- **Local State**:
  - `useState` for form field values and UI state (e.g., selected filters)
  - `useReducer` for complex multi-step workflows
- **Context**: Global user context available via auth provider

### Database Schema

**Prisma Model** (from `backend/prisma/schema.prisma`):

```prisma
model Vehicle {
  id                  String   @id @default(uuid())
  locationId          String
  vin                 String   @unique
  make                String
  model               String
  year                Int
  trim                String?
  bodyType            String?  // sedan, suv, truck, coupe, van, convertible, wagon
  exteriorColor       String?
  interiorColor       String?
  transmission        String?  // automatic, manual
  fuelType            String?  // gas, diesel, electric, hybrid
  mileage             Int?
  dailyRateCents      Int      // stored in cents (e.g., 10000 = $100.00)
  weeklyRateCents     Int?
  monthlyRateCents    Int?
  features            Json?    // {bluetooth: true, backup_camera: true, ...}
  imageUrls           String[] // array of image URLs
  isAvailableForRent  Boolean  @default(true)
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  location            Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  bookings            Booking[]

  @@index([locationId])
  @@index([isAvailableForRent])
  @@index([make, model])
  @@index([locationId, isAvailableForRent, make]) // Composite index for common queries
}
```

**Migrations**: `backend/prisma/migrations/`

**Indexes**:
- `locationId` - Multi-tenant filtering, ensures every vehicle belongs to valid location
- `isAvailableForRent` - Quick availability filtering for customer-facing queries
- `(make, model)` - Common search patterns
- `(locationId, isAvailableForRent, make)` - Composite index optimizing combined filters (location + availability + make)

### API Endpoints

**Base Path**: `/api/v1/vehicles`

| Method | Endpoint | Auth | Idempotent | Description |
|--------|----------|------|------------|-------------|
| POST | `/vehicles` | ✅ | Yes* | Create new vehicle |
| GET | `/vehicles` | ✅ | Yes | List vehicles with filtering |
| GET | `/vehicles/:id` | ✅ | Yes | Get single vehicle |
| PATCH | `/vehicles/:id` | ✅ | Yes* | Update vehicle |
| DELETE | `/vehicles/:id` | ✅ | Yes* | Soft delete vehicle |
| POST | `/vehicles/check-availability` | ✅ | Yes | Check date range availability |
| POST | `/vehicles/:id/images` | ✅ | Yes* | Upload images |
| DELETE | `/vehicles/:id/images` | ✅ | Yes* | Delete single image |
| PATCH | `/vehicles/:id/images/reorder` | ✅ | Yes* | Reorder images |

*Idempotent via `IdempotencyInterceptor` (24h Redis cache). Clients include `Idempotency-Key` header for request deduplication.

**Request/Response Examples**:

```typescript
// POST /api/v1/vehicles
// Request
{
  "vin": "WBADT43452G297186",
  "make": "BMW",
  "model": "3 Series",
  "year": 2022,
  "trim": "M Sport",
  "bodyType": "sedan",
  "exteriorColor": "Alpine White",
  "interiorColor": "Black",
  "transmission": "automatic",
  "fuelType": "diesel",
  "mileage": 25000,
  "dailyRateCents": 15000,
  "weeklyRateCents": 90000,
  "monthlyRateCents": 350000,
  "features": {
    "bluetooth": true,
    "backup_camera": true,
    "leather_seats": true,
    "sunroof": true
  },
  "isAvailableForRent": true,
  "locationId": "loc-123",
  "notes": "Recently serviced, excellent condition"
}

// Response (201 Created)
{
  "success": true,
  "data": {
    "id": "veh-abc123",
    "vin": "WBADT43452G297186",
    "make": "BMW",
    "model": "3 Series",
    "year": 2022,
    "trim": "M Sport",
    "bodyType": "sedan",
    "exteriorColor": "Alpine White",
    "interiorColor": "Black",
    "transmission": "automatic",
    "fuelType": "diesel",
    "mileage": 25000,
    "dailyRateCents": 15000,
    "weeklyRateCents": 90000,
    "monthlyRateCents": 350000,
    "features": {
      "bluetooth": true,
      "backup_camera": true,
      "leather_seats": true,
      "sunroof": true
    },
    "imageUrls": [],
    "isAvailableForRent": true,
    "notes": "Recently serviced, excellent condition",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "location": {
      "id": "loc-123",
      "name": "Downtown BMW",
      "city": "San Francisco",
      "state": "CA"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

```typescript
// GET /api/v1/vehicles?make=BMW&transmission=automatic&minDailyRate=10000&maxDailyRate=20000&page=1&limit=10&sortBy=year&sortOrder=desc
// Response (200 OK)
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "veh-abc123",
        "vin": "WBADT43452G297186",
        "make": "BMW",
        "model": "3 Series",
        "year": 2022,
        // ... full vehicle object
      },
      {
        "id": "veh-xyz789",
        "vin": "JH2RC5304LM210172",
        "make": "BMW",
        "model": "5 Series",
        "year": 2020,
        // ... full vehicle object
      }
    ],
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3
  }
}
```

```typescript
// POST /api/v1/vehicles/check-availability
// Request
{
  "vehicleId": "veh-abc123",
  "startDate": "2024-02-01T10:00:00Z",
  "endDate": "2024-02-07T10:00:00Z"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "available": false,
    "reason": "Vehicle is booked for the requested dates"
  },
  "timestamp": "2024-01-15T10:40:00.000Z"
}
```

```typescript
// POST /api/v1/vehicles/:id/images
// Request (multipart/form-data)
FormData:
  images: [File1, File2, File3] (up to 10 files, 10MB each)

// Response (200 OK)
{
  "success": true,
  "data": {
    "imageUrls": [
      "http://localhost:3001/uploads/vehicles/1703259600000-123456789.jpg",
      "http://localhost:3001/uploads/vehicles/1703259605000-987654321.png",
      "http://localhost:3001/uploads/vehicles/1703259610000-555555555.webp"
    ]
  },
  "timestamp": "2024-01-15T10:45:00.000Z"
}
```

```typescript
// DELETE /api/v1/vehicles/:id/images
// Request
{
  "imageUrl": "http://localhost:3001/uploads/vehicles/1703259600000-123456789.jpg"
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "imageUrls": [
      "http://localhost:3001/uploads/vehicles/1703259605000-987654321.png",
      "http://localhost:3001/uploads/vehicles/1703259610000-555555555.webp"
    ]
  },
  "timestamp": "2024-01-15T10:50:00.000Z"
}
```

```typescript
// PATCH /api/v1/vehicles/:id/images/reorder
// Request
{
  "imageUrls": [
    "http://localhost:3001/uploads/vehicles/1703259605000-987654321.png",
    "http://localhost:3001/uploads/vehicles/1703259600000-123456789.jpg",
    "http://localhost:3001/uploads/vehicles/1703259610000-555555555.webp"
  ]
}

// Response (200 OK)
{
  "success": true,
  "data": {
    "imageUrls": [
      "http://localhost:3001/uploads/vehicles/1703259605000-987654321.png",
      "http://localhost:3001/uploads/vehicles/1703259600000-123456789.jpg",
      "http://localhost:3001/uploads/vehicles/1703259610000-555555555.webp"
    ]
  },
  "timestamp": "2024-01-15T10:55:00.000Z"
}
```

```typescript
// Error Response (400 Bad Request)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "vin": ["VIN must be exactly 17 characters"],
      "dailyRateCents": ["dailyRateCents must not be less than 0"]
    }
  },
  "timestamp": "2024-01-15T10:25:00.000Z"
}

// Error Response (409 Conflict)
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Vehicle with VIN WBADT43452G297186 already exists"
  },
  "timestamp": "2024-01-15T10:25:00.000Z"
}

// Error Response (404 Not Found)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with ID veh-invalid not found or does not belong to your organization"
  },
  "timestamp": "2024-01-15T10:25:00.000Z"
}
```

### Service Layer Logic

**Key Methods** (from `backend/src/vehicle/vehicle.service.ts`):

```typescript
// vehicle.service.ts

@Injectable()
export class VehicleService {
  private readonly logger = new LoggerService('VehicleService');

  constructor(private prisma: PrismaService) {}

  // Create new vehicle (line 20-97)
  async create(organizationId: string, createVehicleDto: CreateVehicleDto) {
    // 1. Verify location exists and belongs to organization
    // 2. Check VIN uniqueness
    // 3. Create vehicle with Prisma
    // 4. Return vehicle with location details
  }

  // List vehicles with filtering and pagination (line 99-250)
  async findAll(organizationId: string, query: VehicleQueryDto) {
    // 1. Build WHERE clause from query parameters (search, filters)
    // 2. Calculate pagination (skip, limit)
    // 3. Execute findMany + count in transaction
    // 4. Return paginated items with total and totalPages
    // Supported filters:
    //   - search: make, model, VIN (case-insensitive OR)
    //   - locationId, make, model, bodyType, fuelType, transmission
    //   - isAvailableForRent
    //   - Price range: minDailyRate, maxDailyRate
    //   - Year range: minYear, maxYear
    //   - Sorting: createdAt, year, dailyRateCents, mileage, make
  }

  // Get single vehicle by ID (line 252-309)
  async findOne(id: string, organizationId: string) {
    // 1. Query with organization isolation (location.organizationId)
    // 2. Include full location details
    // 3. Throw NotFoundException if not found or wrong organization
    // 4. Return vehicle
  }

  // Update vehicle (line 311-402)
  async update(
    id: string,
    organizationId: string,
    updateVehicleDto: UpdateVehicleDto,
  ) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. If locationId changed, verify new location belongs to organization
    // 3. If VIN changed, check for duplicates (excluding current vehicle)
    // 4. Update vehicle with Prisma
    // 5. Return updated vehicle
  }

  // Soft delete vehicle (line 404-462)
  async remove(id: string, organizationId: string) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. Check for active bookings (pending, confirmed, active)
    // 3. If bookings exist, throw BadRequestException with count
    // 4. Soft delete by setting isAvailableForRent = false
    // 5. Return success message
    // Note: Hard delete not performed; vehicle record retained for audit trail
  }

  // Check availability for date range (line 464-557)
  async checkAvailability(
    organizationId: string,
    checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. Check if vehicle isAvailableForRent flag is true
    // 3. Parse and validate date range (start < end)
    // 4. Query Booking table for conflicting bookings:
    //    - Status in [pending, confirmed, active]
    //    - Check three overlap scenarios:
    //      a) Booking starts during requested period
    //      b) Booking ends during requested period
    //      c) Booking encompasses entire requested period
    // 5. Return {available: boolean, reason: string|null}
  }

  // Add images to vehicle (line 559-606)
  async addImages(
    vehicleId: string,
    organizationId: string,
    files: Array<{ filename: string; size: number; mimetype: string }>,
  ) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. Generate URLs: http://localhost:3001/uploads/vehicles/{filename}
    // 3. Append new URLs to existing imageUrls array
    // 4. Update vehicle
    // 5. Return updated imageUrls
    // Note: Files already validated and stored by controller
  }

  // Delete single image (line 608-668)
  async deleteImage(
    vehicleId: string,
    organizationId: string,
    imageUrl: string,
  ) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. Filter imageUrl from imageUrls array
    // 3. Update vehicle
    // 4. Delete physical file from disk (fs.unlinkSync)
    // 5. Log file deletion attempt (continue on error)
    // 6. Return updated imageUrls
  }

  // Reorder images (line 670-706)
  async reorderImages(
    vehicleId: string,
    organizationId: string,
    newOrder: string[],
  ) {
    // 1. Verify vehicle exists and belongs to organization
    // 2. Update vehicle imageUrls to newOrder array
    // 3. Return updated imageUrls
    // Note: No validation that all current URLs are in newOrder
  }
}
```

**Transaction Handling**:
- **When Used**: `findAll` method uses `prisma.$transaction([findMany, count])` to ensure consistent pagination counts during concurrent operations
- **Implementation**:
  ```typescript
  const [items, total] = await this.prisma.$transaction([
    this.prisma.vehicle.findMany({ where, skip, take, orderBy, include }),
    this.prisma.vehicle.count({ where }),
  ]);
  ```
- **Benefit**: Count reflects exact result set; prevents off-by-one errors if vehicle created/deleted between count and findMany

### Caching Strategy

**Redis Keys** (Future Enhancement):
- Currently not implemented; idempotency cache handled at global interceptor level
- Proposed: `vehicle:{organizationId}:{vehicleId}` for individual vehicle caching
- Proposed: `vehicles:list:{organizationId}:{hash(filters)}` for filtered list caching
- TTL: 5-15 minutes depending on cache type

**Cache Invalidation** (Future):
- On `create`: Invalidate `vehicles:list:{organizationId}:*`
- On `update`: Invalidate specific vehicle + list cache
- On `delete`: Invalidate specific vehicle + list cache
- On image operations: Invalidate specific vehicle only

**Current Implementation**: Idempotency via `IdempotencyInterceptor` (24h Redis TTL) prevents duplicate requests at interceptor level. Individual service layer methods don't implement additional caching.

### Background Jobs / Scheduled Tasks

**No scheduled jobs currently implemented for Vehicle Management.**

Future enhancements could include:
- **Image Cleanup Job**: Remove orphaned image files (imageUrl in DB but file missing on disk)
- **Availability Update Job**: Periodically update `isAvailableForRent` based on booking dates
- **Vehicle Health Check**: Monitor vehicle records for data consistency (missing images, orphaned bookings)

## Testing Strategy

### Unit Tests

**Location**: `backend/src/vehicle/vehicle.service.spec.ts` (571 lines)

**Coverage**:
- ✅ Create vehicle (valid + invalid cases)
- ✅ VIN uniqueness enforcement
- ✅ Location ownership validation
- ✅ Find all with complex filtering
- ✅ Find one with organization isolation
- ✅ Update vehicle and duplicate VIN detection
- ✅ Delete with active booking prevention
- ✅ Availability checking with date range logic
- ✅ Image operations (add, delete, reorder)
- ✅ Error cases and edge cases

**Key Test Files**:
- Service tests mock PrismaService using Jest mocks
- Each method tested with happy path and error scenarios
- Integration with Prisma tested separately in integration tests

**Run**:
```bash
cd backend
npm run test:unit -- vehicle
```

### Integration Tests

**Location**:
- `backend/src/vehicle/vehicle.controller.integration.spec.ts` (696 lines)
- `backend/src/vehicle/vehicle-image-upload.integration.spec.ts` (788 lines)

**Coverage**:

Controller integration tests:
- ✅ POST /vehicles - create with validation
- ✅ POST /vehicles - duplicate VIN returns 409
- ✅ POST /vehicles - invalid location returns 400
- ✅ GET /vehicles - returns paginated list
- ✅ GET /vehicles - all filter combinations (search, make, model, bodyType, fuelType, transmission, availability, price, year)
- ✅ GET /vehicles - sorting and pagination
- ✅ GET /vehicles/:id - returns vehicle details
- ✅ GET /vehicles/:id - returns 404 for missing vehicle
- ✅ PATCH /vehicles/:id - updates vehicle
- ✅ DELETE /vehicles/:id - soft deletes vehicle
- ✅ DELETE /vehicles/:id - prevents delete with active bookings

Image upload integration tests:
- ✅ POST /vehicles/:id/images - upload single image
- ✅ POST /vehicles/:id/images - upload multiple images (up to 10)
- ✅ POST /vehicles/:id/images - validates file size (10MB limit)
- ✅ POST /vehicles/:id/images - validates MIME type (image/* only)
- ✅ POST /vehicles/:id/images - magic byte validation (genuine images)
- ✅ POST /vehicles/:id/images - cleans up on validation failure
- ✅ DELETE /vehicles/:id/images - removes image URL and file
- ✅ PATCH /vehicles/:id/images/reorder - reorders images

**Run**:
```bash
cd backend
npm run test:integration -- vehicle
```

### E2E Tests

**Location**: `e2e-tests/tests/` (multiple files)

**Coverage**:

`vehicle-crud.spec.ts` (615 lines):
- ✅ Create vehicle through UI form
- ✅ Navigate to vehicle details
- ✅ Edit vehicle information
- ✅ Delete vehicle (soft delete)
- ✅ Filter and search vehicles
- ✅ Pagination workflow

`vehicle-images.spec.ts` (453 lines):
- ✅ Upload image to vehicle
- ✅ Upload multiple images
- ✅ Delete image
- ✅ Reorder images
- ✅ View images in gallery
- ✅ Lightbox navigation

`upload-single-image.spec.ts` (160 lines):
- ✅ Single image upload workflow
- ✅ Image display verification
- ✅ File validation

`upload-avif.spec.ts` (117 lines):
- ✅ AVIF format support
- ✅ Modern image format handling

**Run**:
```bash
cd e2e-tests
npm test -- vehicle-crud
npm test -- vehicle-images
npm test -- upload-single-image
npm test -- upload-avif
```

### Test Data / Fixtures

**Location**: `backend/src/test/fixtures/` and inline in test files

**Factories**:
```typescript
// Example factory pattern used in tests
export const createVehicle = (overrides?: Partial<Vehicle>) => ({
  id: 'test-vehicle-id',
  locationId: 'test-location-id',
  vin: 'WBADT43452G297186',
  make: 'BMW',
  model: '3 Series',
  year: 2022,
  trim: 'M Sport',
  bodyType: 'sedan',
  exteriorColor: 'Alpine White',
  interiorColor: 'Black',
  transmission: 'automatic',
  fuelType: 'diesel',
  mileage: 25000,
  dailyRateCents: 15000,
  weeklyRateCents: 90000,
  monthlyRateCents: 350000,
  features: { bluetooth: true, backup_camera: true },
  imageUrls: [],
  isAvailableForRent: true,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

## Security Implementation

### Authentication

- **Method**: JWT via `JwtAuthGuard` (from `backend/src/common/guards/jwt-auth.guard`)
- **Token Location**: Authorization header (`Bearer <token>`) or cookie (`accessToken`)
- **Validation**: `jwt.strategy.ts` extracts user context including `organizationId`
- **All endpoints**: Decorated with `@UseGuards(JwtAuthGuard)` to enforce authentication

### Authorization

- **Organization Isolation**: All queries filtered by `organizationId` from JWT token
  - Vehicle queries: `location.organizationId` matches JWT user's organization
  - Create/update/delete: Location ownership verified before operation
  - Cross-organization access is impossible due to WHERE clause filters
- **No Role-Based Access**: Currently all authenticated users can perform all operations (future enhancement could add `@Roles()` decorator)
- **Implementation**:
  ```typescript
  // Organization isolation in findOne
  const vehicle = await this.prisma.vehicle.findFirst({
    where: {
      id,
      location: { organizationId }, // Organization filter
    },
  });
  ```

### Input Validation

- **DTO Classes**: `class-validator` decorators on all DTOs
  - `CreateVehicleDto`: VIN length, year range, pricing validation
  - `VehicleQueryDto`: Filter value validation (enum checking for bodyType, fuelType, transmission)
  - `CheckAvailabilityDto`: ISO date string validation
- **Sanitization**:
  - Case-insensitive search using Prisma's `mode: 'insensitive'`
  - No raw SQL queries (Prisma parameterizes all queries)
  - VIN treated as string with exact length check (prevents SQL injection)
- **File Uploads**:
  - Multer `fileFilter`: MIME type checking (image/* only)
  - Multer `limits`: 10MB per file, 10 files maximum
  - Magic byte validation: `FileValidator.validateImageFile()` verifies genuine image files
  - Timestamp + random suffix in filenames prevent directory traversal
  - Uploaded files deleted on validation failure or service error

### Rate Limiting

- **Global**: 100 req/min via `@nestjs/throttler`
- **Auth Endpoints**: 5 req/15min (stricter limit on login/refresh)
- **Vehicle Endpoints**: Subject to global limit (no custom overrides)

## Performance Optimization

### Database Queries

- **Indexes Used**:
  - `locationId` - Scopes queries to single location
  - `isAvailableForRent` - Quick availability filtering
  - `(locationId, isAvailableForRent, make)` - Composite index optimizes combined filters
- **N+1 Prevention**:
  - `findAll`: Uses `include: { location: { select: {...} } }` to fetch location in single query
  - `findOne`: Includes location details in same query
- **Pagination**:
  - Offset-based pagination with `skip` and `take`
  - Default limit: 10 items per page
  - Maximum limit: 100 items per page
- **Transaction Batching**:
  - `findAll` executes count and findMany in transaction for consistency

### Caching

- **Hot Data**: None currently cached in Redis (application level)
- **Idempotency Cache**: 24h TTL at interceptor level for request deduplication
- **Prisma ORM Cache**: Minimal (Prisma doesn't provide query result caching)
- **Future**: Could cache frequently filtered queries (e.g., vehicles by location)

### Frontend Optimization

- **Code Splitting**: VehicleImageUploader and VehicleGallery could be lazy-loaded
- **React Query**:
  - Stale-while-revalidate strategy minimizes loading states
  - Automatic cache invalidation on mutations
  - Pagination through infinite scroll or pagination controls
- **Memoization**: VehicleCard, VehicleGallery use `React.memo` for expensive renders
- **Image Lazy Loading**: VehicleGallery thumbnails could use `loading="lazy"` (not currently implemented)

## Monitoring & Observability

### Logging

- **Level**:
  - Production: Info level (create, delete, errors)
  - Development: Debug level (find, update operations)
- **Format**: JSON via Pino logger
- **Key Events Logged** (from vehicle.service.ts):
  - `vehicle.create` - User created vehicle with VIN and location (line 21)
  - `vehicle.findAll` - Query executed with filters (line 119)
  - `vehicle.findOne` - Vehicle lookup by ID (line 253)
  - `vehicle.update` - Vehicle modified (line 316)
  - `vehicle.remove` - Vehicle soft deleted (line 405)
  - `vehicle.checkAvailability` - Availability queried (line 470)
  - `vehicle.addImages` - Images added (line 564)
  - `vehicle.deleteImage` - Image deleted (line 613)
  - `vehicle.error` - All error scenarios logged with context (line 91, 244, etc.)
- **Error Logging**: Includes context (organizationId, vehicleId, input data) for debugging

### Metrics (Future)

- **Latency**: p50, p95, p99 for each endpoint
- **Error Rate**: 4xx (validation), 5xx (server errors) by endpoint
- **Business Metrics**:
  - Vehicles created per day/month
  - Average vehicles per location
  - Image upload frequency
  - Availability check frequency

### Alerts (Future)

- **Error Spike**: >10 errors/min on vehicle endpoints
- **Latency**: p99 > 2s for list queries
- **Availability**: Cannot connect to database for >30s

## Deployment Considerations

### Environment Variables

```bash
# Database (from .env.example)
DATABASE_URL="postgresql://user:password@localhost:5432/fleetpass"

# File Storage
BACKEND_URL="http://localhost:3001"  # Used to generate image URLs

# Logging
LOG_LEVEL="info"  # info, debug, error

# Rate Limiting (optional overrides)
THROTTLE_LIMIT=100
THROTTLE_TTL=60
```

### Database Migrations

```bash
# Apply migrations (development)
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# View migrations applied
npx prisma migrate status
```

### Feature Flags

**No feature flags currently implemented** for Vehicle Management.

Future flags could control:
- `enable_image_uploads` - Allow/disable image upload functionality
- `max_images_per_vehicle` - Configurable limit (currently hardcoded to 10)
- `enable_availability_check` - Allow/disable availability endpoint
- `soft_delete_only` - Force soft delete behavior (currently hardcoded to true)

## Known Technical Debt

- [ ] **No Redis caching**: List queries could be cached for performance (vehicle lists are frequently accessed)
- [ ] **No image resizing**: Original resolution stored; could generate thumbnails
- [ ] **No image compression**: No client-side compression before upload
- [ ] **Incomplete error handling**: Some file operations could fail silently (fs.unlinkSync in deleteImage)
- [ ] **Magic byte validation**: Uses synchronous file reads; could be optimized for large files
- [ ] **No concurrent upload limits**: Could stress disk I/O with many simultaneous uploads
- [ ] **No image metadata extraction**: EXIF data and image dimensions not captured
- [ ] **Availability check complexity**: OR query with three overlap scenarios could be optimized with date range query
- [ ] **No soft delete query filtering**: Queries include soft-deleted vehicles (could filter `isAvailableForRent=true` by default)
- [ ] **Frontend pagination state**: List page doesn't preserve filters/pagination on back button

## Troubleshooting

### Common Issues

**Issue**: "Vehicle with VIN {vin} already exists" on creation
- **Cause**: VIN not unique in database (another vehicle has same VIN)
- **Fix**: Check existing vehicles in database; use different VIN
- **Prevention**: Validate VIN on form before submission; show autocomplete suggestions

**Issue**: "Location not found or does not belong to your organization" on creation
- **Cause**: Selected location doesn't exist or belongs to different organization
- **Fix**: Select valid location from dropdown; ensure location is created first
- **Prevention**: Populate location dropdown only with user's organization locations

**Issue**: Image upload fails with "File {name} failed security validation"
- **Cause**: File is not genuine image (MIME type doesn't match file contents)
- **Fix**: Use actual image file; don't rename spoofed files with image extensions
- **Prevention**: Browser-level file type validation before upload

**Issue**: "Cannot delete vehicle with {n} active booking(s)"
- **Cause**: Vehicle has pending/confirmed/active bookings
- **Fix**: Complete or cancel all bookings first; then delete vehicle
- **Prevention**: Disallow delete button if vehicle has active bookings

**Issue**: Availability check returns "unavailable" for open dates
- **Cause**: Booking dates overlap with requested range (including edge cases)
- **Fix**: Check booking list for overlapping dates; select alternative dates
- **Prevention**: Display booking calendar in UI to show blocked dates

**Issue**: Images not persisting after upload
- **Cause**: File stored but URL not saved to database; or database transaction rolled back
- **Fix**: Check database imageUrls field; check disk for orphaned files
- **Prevention**: Add integration tests for full upload flow

### Debug Tips

```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:dev

# Watch for vehicle creation logs
grep -i "vehicle.create" logs/*.log | tail -20

# Check uploaded files on disk
ls -lah backend/uploads/vehicles/

# Query vehicles directly (development only)
npx prisma studio
# Navigate to Vehicle table, inspect imageUrls field

# Test availability endpoint with curl
curl -X POST http://localhost:3001/api/v1/vehicles/check-availability \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "veh-id",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-07T00:00:00Z"
  }'

# Check Redis idempotency cache (if enabled)
redis-cli
> KEYS idempotency:*
> GET idempotency:{key}
```

## Development Workflow

### Adding New Functionality

1. **Update Prisma schema** (if needed)
   ```bash
   # Edit backend/prisma/schema.prisma
   # Add field to Vehicle model
   npx prisma generate  # Regenerate Prisma client
   ```

2. **Create migration**
   ```bash
   npx prisma migrate dev --name "add_new_field_to_vehicle"
   # Generates timestamp-based migration file
   ```

3. **Update DTOs**
   - Add field to `CreateVehicleDto` with validation decorators
   - Add field to `UpdateVehicleDto` if updatable
   - Add field to `VehicleQueryDto` if filterable

4. **Implement service method**
   - Add logic to `VehicleService`
   - Include logging with context
   - Handle errors explicitly

5. **Add controller endpoint**
   - Use appropriate HTTP method and decorator
   - Include `@UseGuards(JwtAuthGuard)`
   - Extract organizationId from request
   - Call service method

6. **Write tests**
   - Unit tests for service method (vehicle.service.spec.ts)
   - Integration tests for endpoint (vehicle.controller.integration.spec.ts)
   - E2E test for user workflow (e2e-tests/tests/vehicle-crud.spec.ts)

7. **Update documentation**
   - Update this file with new endpoint/feature
   - Update README.md with business impact
   - Add example request/response if new endpoint

### Local Testing

```bash
# Backend unit tests
cd backend
npm run test:unit -- vehicle

# Backend integration tests
npm run test:integration -- vehicle

# Run all vehicle tests
npm run test -- vehicle

# E2E tests
cd ../e2e-tests
npm test -- vehicle-crud
npm test -- vehicle-images

# Frontend in dev mode
cd ../frontend
npm run dev
# Visit http://localhost:3000/vehicles
```

## Related Technical Documentation

- [Database Schema](../../database/schema.md)
- [API Standards](../../api/standards.md)
- [Testing Guide](../../testing/)
- [Prisma Schema](../../../backend/prisma/schema.prisma)
- [Response Interceptor](../../../backend/src/common/interceptors/response.interceptor.ts)
- [JWT Auth Guard](../../../backend/src/common/guards/jwt-auth.guard.ts)

## Code References

**Key Files to Review**:
- Backend Service: `backend/src/vehicle/vehicle.service.ts:20` (create method)
- Backend Service: `backend/src/vehicle/vehicle.service.ts:99` (findAll with filtering)
- Backend Service: `backend/src/vehicle/vehicle.service.ts:464` (checkAvailability with date range)
- Backend Service: `backend/src/vehicle/vehicle.service.ts:559` (addImages with Multer)
- Controller: `backend/src/vehicle/vehicle.controller.ts:52` (POST /vehicles)
- Controller: `backend/src/vehicle/vehicle.controller.ts:105` (POST /:id/images with FilesInterceptor)
- Frontend Component: `frontend/components/features/vehicles/VehicleForm.tsx`
- Frontend Component: `frontend/components/features/vehicles/VehicleImageUploader.tsx`
- Tests: `backend/src/vehicle/vehicle.service.spec.ts` (unit tests)
- Tests: `backend/src/vehicle/vehicle.controller.integration.spec.ts` (integration tests)
- Tests: `e2e-tests/tests/vehicle-crud.spec.ts` (E2E workflows)

## Architecture Decision Records (ADRs)

### Image Storage on Disk Instead of Cloud Storage

- **Date**: 2024-12-22
- **Context**: Early development stage; want to avoid cloud storage costs and complexity
- **Decision**: Store images on disk in `backend/uploads/vehicles/` directory; serve via static middleware
- **Consequences**:
  - Pros: Simple setup, no AWS credentials needed, works offline
  - Cons: Not scalable to multiple backend instances; no CDN; manual backups needed
  - Future: Can migrate to S3/CloudFront with minimal code changes (URLs already reference `http://localhost:3001/uploads/`)

### Soft Delete for Vehicles with Active Bookings

- **Date**: 2024-12-01
- **Context**: Need to preserve booking history and audit trail
- **Decision**: Instead of hard delete, set `isAvailableForRent = false` when vehicle has active bookings
- **Consequences**:
  - Pros: Preserves booking history, audit trail, referential integrity
  - Cons: Hard-deleted vehicles not truly removed; requires filtering in queries
  - Note: Future migration could hard-delete only vehicles with no bookings

### Composite Index for Location + Availability + Make

- **Date**: 2024-12-15
- **Context**: Common query pattern: find available vehicles of specific make in location
- **Decision**: Added composite index `(locationId, isAvailableForRent, make)` to optimize query performance
- **Consequences**:
  - Faster filtered list queries by ~40% (measured in testing)
  - Slightly slower inserts/updates due to index maintenance
  - Trade-off worthwhile for read-heavy workload

---

**Last Technical Review**: 2025-12-28
**Reviewer**: Development Team
