import { Location } from '@prisma/client';
import { CreateLocationDto } from '../../location/dto/create-location.dto';
import { LocationQueryDto } from '../../location/dto/location-query.dto';

/**
 * Create a test Location object
 */
export function createTestLocation(
  overrides?: Partial<Location>,
): Location {
  return {
    id: 'location-123',
    organizationId: 'org-123',
    name: 'Main Dealership',
    addressLine1: '123 Main St',
    addressLine2: null,
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    phone: '+14155551234',
    hoursOfOperation: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '10:00', close: '16:00' },
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test Location with organization included
 */
export function createTestLocationWithOrganization(
  overrides?: Partial<Location>,
) {
  const location = createTestLocation(overrides);
  return {
    ...location,
    organization: {
      id: location.organizationId,
      name: 'Test Organization',
      slug: 'test-org',
    },
    _count: {
      vehicles: 5,
    },
  };
}

/**
 * Create a test CreateLocationDto
 */
export function createLocationDto(
  overrides?: Partial<CreateLocationDto>,
): CreateLocationDto {
  return {
    name: 'Main Dealership',
    addressLine1: '123 Main St',
    addressLine2: undefined,
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    phone: '+14155551234',
    hoursOfOperation: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '10:00', close: '16:00' },
    },
    ...overrides,
  };
}

/**
 * Create a test LocationQueryDto
 */
export function createLocationQueryDto(
  overrides?: Partial<LocationQueryDto>,
): LocationQueryDto {
  return {
    page: 1,
    limit: 10,
    ...overrides,
  };
}
