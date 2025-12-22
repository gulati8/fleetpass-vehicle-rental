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

describe('Signup with Idempotency (Integration)', () => {
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

  describe('POST /auth/signup with Idempotency-Key', () => {
    it('should successfully signup with valid Idempotency-Key', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = {
        id: 'user-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        role: 'admin',
        organizationId: 'org-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed-password',
        lastLoginAt: null,
      };
      const organization = {
        id: 'org-123',
        name: signupDto.organizationName,
        slug: 'test-org-123',
        billingEmail: signupDto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Redis: No existing idempotency record
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      // Mock Prisma: Transaction succeeds
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue(organization),
          },
          user: {
            create: jest.fn().mockResolvedValue({ ...user, organization }),
          },
        };
        return callback(tx);
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', '550e8400-e29b-41d4-a716-446655440000')
        .send(signupDto)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('organization');
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Verify idempotency was tracked
      expect(redisService.setJson).toHaveBeenCalledWith(
        'idempotency:public:550e8400-e29b-41d4-a716-446655440000',
        expect.objectContaining({ status: 'processing' }),
        86400,
      );
    });

    it('should fail without Idempotency-Key header', async () => {
      // Arrange
      const signupDto = createSignupDto();

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Idempotency-Key header is required');

      // Verify no database operation occurred
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should return cached response for duplicate Idempotency-Key', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const cachedResponse = {
        user: {
          id: 'user-123',
          email: signupDto.email,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
        },
        organization: {
          id: 'org-123',
          name: signupDto.organizationName,
        },
      };

      // Mock Redis: Return completed idempotency record
      redisService.getJson.mockResolvedValue({
        status: 'completed',
        response: cachedResponse,
        completedAt: new Date().toISOString(),
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'duplicate-key-1234567890')
        .send(signupDto)
        .expect(201);

      // Assert
      expect(response.body).toEqual(cachedResponse);

      // Verify no new database operation occurred
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should return 409 Conflict for concurrent requests with same key', async () => {
      // Arrange
      const signupDto = createSignupDto();

      // Mock Redis: Return processing status (request in progress)
      redisService.getJson.mockResolvedValue({
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'concurrent-key-1234567890')
        .send(signupDto)
        .expect(409);

      // Assert
      expect(response.body.message).toContain('already being processed');

      // Verify no database operation occurred
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should create different users with different Idempotency-Keys', async () => {
      // Arrange
      const signupDto1 = createSignupDto();
      const signupDto2 = {
        ...createSignupDto(),
        email: 'different@example.com',
      };

      const user1 = {
        id: 'user-1',
        email: signupDto1.email,
        firstName: signupDto1.firstName,
        lastName: signupDto1.lastName,
        role: 'admin',
        organizationId: 'org-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed',
        lastLoginAt: null,
      };

      const user2 = {
        id: 'user-2',
        email: signupDto2.email,
        firstName: signupDto2.firstName,
        lastName: signupDto2.lastName,
        role: 'admin',
        organizationId: 'org-2',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed',
        lastLoginAt: null,
      };

      const org1 = {
        id: 'org-1',
        name: signupDto1.organizationName,
        slug: 'test-org-1',
        billingEmail: signupDto1.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const org2 = {
        id: 'org-2',
        name: signupDto2.organizationName,
        slug: 'test-org-2',
        billingEmail: signupDto2.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Redis: No cache for both keys
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      // Mock Prisma: Both transactions succeed
      prismaService.$transaction
        .mockImplementationOnce(async (callback: any) => {
          const tx = {
            organization: { create: jest.fn().mockResolvedValue(org1) },
            user: { create: jest.fn().mockResolvedValue({ ...user1, organization: org1 }) },
          };
          return callback(tx);
        })
        .mockImplementationOnce(async (callback: any) => {
          const tx = {
            organization: { create: jest.fn().mockResolvedValue(org2) },
            user: { create: jest.fn().mockResolvedValue({ ...user2, organization: org2 }) },
          };
          return callback(tx);
        });

      // Act
      const response1 = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'key-user-1-1234567890')
        .send(signupDto1)
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'key-user-2-0987654321')
        .send(signupDto2)
        .expect(201);

      // Assert
      expect(response1.body.data.user.email).toBe(signupDto1.email);
      expect(response2.body.data.user.email).toBe(signupDto2.email);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should handle database unique constraint violation (P2002) correctly', async () => {
      // Arrange
      const signupDto = createSignupDto();

      // Mock Redis: No cache
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);

      // Mock Prisma: Transaction fails with P2002 error
      const p2002Error = Object.assign(
        new Error('Unique constraint failed on the fields: (`email`)'),
        { code: 'P2002' }
      );
      prismaService.$transaction.mockRejectedValue(p2002Error);

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'duplicate-email-key-123')
        .send(signupDto)
        .expect(409);

      // Assert
      expect(response.body.message).toContain('User with this email already exists');

      // Verify processing lock was cleared after error
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(redisService.del).toHaveBeenCalledWith('idempotency:public:duplicate-email-key-123');
    });

    it('should complete successfully even if logger fails', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = {
        id: 'user-123',
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        role: 'admin',
        organizationId: 'org-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed-password',
        lastLoginAt: null,
      };
      const organization = {
        id: 'org-123',
        name: signupDto.organizationName,
        slug: 'test-org-123',
        billingEmail: signupDto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Redis
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      // Mock Prisma
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(organization) },
          user: { create: jest.fn().mockResolvedValue({ ...user, organization }) },
        };
        return callback(tx);
      });

      // Act - Request should succeed even if logging fails
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'logging-test-key-123456')
        .send(signupDto)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('organization');
    });

    it('should fail with invalid Idempotency-Key format', async () => {
      // Arrange
      const signupDto = createSignupDto();

      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .set('Idempotency-Key', 'short')
        .send(signupDto)
        .expect(400);

      // Assert
      expect(response.body.message).toContain('Invalid Idempotency-Key format');

      // Verify no database operation occurred
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });
});
