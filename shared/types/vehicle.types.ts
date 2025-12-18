/**
 * Vehicle model (matches Prisma schema)
 */
export interface Vehicle {
  id: string;
  locationId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  transmission: string | null;
  fuelType: string | null;
  mileage: number | null;
  dailyRateCents: number;
  weeklyRateCents: number | null;
  monthlyRateCents: number | null;
  features: Record<string, any> | null;
  imageUrls: string[];
  isAvailableForRent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vehicle with location
 */
export interface VehicleWithLocation extends Vehicle {
  location: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  };
}

/**
 * Create vehicle request
 */
export interface CreateVehicleRequest {
  locationId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  fuelType?: string;
  mileage?: number;
  dailyRateCents: number;
  weeklyRateCents?: number;
  monthlyRateCents?: number;
  features?: Record<string, any>;
  imageUrls?: string[];
  notes?: string;
}

/**
 * Update vehicle request
 */
export interface UpdateVehicleRequest {
  locationId?: string;
  trim?: string;
  bodyType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  fuelType?: string;
  mileage?: number;
  dailyRateCents?: number;
  weeklyRateCents?: number;
  monthlyRateCents?: number;
  features?: Record<string, any>;
  imageUrls?: string[];
  isAvailableForRent?: boolean;
  notes?: string;
}

/**
 * Vehicle filters for search/list endpoints
 */
export interface VehicleFilters {
  locationId?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  yearMin?: number;
  yearMax?: number;
  transmission?: string;
  fuelType?: string;
  dailyRateMaxCents?: number;
  isAvailableForRent?: boolean;
}
