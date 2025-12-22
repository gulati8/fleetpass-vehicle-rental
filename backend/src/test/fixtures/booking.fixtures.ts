import { Booking, Customer, Vehicle, Location } from '@prisma/client';

export const mockCustomer: Customer = {
  id: 'customer-1',
  organizationId: 'org-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  dateOfBirth: new Date('1990-01-01'),
  driverLicenseNumber: 'DL123456',
  driverLicenseState: 'CA',
  driverLicenseExpiry: new Date('2025-12-31'),
  kycStatus: 'approved',
  kycInquiryId: null,
  kycVerifiedAt: new Date(),
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockLocation: Location = {
  id: 'location-1',
  organizationId: 'org-1',
  name: 'Downtown Location',
  addressLine1: '456 Market St',
  addressLine2: null,
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94103',
  country: 'US',
  latitude: null,
  longitude: null,
  phone: '+1234567891',
  hoursOfOperation: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockVehicle: Vehicle = {
  id: 'vehicle-1',
  locationId: 'location-1',
  vin: 'VIN12345',
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  trim: null,
  bodyType: 'sedan',
  exteriorColor: 'Silver',
  interiorColor: null,
  transmission: 'automatic',
  fuelType: 'gas',
  mileage: 5000,
  dailyRateCents: 5000, // $50.00
  weeklyRateCents: null,
  monthlyRateCents: null,
  isAvailableForRent: true,
  features: { bluetooth: true, gps: true },
  imageUrls: [],
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockBooking: Booking = {
  id: 'booking-1',
  organizationId: 'org-1',
  bookingNumber: 'BP-2024-001',
  customerId: 'customer-1',
  vehicleId: 'vehicle-1',
  pickupLocationId: 'location-1',
  dropoffLocationId: 'location-1',
  pickupDatetime: new Date('2024-01-01T10:00:00Z'),
  dropoffDatetime: new Date('2024-01-05T10:00:00Z'),
  dailyRateCents: 5000,
  numDays: 4,
  subtotalCents: 20000,
  taxCents: 0,
  totalCents: 20000,
  mockStripePaymentIntentId: null,
  depositCents: 10000, // $100.00
  depositPaidAt: null,
  status: 'pending',
  createdById: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const createMockBooking = (
  overrides?: Partial<Booking>,
): Booking => ({
  ...mockBooking,
  ...overrides,
});

export const createMockCustomer = (
  overrides?: Partial<Customer>,
): Customer => ({
  ...mockCustomer,
  ...overrides,
});

export const createMockVehicle = (
  overrides?: Partial<Vehicle>,
): Vehicle => ({
  ...mockVehicle,
  ...overrides,
});

export const createMockLocation = (
  overrides?: Partial<Location>,
): Location => ({
  ...mockLocation,
  ...overrides,
});
