# FleetPass Shared Types

Single source of truth for TypeScript types used across frontend and backend.

## Structure

```
shared/types/
├── index.ts                # Main export (use this for imports)
├── api.types.ts           # Generic API types (ApiResponse, ApiError, etc.)
├── auth.types.ts          # Authentication & JWT types
├── user.types.ts          # User domain types
├── organization.types.ts  # Organization types
├── location.types.ts      # Location types
├── vehicle.types.ts       # Vehicle types
├── customer.types.ts      # Customer types
├── booking.types.ts       # Booking types
├── lead.types.ts          # Lead types
└── deal.types.ts          # Deal types
```

## Usage

### Backend (NestJS)

```typescript
import { CreateVehicleRequest, Vehicle, ApiResponse } from '@shared/types';

@Injectable()
export class VehiclesService {
  async create(dto: CreateVehicleRequest): Promise<Vehicle> {
    // Implementation
  }
}
```

### Frontend (Next.js/React)

```typescript
import { Vehicle, VehicleWithLocation, ApiResponse } from '@shared/types';

async function fetchVehicles(): Promise<Vehicle[]> {
  const response = await fetch('/api/vehicles');
  const data: ApiResponse<Vehicle[]> = await response.json();
  return data.data;
}
```

## Type Categories

### API Wrapper Types
- `ApiResponse<T>` - Standard success response wrapper
- `ApiError` - Standard error response
- `PaginationParams` - Query params for pagination
- `ListResponse<T>` - Paginated list response

### Request/Response Types
Each domain has:
- Base model type (matches Prisma schema exactly)
- `Create{Model}Request` - POST request payload
- `Update{Model}Request` - PATCH request payload
- `{Model}WithRelations` - Model with joined relations
- `{Model}Filters` - Query params for filtering/searching

### Enums
- `UserRole` - User roles (admin, manager, sales_agent, support)
- `BookingStatus` - Booking lifecycle states
- `KycStatus` - KYC verification states
- `LeadStatus` - Lead pipeline stages
- `LeadSource` - Lead origin channels
- `DealStatus` - Deal lifecycle states

## Design Principles

1. **Match Prisma Schema**: All base types match Prisma models exactly
2. **Date Strings**: All dates are ISO 8601 strings (not Date objects)
3. **Cents for Money**: All currency values stored in cents (integer)
4. **Nullable Fields**: Explicitly typed as `| null` to match DB schema
5. **Request DTOs**: Separate types for create/update operations
6. **Relations**: `With{Relation}` types for common joins

## Maintenance

When updating Prisma schema:
1. Update corresponding type file in `shared/types/`
2. Update related Request/Response types
3. Run `npm run build` in both backend and frontend to verify

## Path Alias Configuration

Both projects use `@shared/types` path alias:

**Backend** (`backend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/types": ["../shared/types"]
    }
  }
}
```

**Frontend** (`frontend/tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/types": ["../shared/types"]
    }
  }
}
```
