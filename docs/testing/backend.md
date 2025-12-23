# Testing Guide

This document provides comprehensive guidance on testing the FleetPass backend application.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Unit Tests](#writing-unit-tests)
- [Writing Integration Tests](#writing-integration-tests)
- [Test Utilities](#test-utilities)
- [Fixtures](#fixtures)
- [Best Practices](#best-practices)
- [Coverage Requirements](#coverage-requirements)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

We follow a pragmatic testing approach that balances comprehensive coverage with development velocity:

1. **Unit Tests** - Test individual components in isolation with mocked dependencies
2. **Integration Tests** - Test full request/response cycles through controllers
3. **Coverage Goals** - Aim for 80%+ coverage on branches, functions, lines, and statements

### What to Test

**Always test:**
- Business logic in services
- Validation rules
- Error handling paths
- Edge cases and boundary conditions
- Security-critical functions

**Don't over-test:**
- Simple getters/setters
- Pure pass-through functions
- Framework code (NestJS, Prisma)
- Third-party libraries

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (Development)

```bash
npm run test:watch
```

### Unit Tests Only

```bash
npm run test:unit
```

### Integration Tests Only

```bash
npm run test:integration
```

### With Coverage Report

```bash
npm run test:cov
```

Coverage reports are generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage.

### Debug Mode

```bash
npm run test:debug
```

Then attach your debugger to the Node process.

## Test Structure

### File Naming Conventions

- **Unit tests**: `*.spec.ts` (e.g., `auth.service.spec.ts`)
- **Integration tests**: `*.integration.spec.ts` (e.g., `auth.controller.integration.spec.ts`)

### Directory Organization

```
src/
├── auth/
│   ├── auth.service.ts
│   ├── auth.service.spec.ts              # Unit test
│   ├── auth.controller.ts
│   └── auth.controller.integration.spec.ts  # Integration test
├── test/
│   ├── setup.ts                          # Jest setup file
│   ├── test-utils.ts                     # Mock factories and helpers
│   └── fixtures/
│       ├── user.fixtures.ts              # User test data
│       └── auth.fixtures.ts              # Auth test data
```

## Writing Unit Tests

Unit tests focus on testing a single component in isolation with all dependencies mocked.

### Basic Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from './service-name.service';
import { DependencyService } from '../dependency/dependency.service';
import { mockDependencyService } from '../test/test-utils';

describe('ServiceName', () => {
  let service: ServiceName;
  let dependencyService: ReturnType<typeof mockDependencyService>;

  beforeEach(async () => {
    dependencyService = mockDependencyService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        {
          provide: DependencyService,
          useValue: dependencyService,
        },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = { /* test data */ };
      dependencyService.method.mockResolvedValue({ /* mock response */ });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(/* expected output */);
      expect(dependencyService.method).toHaveBeenCalledWith(/* expected args */);
    });
  });
});
```

### Key Principles

1. **AAA Pattern**: Arrange, Act, Assert
2. **One assertion per test**: Test one specific behavior
3. **Mock all dependencies**: Use provided mock factories
4. **Clear test names**: `should [expected behavior] when [condition]`

### Example: Testing AuthService

See `src/auth/auth.service.spec.ts` for a comprehensive example that demonstrates:
- Mocking Prisma, Redis, and JWT services
- Testing success paths
- Testing error conditions
- Testing edge cases (inactive users, wrong passwords)

## Writing Integration Tests

Integration tests verify that multiple components work together correctly, testing the full request/response cycle.

### Basic Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ControllerName } from './controller-name.controller';
import { ServiceName } from './service-name.service';

describe('ControllerName (Integration)', () => {
  let app: INestApplication;
  let service: jest.Mocked<ServiceName>;

  beforeEach(async () => {
    const mockService = {
      method: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ControllerName],
      providers: [
        {
          provide: ServiceName,
          useValue: mockService,
        },
      ],
    }).compile();

    service = moduleFixture.get(ServiceName);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /endpoint', () => {
    it('should return 200 with valid data', async () => {
      service.method.mockResolvedValue({ /* response */ });

      const response = await request(app.getHttpServer())
        .post('/endpoint')
        .send({ /* request body */ })
        .expect(200);

      expect(response.body).toEqual({ /* expected response */ });
    });
  });
});
```

### Example: Testing AuthController

See `src/auth/auth.controller.integration.spec.ts` for a comprehensive example that demonstrates:
- Setting up NestJS application for testing
- Testing request validation
- Testing response format (ResponseInterceptor)
- Testing protected routes with JwtAuthGuard
- Testing error responses

## Test Utilities

Located in `src/test/test-utils.ts`, these utilities make testing easier:

### Mock Factories

```typescript
import {
  mockPrismaService,
  mockRedisService,
  mockJwtService,
  mockConfigService,
  mockLoggerService,
} from '../test/test-utils';

// Use in tests
const prisma = mockPrismaService();
const redis = mockRedisService();
```

### Request/Response Helpers

```typescript
import { mockRequest, mockResponse } from '../test/test-utils';

const req = mockRequest({ user: { id: 'user-123' } });
const res = mockResponse();
```

### Async Helpers

```typescript
import { waitForPromises, delay } from '../test/test-utils';

await waitForPromises(); // Wait for all promises to resolve
await delay(1000);       // Wait 1 second
```

## Fixtures

Test fixtures provide reusable test data. Located in `src/test/fixtures/`.

### User Fixtures

```typescript
import {
  createTestUser,
  createTestAdmin,
  createTestOrganization,
  createTestUserWithOrganization,
} from '../test/fixtures/user.fixtures';

const user = createTestUser();
const admin = createTestAdmin({ email: 'custom@test.com' });
const userWithOrg = createTestUserWithOrganization();
```

### Auth Fixtures

```typescript
import {
  createLoginDto,
  createSignupDto,
  createAuthResponse,
  createMockJwtToken,
} from '../test/fixtures/auth.fixtures';

const loginDto = createLoginDto();
const signupDto = createSignupDto({ email: 'custom@test.com' });
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should throw UnauthorizedException when password is incorrect', () => {});
it('should cache user data after successful login', () => {});

// Bad
it('should work', () => {});
it('test login', () => {});
```

### 2. Arrange-Act-Assert Pattern

Structure every test with clear sections:

```typescript
it('should do something', async () => {
  // Arrange - Set up test data and mocks
  const input = createTestData();
  mockService.method.mockResolvedValue(expectedOutput);

  // Act - Call the method being tested
  const result = await service.methodToTest(input);

  // Assert - Verify the results
  expect(result).toEqual(expectedOutput);
  expect(mockService.method).toHaveBeenCalledWith(input);
});
```

### 3. Test One Thing at a Time

Each test should verify a single behavior:

```typescript
// Good - Separate tests for different behaviors
it('should return user when login is successful', () => {});
it('should update lastLoginAt timestamp', () => {});
it('should cache user data in Redis', () => {});

// Bad - Testing multiple things
it('should login user and update timestamp and cache data', () => {});
```

### 4. Mock Only What You Need

Don't over-mock. Only mock dependencies, not the system under test:

```typescript
// Good - Mock external dependencies
const prisma = mockPrismaService();
const service = new AuthService(prisma, redis, jwt);

// Bad - Mocking the thing you're testing
const service = jest.fn().mockReturnValue({});
```

### 5. Clean Up After Tests

Use `afterEach` to reset mocks and clear state:

```typescript
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### 6. Test Error Cases

Always test both success and failure paths:

```typescript
describe('login', () => {
  it('should login with valid credentials', () => {});
  it('should throw error with invalid password', () => {});
  it('should throw error when user not found', () => {});
  it('should throw error when account is inactive', () => {});
});
```

### 7. Use Type Safety

Leverage TypeScript in tests:

```typescript
// Good - Type-safe mocks
const mockService: jest.Mocked<ServiceType> = {
  method: jest.fn(),
};

// Good - Type-safe test data
const testData: CreateUserDto = createTestUser();
```

## Coverage Requirements

We enforce the following coverage thresholds:

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Tests will fail if coverage drops below these thresholds.

### Viewing Coverage Reports

```bash
npm run test:cov
open coverage/lcov-report/index.html
```

### Excluding Code from Coverage

Use `/* istanbul ignore next */` for code that doesn't need coverage:

```typescript
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}
```

## Troubleshooting

### Tests Timeout

Increase timeout in specific test:

```typescript
it('should handle long operation', async () => {
  // test code
}, 10000); // 10 second timeout
```

### TypeScript Errors in Tests

Ensure `tsconfig.json` is correctly configured and test files are included.

### Mock Not Working

Make sure to call the mock setup **before** creating the service:

```typescript
// Correct order
beforeEach(async () => {
  const mockService = mockServiceFactory(); // 1. Create mock
  const module = await Test.createTestingModule({
    providers: [
      { provide: Service, useValue: mockService }, // 2. Use mock
    ],
  }).compile();
  service = module.get(Service); // 3. Get service
});
```

### Prisma Mocks Not Typed Correctly

Use the return type helper:

```typescript
let prisma: ReturnType<typeof mockPrismaService>;

beforeEach(() => {
  prisma = mockPrismaService();
});
```

### Tests Pass Locally But Fail in CI

- Check environment variables
- Ensure no dependencies on local filesystem
- Verify timezone-independent date comparisons
- Check for race conditions in async tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Test-Driven Development Best Practices](./.claude/skills/testing/test-driven-development.md)

## Getting Help

If you have questions about testing:

1. Check this documentation first
2. Look at existing test examples in `src/auth/`
3. Review test utilities in `src/test/`
4. Ask the team in #engineering-help channel
