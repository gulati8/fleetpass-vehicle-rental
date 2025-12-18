import { Vehicle } from '@prisma/client';
import { CreateVehicleDto } from '../../vehicle/dto/create-vehicle.dto';
import { VehicleQueryDto } from '../../vehicle/dto/vehicle-query.dto';
import { CheckAvailabilityDto } from '../../vehicle/dto/check-availability.dto';

/**
 * Create a test Vehicle object
 */
export function createTestVehicle(overrides?: Partial<Vehicle>): Vehicle {
  return {
    id: 'vehicle-123',
    locationId: 'location-123',
    vin: '1HGBH41JXMN109186',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    trim: 'LE',
    bodyType: 'sedan',
    exteriorColor: 'Silver',
    interiorColor: 'Black',
    transmission: 'automatic',
    fuelType: 'gas',
    mileage: 15000,
    dailyRateCents: 5000, // $50.00
    weeklyRateCents: 30000, // $300.00
    monthlyRateCents: 100000, // $1000.00
    features: {
      bluetooth: true,
      backupCamera: true,
      cruiseControl: true,
      airConditioning: true,
    },
    imageUrls: [
      'https://example.com/vehicle1.jpg',
      'https://example.com/vehicle2.jpg',
    ],
    isAvailableForRent: true,
    notes: 'Well maintained vehicle',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test Vehicle with location included
 */
export function createTestVehicleWithLocation(overrides?: Partial<Vehicle>) {
  const vehicle = createTestVehicle(overrides);
  return {
    ...vehicle,
    location: {
      id: vehicle.locationId,
      name: 'Main Dealership',
      addressLine1: '123 Main St',
      addressLine2: null,
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      phone: '+14155551234',
      organizationId: 'org-123',
    },
  };
}

/**
 * Create a test CreateVehicleDto
 */
export function createVehicleDto(
  overrides?: Partial<CreateVehicleDto>,
): CreateVehicleDto {
  return {
    vin: '1HGBH41JXMN109186',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    trim: 'LE',
    bodyType: 'sedan',
    exteriorColor: 'Silver',
    interiorColor: 'Black',
    transmission: 'automatic',
    fuelType: 'gas',
    mileage: 15000,
    dailyRateCents: 5000,
    weeklyRateCents: 30000,
    monthlyRateCents: 100000,
    features: {
      bluetooth: true,
      backupCamera: true,
    },
    imageUrls: [
      'https://example.com/vehicle1.jpg',
      'https://example.com/vehicle2.jpg',
    ],
    isAvailableForRent: true,
    notes: 'Well maintained vehicle',
    locationId: 'location-123',
    ...overrides,
  };
}

/**
 * Create a test VehicleQueryDto
 */
export function createVehicleQueryDto(
  overrides?: Partial<VehicleQueryDto>,
): VehicleQueryDto {
  return {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...overrides,
  };
}

/**
 * Create a test CheckAvailabilityDto
 */
export function createCheckAvailabilityDto(
  overrides?: Partial<CheckAvailabilityDto>,
): CheckAvailabilityDto {
  return {
    vehicleId: 'vehicle-123',
    startDate: '2024-06-01T10:00:00Z',
    endDate: '2024-06-05T10:00:00Z',
    ...overrides,
  };
}

/**
 * Create multiple test vehicles
 */
export function createTestVehicles(count: number): Vehicle[] {
  const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW'];
  const models = ['Camry', 'Accord', 'F-150', 'Silverado', '3 Series'];
  const bodyTypes = ['sedan', 'suv', 'truck', 'coupe'];

  return Array.from({ length: count }, (_, i) => {
    const makeIndex = i % makes.length;
    return createTestVehicle({
      id: `vehicle-${i + 1}`,
      vin: `1HGBH41JXMN10918${i.toString().padStart(1, '0')}`,
      make: makes[makeIndex],
      model: models[makeIndex],
      year: 2020 + (i % 4),
      bodyType: bodyTypes[i % bodyTypes.length] as any,
      dailyRateCents: 4000 + i * 500,
      mileage: 10000 + i * 1000,
    });
  });
}
