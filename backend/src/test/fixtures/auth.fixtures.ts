import { SignupDto } from '../../auth/dto/signup.dto';
import { LoginDto } from '../../auth/dto/login.dto';

/**
 * Auth fixtures for testing authentication flows
 */

/**
 * Create a valid signup DTO
 */
export const createSignupDto = (
  overrides: Partial<SignupDto> = {},
): SignupDto => ({
  email: 'newuser@test.com',
  password: 'StrongPass123!',
  firstName: 'John',
  lastName: 'Doe',
  organizationName: 'Acme Corp',
  ...overrides,
});

/**
 * Create a valid login DTO
 */
export const createLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
  email: 'user@test.com',
  password: 'Password123!',
  ...overrides,
});

/**
 * Create an invalid login DTO (wrong password)
 */
export const createInvalidLoginDto = (): LoginDto => ({
  email: 'user@test.com',
  password: 'WrongPassword123!',
});

/**
 * Create a JWT payload
 */
export const createJwtPayload = (
  overrides: Partial<{
    sub: string;
    email: string;
    role: string;
    organizationId: string;
  }> = {},
) => ({
  sub: 'user-123',
  email: 'user@test.com',
  role: 'user',
  organizationId: 'org-123',
  ...overrides,
});

/**
 * Create a mock JWT token
 */
export const createMockJwtToken = (): string => {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidXNlckB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwib3JnYW5pemF0aW9uSWQiOiJvcmctMTIzIn0.mock-signature';
};

/**
 * Create a complete auth response (as returned by login/signup)
 */
export const createAuthResponse = (
  overrides: Partial<{
    user: any;
    organization: any;
    access_token: string;
  }> = {},
) => ({
  user: {
    id: 'user-123',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    locationId: null,
    isActive: true,
    organizationId: 'org-123',
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  organization: {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org-123',
    billingEmail: 'billing@test.com',
    settings: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  access_token: createMockJwtToken(),
  ...overrides,
});

/**
 * Weak passwords for testing password validation
 */
export const weakPasswords = [
  'password', // too common
  '12345678', // no letters
  'abcdefgh', // no numbers
  'Pass123', // too short
  'PASSWORD123', // no lowercase
  'password123', // no uppercase
  'Password', // no numbers
];

/**
 * Strong passwords for testing password validation
 */
export const strongPasswords = [
  'StrongPass123!',
  'MyP@ssw0rd2024',
  'C0mpl3x!Pass',
  'S3cur3P@ssword',
];

/**
 * Invalid email addresses for testing validation
 */
export const invalidEmails = [
  'not-an-email',
  '@example.com',
  'user@',
  'user @example.com',
  'user@example',
];

/**
 * Valid email addresses for testing
 */
export const validEmails = [
  'user@example.com',
  'test.user@company.co.uk',
  'admin+test@subdomain.example.com',
];
