import { User, Organization } from '@prisma/client';

/**
 * User fixtures for testing
 * These factory functions create test data that matches the Prisma schema
 */

/**
 * Create a test organization
 */
export const createTestOrganization = (
  overrides: Partial<Organization> = {},
): Organization => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org-123',
  billingEmail: 'billing@test.com',
  settings: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create a test user (basic user role)
 */
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'user@test.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5tz.Qb9Fg9O2m', // "Password123!"
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  locationId: null,
  isActive: true,
  organizationId: 'org-123',
  lastLoginAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create a test admin user
 */
export const createTestAdmin = (overrides: Partial<User> = {}): User => ({
  id: 'admin-123',
  email: 'admin@test.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5tz.Qb9Fg9O2m', // "Password123!"
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  locationId: null,
  isActive: true,
  organizationId: 'org-123',
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create a test manager user
 */
export const createTestManager = (overrides: Partial<User> = {}): User => ({
  id: 'manager-123',
  email: 'manager@test.com',
  passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5tz.Qb9Fg9O2m', // "Password123!"
  firstName: 'Manager',
  lastName: 'User',
  role: 'manager',
  locationId: 'location-123',
  isActive: true,
  organizationId: 'org-123',
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/**
 * Create an inactive user (for testing account status)
 */
export const createInactiveUser = (overrides: Partial<User> = {}): User => ({
  ...createTestUser(),
  id: 'inactive-user-123',
  email: 'inactive@test.com',
  isActive: false,
  ...overrides,
});

/**
 * Create a user with organization included (for join queries)
 */
export const createTestUserWithOrganization = (
  userOverrides: Partial<User> = {},
  orgOverrides: Partial<Organization> = {},
): User & { organization: Organization } => ({
  ...createTestUser(userOverrides),
  organization: createTestOrganization(orgOverrides),
});

/**
 * Create multiple test users for list testing
 */
export const createTestUsers = (count: number): User[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...createTestUser(),
    id: `user-${index + 1}`,
    email: `user${index + 1}@test.com`,
  }));
};

/**
 * Sanitized user (without passwordHash) - matches what API returns
 */
export const createSanitizedUser = (
  overrides: Partial<Omit<User, 'passwordHash'>> = {},
): Omit<User, 'passwordHash'> => {
  const user = createTestUser();
  const { passwordHash, ...sanitized } = user;
  return {
    ...sanitized,
    ...overrides,
  };
};
