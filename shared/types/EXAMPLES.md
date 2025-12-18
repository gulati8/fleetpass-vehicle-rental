# Usage Examples

## Backend Examples

### Service Layer

```typescript
import { Injectable } from '@nestjs/common';
import {
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleWithLocation
} from '@shared/types';
import { PrismaService } from './prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateVehicleRequest): Promise<Vehicle> {
    return this.prisma.vehicle.create({
      data: dto,
    });
  }

  async findOne(id: string): Promise<VehicleWithLocation> {
    return this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateVehicleRequest): Promise<Vehicle> {
    return this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
  }
}
```

### Controller Layer

```typescript
import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import {
  ApiResponse,
  Vehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleWithLocation
} from '@shared/types';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  async create(
    @Body() dto: CreateVehicleRequest
  ): Promise<ApiResponse<Vehicle>> {
    const vehicle = await this.vehiclesService.create(dto);
    return {
      success: true,
      data: vehicle,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string
  ): Promise<ApiResponse<VehicleWithLocation>> {
    const vehicle = await this.vehiclesService.findOne(id);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleRequest
  ): Promise<ApiResponse<Vehicle>> {
    const vehicle = await this.vehiclesService.update(id, dto);
    return {
      success: true,
      data: vehicle,
    };
  }
}
```

## Frontend Examples

### API Client

```typescript
import {
  ApiResponse,
  Vehicle,
  VehicleWithLocation,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  VehicleFilters,
  ListResponse
} from '@shared/types';

class VehicleApiClient {
  private baseUrl = '/api/vehicles';

  async getAll(filters?: VehicleFilters): Promise<Vehicle[]> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${this.baseUrl}?${params}`);
    const data: ApiResponse<Vehicle[]> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch vehicles');
    }

    return data.data;
  }

  async getOne(id: string): Promise<VehicleWithLocation> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    const data: ApiResponse<VehicleWithLocation> = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch vehicle');
    }

    return data.data;
  }

  async create(vehicle: CreateVehicleRequest): Promise<Vehicle> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });

    const data: ApiResponse<Vehicle> = await response.json();

    if (!data.success) {
      throw new Error('Failed to create vehicle');
    }

    return data.data;
  }

  async update(id: string, updates: UpdateVehicleRequest): Promise<Vehicle> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data: ApiResponse<Vehicle> = await response.json();

    if (!data.success) {
      throw new Error('Failed to update vehicle');
    }

    return data.data;
  }
}

export const vehicleApi = new VehicleApiClient();
```

### React Component with TanStack Query

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vehicle,
  VehicleWithLocation,
  UpdateVehicleRequest,
  BookingStatus
} from '@shared/types';
import { vehicleApi } from '@/lib/api/vehicles';

export function VehicleDetail({ vehicleId }: { vehicleId: string }) {
  const queryClient = useQueryClient();

  // Fetch vehicle with type safety
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => vehicleApi.getOne(vehicleId),
  });

  // Update mutation with type safety
  const updateMutation = useMutation({
    mutationFn: (updates: UpdateVehicleRequest) =>
      vehicleApi.update(vehicleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
    },
  });

  const handleToggleAvailability = () => {
    if (!vehicle) return;

    updateMutation.mutate({
      isAvailableForRent: !vehicle.isAvailableForRent,
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading vehicle</div>;
  if (!vehicle) return <div>Vehicle not found</div>;

  // Full type safety on vehicle object
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">
        {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>

      <div className="mt-4">
        <p>VIN: {vehicle.vin}</p>
        <p>Location: {vehicle.location.name}</p>
        <p>Daily Rate: ${vehicle.dailyRateCents / 100}</p>
        <p>Available: {vehicle.isAvailableForRent ? 'Yes' : 'No'}</p>
      </div>

      <button
        onClick={handleToggleAvailability}
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? 'Updating...' : 'Toggle Availability'}
      </button>
    </div>
  );
}
```

### Form with react-hook-form + zod

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateVehicleRequest } from '@shared/types';

// Create Zod schema that matches the type
const vehicleSchema = z.object({
  locationId: z.string().uuid(),
  vin: z.string().min(17).max(17),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  dailyRateCents: z.number().min(0),
  exteriorColor: z.string().optional(),
  mileage: z.number().min(0).optional(),
}) satisfies z.ZodType<CreateVehicleRequest>;

type FormData = z.infer<typeof vehicleSchema>;

export function CreateVehicleForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const onSubmit = async (data: CreateVehicleRequest) => {
    await vehicleApi.create(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('vin')} placeholder="VIN" />
      {errors.vin && <span>{errors.vin.message}</span>}

      <input {...register('make')} placeholder="Make" />
      {errors.make && <span>{errors.make.message}</span>}

      <input {...register('model')} placeholder="Model" />
      {errors.model && <span>{errors.model.message}</span>}

      <input
        type="number"
        {...register('year', { valueAsNumber: true })}
        placeholder="Year"
      />
      {errors.year && <span>{errors.year.message}</span>}

      <button type="submit">Create Vehicle</button>
    </form>
  );
}
```

### Using Enums

```typescript
import { BookingStatus, LeadStatus, UserRole } from '@shared/types';

// Type-safe status checks
function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case BookingStatus.PENDING:
      return 'yellow';
    case BookingStatus.CONFIRMED:
      return 'blue';
    case BookingStatus.ACTIVE:
      return 'green';
    case BookingStatus.COMPLETED:
      return 'gray';
    case BookingStatus.CANCELLED:
      return 'red';
    default:
      // TypeScript ensures exhaustive checking
      const _exhaustive: never = status;
      return 'gray';
  }
}

// Type-safe role checks
function canManageUsers(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

// Type-safe lead filtering
const activeLeads = leads.filter(lead =>
  lead.status === LeadStatus.NEW ||
  lead.status === LeadStatus.CONTACTED
);
```

## Error Handling

### Backend Error Response

```typescript
import { ApiError } from '@shared/types';
import { HttpException, HttpStatus } from '@nestjs/common';

function throwApiError(message: string, statusCode: number): never {
  const error: ApiError = {
    success: false,
    error: {
      message,
      code: 'VEHICLE_NOT_FOUND',
      statusCode,
    },
  };
  throw new HttpException(error, statusCode);
}
```

### Frontend Error Handling

```typescript
import { ApiError } from '@shared/types';

async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    const error = data as ApiError;
    throw new Error(error.error.message);
  }

  return data.data;
}
```
