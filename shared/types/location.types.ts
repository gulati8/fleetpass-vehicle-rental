/**
 * Location model (matches Prisma schema)
 */
export interface Location {
  id: string;
  organizationId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  hoursOfOperation: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Location with organization
 */
export interface LocationWithOrganization extends Location {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Create location request
 */
export interface CreateLocationRequest {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  hoursOfOperation?: Record<string, any>;
}

/**
 * Update location request
 */
export interface UpdateLocationRequest {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  hoursOfOperation?: Record<string, any>;
}
