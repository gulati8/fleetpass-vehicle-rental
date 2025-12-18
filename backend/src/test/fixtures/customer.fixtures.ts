import { Customer } from '@prisma/client';
import { CreateCustomerDto } from '../../customer/dto/create-customer.dto';
import { CustomerQueryDto } from '../../customer/dto/customer-query.dto';

/**
 * Create a test Customer object
 */
export function createTestCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: 'customer-123',
    email: 'john.doe@example.com',
    phone: '+14155551234',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-15'),
    driverLicenseNumber: 'D1234567',
    driverLicenseState: 'CA',
    driverLicenseExpiry: new Date('2025-12-31'),
    kycStatus: 'pending',
    kycInquiryId: null,
    kycVerifiedAt: null,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a test Customer with bookings included
 */
export function createTestCustomerWithBookings(overrides?: Partial<Customer>) {
  const customer = createTestCustomer(overrides);
  return {
    ...customer,
    bookings: [
      {
        id: 'booking-1',
        bookingNumber: 'BP-2024-001234',
        customerId: customer.id,
        vehicleId: 'vehicle-1',
        pickupLocationId: 'location-1',
        dropoffLocationId: 'location-1',
        pickupDatetime: new Date('2024-06-01T10:00:00Z'),
        dropoffDatetime: new Date('2024-06-05T10:00:00Z'),
        dailyRateCents: 5000,
        numDays: 4,
        subtotalCents: 20000,
        taxCents: 1600,
        totalCents: 21600,
        mockStripePaymentIntentId: 'pi_mock123',
        depositCents: 10000,
        depositPaidAt: new Date('2024-05-25T14:30:00Z'),
        status: 'confirmed',
        createdById: null,
        notes: null,
        createdAt: new Date('2024-05-25T14:30:00Z'),
        updatedAt: new Date('2024-05-25T14:30:00Z'),
        vehicle: {
          id: 'vehicle-1',
          make: 'Toyota',
          model: 'Camry',
          year: 2023,
          vin: '1HGBH41JXMN109186',
        },
      },
    ],
    _count: {
      bookings: 5,
      leads: 2,
      deals: 1,
    },
  };
}

/**
 * Create a verified KYC customer
 */
export function createVerifiedCustomer(overrides?: Partial<Customer>): Customer {
  return createTestCustomer({
    kycStatus: 'approved',
    kycVerifiedAt: new Date('2024-01-02T10:00:00Z'),
    kycInquiryId: 'inq_mock123',
    stripeCustomerId: 'cus_mock123',
    ...overrides,
  });
}

/**
 * Add _count to customer for list responses
 */
export function createTestCustomerWithCount(overrides?: Partial<Customer>) {
  return {
    ...createTestCustomer(overrides),
    _count: {
      bookings: 0,
      leads: 0,
      deals: 0,
    },
  };
}

/**
 * Create a test CreateCustomerDto
 */
export function createCustomerDto(
  overrides?: Partial<CreateCustomerDto>,
): CreateCustomerDto {
  return {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+14155551234',
    dateOfBirth: '1990-01-15',
    driverLicenseNumber: 'D1234567',
    driverLicenseState: 'CA',
    driverLicenseExpiry: '2025-12-31',
    ...overrides,
  };
}

/**
 * Create a test CustomerQueryDto
 */
export function createCustomerQueryDto(
  overrides?: Partial<CustomerQueryDto>,
): CustomerQueryDto {
  return {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...overrides,
  };
}
