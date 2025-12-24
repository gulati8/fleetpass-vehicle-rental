/**
 * Booking status enum
 */
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Booking model (matches Prisma schema)
 */
export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  pickupDatetime: string;
  dropoffDatetime: string;
  dailyRateCents: number;
  numDays: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  mockStripePaymentIntentId: string | null;
  depositCents: number;
  depositPaidAt: string | null;
  status: string;
  createdById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Booking with all relations (full detail view)
 */
export interface BookingWithRelations extends Booking {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    imageUrls: string[];
  };
  pickupLocation: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  };
  dropoffLocation: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Create booking request
 */
export interface CreateBookingRequest {
  customerId: string;
  vehicleId: string;
  pickupLocationId: string;
  dropoffLocationId: string;
  pickupDatetime: string; // ISO 8601
  dropoffDatetime: string; // ISO 8601
  notes?: string;
}

/**
 * Update booking request
 */
export interface UpdateBookingRequest {
  pickupLocationId?: string;
  dropoffLocationId?: string;
  pickupDatetime?: string;
  dropoffDatetime?: string;
  status?: BookingStatus | string;
  mockStripePaymentIntentId?: string;
  depositCents?: number;
  notes?: string;
}

/**
 * Booking filters for search/list endpoints
 */
export interface BookingFilters {
  search?: string; // Search by booking number, customer name, vehicle
  customerId?: string;
  vehicleId?: string;
  pickupLocationId?: string;
  status?: string;
  pickupFrom?: string;
  pickupTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'pickupDatetime' | 'dropoffDatetime' | 'totalCents';
  sortOrder?: 'asc' | 'desc';
}
