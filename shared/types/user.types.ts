/**
 * User role enum
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES_AGENT = 'sales_agent',
  SUPPORT = 'support',
}

/**
 * User model (matches Prisma schema)
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  locationId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User with organization (common join)
 */
export interface UserWithOrganization extends User {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  locationId?: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole | string;
  locationId?: string;
  isActive?: boolean;
}
