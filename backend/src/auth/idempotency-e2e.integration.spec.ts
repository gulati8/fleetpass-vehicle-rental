import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

const request = require('supertest');
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { Reflector } from '@nestjs/core';
import { mockPrismaService, mockRedisService } from '../test/test-utils';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('Idempotency E2E Tests', () => {
  let app: INestApplication;
  let prismaService: ReturnType<typeof mockPrismaService>;
  let redisService: ReturnType<typeof mockRedisService>;

  beforeEach(async () => {
    prismaService = mockPrismaService();
    redisService = mockRedisService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: RedisService,
          useValue: redisService,
        },
        IdempotencyInterceptor,
        Reflector,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Apply global interceptors
    const reflector = app.get(Reflector);
    const redisServiceInstance = app.get(RedisService);
    app.useGlobalInterceptors(
      new IdempotencyInterceptor(redisServiceInstance, reflector),
      new ResponseInterceptor(),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  const createSignupDto = () => ({
    email: 'test@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    organizationName: 'Test Org',
  });

  const createMockUser = (email: string) => ({
    id: 'user-123',
    email,
    firstName: 'John',
    lastName: 'Doe',
    role: 'admin',
    organizationId: 'org-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hashed-password',
    lastLoginAt: null,
  });

  const createMockOrganization = () => ({
    id: 'org-123',
    name: 'Test Org',
    slug: 'test-org-123',
    billingEmail: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Missing Idempotency-Key', () => {
    it('should return 400 when Idempotency-Key is missing for POST request', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(createSignupDto())
        .expect(400);

      // Assert
      // Error response assertions
      expect(response.body.message).toContain('Idempotency-Key header is required');
    });
  });

  describe('Invalid Idempotency-Key Format', () => {
    it('should return 400 for key that is too short', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'short')
        .send(createSignupDto())
        .expect(400);

      // Assert
      // Error response assertions
      expect(response.body.message).toContain('Invalid Idempotency-Key format');
    });

    it('should return 400 for key with invalid characters', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'invalid!@#$%^&*()')
        .send(createSignupDto())
        .expect(400);

      // Assert
      // Error response assertions
      expect(response.body.message).toContain('Invalid Idempotency-Key format');
    });

    it('should accept valid UUID format', async () => {
      // Arrange
      const user = createMockUser('test@example.com');
      const organization = createMockOrganization();

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440000')
        .send(createSignupDto())
        .expect(201);

      // Assert
      // Success response
    });

    it('should accept valid 16+ character alphanumeric key', async () => {
      // Arrange
      const user = createMockUser('test@example.com');
      const organization = createMockOrganization();

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'my-custom-key-1234567890')
        .send(createSignupDto())
        .expect(201);

      // Assert
      // Success response
    });
  });

  describe('Valid Signup Flow', () => {
    it('should successfully create user with valid Idempotency-Key', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = createMockUser(signupDto.email);
      const organization = createMockOrganization();

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'valid-signup-key-123456')
        .send(signupDto)
        .expect(201);

      // Assert
      // Success response
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data.user.email).toBe(signupDto.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Verify idempotency tracking
      expect(redisService.setJson).toHaveBeenCalledWith(
        'idempotency:public:valid-signup-key-123456',
        expect.objectContaining({ status: 'processing' }),
        86400,
      );
    });
  });

  describe('Duplicate Idempotency-Key', () => {
    it('should return same response for duplicate key without creating new user', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const cachedResponse = {
        user: {
          id: 'user-cached',
          email: signupDto.email,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
        },
        organization: {
          id: 'org-cached',
          name: signupDto.organizationName,
        },
      };

      // Mock Redis: Return completed request
      redisService.getJson.mockResolvedValue({
        status: 'completed',
        response: cachedResponse,
        completedAt: new Date().toISOString(),
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'duplicate-key-123456')
        .send(signupDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual(cachedResponse);

      // Verify no database operation occurred
      expect(prismaService.$transaction).not.toHaveBeenCalled();

      // Verify Redis was checked
      expect(redisService.getJson).toHaveBeenCalledWith('idempotency:public:duplicate-key-123456');
    });

    it('should return same response structure as original request', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = createMockUser(signupDto.email);
      const organization = createMockOrganization();

      // First request - no cache
      redisService.getJson.mockResolvedValueOnce(null);
      redisService.setJson.mockResolvedValue(undefined);

      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act - First request
      const response1 = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'consistency-test-key-12345')
        .send(signupDto)
        .expect(201);

      // Mock Redis for second request - return cached
      const cachedResponse = response1.body;
      redisService.getJson.mockResolvedValueOnce({
        status: 'completed',
        response: cachedResponse,
      });

      // Act - Second request with same key
      const response2 = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'consistency-test-key-12345')
        .send(signupDto)
        .expect(201);

      // Assert - Responses should match
      expect(response2.body).toEqual(response1.body);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should return 409 when request with same key is being processed', async () => {
      // Arrange
      const signupDto = createSignupDto();

      // Mock Redis: Request already in progress
      redisService.getJson.mockResolvedValue({
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'concurrent-key-123456')
        .send(signupDto)
        .expect(409);

      // Assert
      // Error response assertions
      expect(response.body.message).toContain('already being processed');
      expect(response.body.message).toContain('Please try again later');

      // Verify no database operation
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('Failed Request Retry', () => {
    it('should allow retry with same key after failed request', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = createMockUser(signupDto.email);
      const organization = createMockOrganization();

      // First request - no cache, will fail
      redisService.getJson.mockResolvedValueOnce(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);

      const error = new Error('Database connection failed');
      prismaService.$transaction.mockRejectedValueOnce(error);

      // Act - First request fails
      await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'retry-key-123456')
        .send(signupDto)
        .expect(500);

      // Wait for error cleanup
      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify processing lock was cleared
      expect(redisService.del).toHaveBeenCalledWith('idempotency:public:retry-key-123456');

      // Second request - no cache (lock was cleared), should succeed
      redisService.getJson.mockResolvedValueOnce(null);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act - Retry with same key
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'retry-key-123456')
        .send(signupDto)
        .expect(201);

      // Assert
      // Success response
      expect(response.body.data).toHaveProperty('user');
    });
  });

  describe('Database Unique Constraint Handling', () => {
    it('should return 409 for P2002 unique constraint violation', async () => {
      // Arrange
      const signupDto = createSignupDto();

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);

      // Mock P2002 error
      const p2002Error = Object.assign(
        new Error('Unique constraint failed on the fields: (`email`)'),
        { code: 'P2002' }
      );
      prismaService.$transaction.mockRejectedValue(p2002Error);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'unique-constraint-key-123')
        .send(signupDto)
        .expect(409);

      // Assert
      // Error response assertions
      expect(response.body.message).toContain('User with this email already exists');

      // Verify processing lock was cleared
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(redisService.del).toHaveBeenCalledWith('idempotency:public:unique-constraint-key-123');
    });
  });

  describe('GET Request Handling', () => {
    it('should skip idempotency check for GET requests', async () => {
      // Note: GET requests skip idempotency check regardless of response
      // The /auth/me endpoint may fail with 500 due to missing auth setup in test,
      // but that's fine - we just need to verify idempotency check was skipped

      // Act - GET request to any endpoint (doesn't matter if it fails)
      await request(app.getHttpServer())
        .get('/auth/me');
        // Don't assert status - could be 401 or 500 depending on setup

      // Assert - The important part: idempotency was not checked
      expect(redisService.getJson).not.toHaveBeenCalled();
      expect(redisService.setJson).not.toHaveBeenCalled();
    });
  });
});
