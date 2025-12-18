/**
 * Organization model (matches Prisma schema)
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  settings: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create organization request
 */
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  billingEmail: string;
  settings?: Record<string, any>;
}

/**
 * Update organization request
 */
export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  billingEmail?: string;
  settings?: Record<string, any>;
}
