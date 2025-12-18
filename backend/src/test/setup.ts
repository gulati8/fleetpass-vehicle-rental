/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging test failures
  error: console.error,
  warn: console.warn,
};
