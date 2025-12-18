/**
 * Test file to verify types work correctly
 * This file is not meant to be executed, just type-checked
 */

import {
  // API types
  ApiResponse,
  ApiError,
  ListResponse,
  PaginationParams,

  // Domain types
  Vehicle,
  VehicleWithLocation,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  Booking,
  BookingWithRelations,
  CreateBookingRequest,
  Customer,
  User,
  Location,

  // Enums
  BookingStatus,
  UserRole,
  KycStatus,

  // Utils
  isApiError,
  isApiSuccess,
  formatCurrency,
  daysBetween,
} from './index';

// Test 1: API Response types
const vehiclesResponse: ApiResponse<Vehicle[]> = {
  success: true,
  data: [],
  timestamp: new Date().toISOString(),
};

const errorResponse: ApiError = {
  success: false,
  error: {
    message: 'Vehicle not found',
    code: 'VEHICLE_NOT_FOUND',
    statusCode: 404,
  },
};

// Test 2: Domain model types
const vehicle: Vehicle = {
  id: '123',
  locationId: '456',
  vin: '1HGCM82633A123456',
  make: 'Honda',
  model: 'Accord',
  year: 2023,
  trim: 'EX',
  bodyType: 'sedan',
  exteriorColor: 'Blue',
  interiorColor: 'Black',
  transmission: 'automatic',
  fuelType: 'gas',
  mileage: 15000,
  dailyRateCents: 7500, // $75.00
  weeklyRateCents: 45000, // $450.00
  monthlyRateCents: 150000, // $1500.00
  features: { bluetooth: true, backup_camera: true },
  imageUrls: ['https://example.com/image1.jpg'],
  isAvailableForRent: true,
  notes: 'Well maintained vehicle',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Test 3: Request/Response types
const createRequest: CreateVehicleRequest = {
  locationId: '456',
  vin: '1HGCM82633A123456',
  make: 'Honda',
  model: 'Accord',
  year: 2023,
  dailyRateCents: 7500,
};

const updateRequest: UpdateVehicleRequest = {
  mileage: 16000,
  dailyRateCents: 8000,
  isAvailableForRent: false,
};

// Test 4: Relations
const vehicleWithLocation: VehicleWithLocation = {
  ...vehicle,
  location: {
    id: '456',
    name: 'Downtown Location',
    addressLine1: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
  },
};

// Test 5: Enums
const status: BookingStatus = BookingStatus.CONFIRMED;
const role: UserRole = UserRole.ADMIN;
const kycStatus: KycStatus = KycStatus.APPROVED;

// Test 6: Type guards
function handleResponse(response: ApiResponse<Vehicle> | ApiError) {
  if (isApiError(response)) {
    console.error(response.error.message);
    return;
  }

  if (isApiSuccess<Vehicle>(response)) {
    console.log(response.data.make);
  }
}

// Test 7: Utility functions
const price = formatCurrency(vehicle.dailyRateCents); // "$75.00"
const numDays = daysBetween('2024-01-01', '2024-01-05'); // 4

// Test 8: Complex nested types
const bookingWithRelations: BookingWithRelations = {
  id: '789',
  bookingNumber: 'BP-2024-001234',
  customerId: 'c123',
  vehicleId: 'v456',
  pickupLocationId: 'l789',
  dropoffLocationId: 'l789',
  pickupDatetime: '2024-01-01T10:00:00Z',
  dropoffDatetime: '2024-01-05T10:00:00Z',
  dailyRateCents: 7500,
  numDays: 4,
  subtotalCents: 30000,
  taxCents: 3000,
  totalCents: 33000,
  mockStripePaymentIntentId: 'pi_123',
  depositCents: 10000,
  depositPaidAt: '2024-01-01T09:00:00Z',
  status: 'confirmed',
  createdById: 'u123',
  notes: null,
  createdAt: '2024-01-01T09:00:00Z',
  updatedAt: '2024-01-01T09:00:00Z',
  customer: {
    id: 'c123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1-555-0100',
  },
  vehicle: {
    id: 'v456',
    make: 'Honda',
    model: 'Accord',
    year: 2023,
    vin: '1HGCM82633A123456',
    imageUrls: ['https://example.com/image1.jpg'],
  },
  pickupLocation: {
    id: 'l789',
    name: 'Downtown Location',
    addressLine1: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
  },
  dropoffLocation: {
    id: 'l789',
    name: 'Downtown Location',
    addressLine1: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
  },
  createdBy: {
    id: 'u123',
    firstName: 'Jane',
    lastName: 'Smith',
  },
};

// Type checking passes!
console.log('All types are valid ✓');
