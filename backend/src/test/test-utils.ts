import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Mock Prisma Client
 * Provides a clean mock implementation of PrismaService for unit tests
 */
export const mockPrismaService = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  vehicle: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  lead: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  location: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
});

/**
 * Mock Redis Service
 * Provides a mock implementation of RedisService for unit tests
 */
export const mockRedisService = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  getJson: jest.fn(),
  setJson: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
});

/**
 * Mock Logger Service
 * Provides a mock implementation for Pino logger
 */
export const mockLoggerService = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  child: jest.fn().mockReturnThis(),
});

/**
 * Mock ConfigService
 * Provides test configuration values
 */
export const mockConfigService = (): any => {
  const configValues: Record<string, any> = {
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRES_IN: '1h',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    PORT: 3000,
    NODE_ENV: 'test',
  };

  return {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];
      if (!value) {
        throw new Error(`Configuration key "${key}" is required but not set`);
      }
      return value;
    }),
  };
};

/**
 * Mock JwtService
 * Provides mock JWT token generation and verification
 */
export const mockJwtService = () => ({
  sign: jest.fn((payload: any) => 'mock-jwt-token'),
  verify: jest.fn((token: string) => ({
    sub: 'user-id',
    email: 'test@example.com',
    role: 'user',
    organizationId: 'org-id',
  })),
  decode: jest.fn(),
});

/**
 * Create a test module with common mocks
 * This helper makes it easy to set up a testing module with standard mocks
 *
 * @param metadata - Module metadata (providers, imports, etc.)
 * @returns TestingModule
 */
export async function createTestModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  const module = await Test.createTestingModule(metadata).compile();
  return module;
}

/**
 * Helper to create a mock request object for controller testing
 */
export const mockRequest = (overrides: any = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user',
    organizationId: 'test-org-id',
  },
  headers: {},
  body: {},
  query: {},
  params: {},
  ...overrides,
});

/**
 * Helper to create a mock response object for controller testing
 */
export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Helper to wait for promises to resolve in tests
 * Useful for testing async operations
 */
export const waitForPromises = () =>
  new Promise((resolve) => setImmediate(resolve));

/**
 * Helper to create a delay in tests
 * @param ms - milliseconds to delay
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Type helper for getting mock function type
 */
export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

/**
 * Type helper for getting mock object type
 */
export type MockObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K];
};
