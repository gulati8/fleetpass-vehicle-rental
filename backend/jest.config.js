module.exports = {
  // Use ts-jest for TypeScript transformation
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: 'src',

  // File extensions Jest will look for
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Test file patterns
  // Unit tests: *.spec.ts
  // Integration tests: *.integration.spec.ts
  testRegex: '.*\\.spec\\.ts$',

  // Transform TypeScript files
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Coverage collection
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.integration.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/test/**',
    '!main.ts',
  ],

  // Coverage output directory
  coverageDirectory: '../coverage',

  // Coverage thresholds - tests will fail if coverage is below these
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@shared/types$': '<rootDir>/../../shared/types',
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],


  // Clear mocks between tests automatically
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Timeout for tests (5 seconds)
  testTimeout: 5000,

  // Verbose output
  verbose: true,
};
