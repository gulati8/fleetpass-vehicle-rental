import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  mockPrismaService,
  mockRedisService,
  mockJwtService,
} from '../test/test-utils';
import {
  createTestUser,
  createTestUserWithOrganization,
  createTestOrganization,
} from '../test/fixtures/user.fixtures';
import { createLoginDto, createSignupDto } from '../test/fixtures/auth.fixtures';

// Mock bcrypt module
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: ReturnType<typeof mockPrismaService>;
  let redisService: ReturnType<typeof mockRedisService>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    // Create mocks
    prismaService = mockPrismaService();
    redisService = mockRedisService();
    jwtService = mockJwtService();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
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
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange
      const loginDto = createLoginDto();
      const userWithOrg = createTestUserWithOrganization();

      // Mock Prisma to return user with organization
      prismaService.user.findUnique.mockResolvedValue(userWithOrg);

      // Mock bcrypt.compare to return true (password matches)
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock Prisma update for lastLoginAt
      prismaService.user.update.mockResolvedValue(userWithOrg);

      // Mock Redis cache
      redisService.setJson.mockResolvedValue('OK' as any);

      // Mock JWT token generation
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('access_token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.access_token).toBe('mock-jwt-token');

      // Verify Prisma was called correctly
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: { organization: true },
      });

      // bcrypt.compare was called (we mocked it above)

      // Verify lastLoginAt was updated
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userWithOrg.id },
        data: { lastLoginAt: expect.any(Date) },
      });

      // Verify Redis caching was called
      expect(redisService.setJson).toHaveBeenCalled();

      // Verify JWT was generated with correct payload
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: userWithOrg.id,
        email: userWithOrg.email,
        role: userWithOrg.role,
        organizationId: userWithOrg.organizationId,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const loginDto = createLoginDto();
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify no update happened (user not found, so no password check or update)
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const loginDto = createLoginDto();
      const userWithOrg = createTestUserWithOrganization();
      prismaService.user.findUnique.mockResolvedValue(userWithOrg);

      // Mock bcrypt.compare to return false (password doesn't match)
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');

      // Verify no update happened (password didn't match)
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const loginDto = createLoginDto();
      const inactiveUser = createTestUserWithOrganization({ isActive: false });
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      // Mock bcrypt.compare to return true
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Account is inactive',
      );

      // Verify no update happened
      expect(prismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('should successfully create new user and organization', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const user = createTestUser({
        email: signupDto.email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
      });
      const organization = createTestOrganization({
        name: signupDto.organizationName,
      });

      // Mock: User doesn't exist yet
      prismaService.user.findUnique.mockResolvedValue(null);

      // Mock: bcrypt.hash for password hashing
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock: Transaction creates both organization and user
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

      // Mock: JWT token generation
      jwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.signup(signupDto);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('access_token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.access_token).toBe('mock-jwt-token');

      // Verify user existence check
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: signupDto.email },
      });

      // Verify password was hashed
      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 12);

      // Verify transaction was used
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      const signupDto = createSignupDto();
      const existingUser = createTestUser({ email: signupDto.email });

      // Mock: User already exists
      prismaService.user.findUnique.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.signup(signupDto)).rejects.toThrow(
        'User with this email already exists',
      );

      // Verify no transaction happened
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should return user from cache when available', async () => {
      // Arrange
      const userId = 'user-123';
      const cachedData = {
        user: createTestUser({ id: userId }),
        organization: createTestOrganization(),
      };
      delete (cachedData.user as any).passwordHash; // Cached data shouldn't have password

      redisService.getJson.mockResolvedValue(cachedData);

      // Act
      const result = await service.getMe(userId);

      // Assert
      expect(result).toEqual(cachedData);
      expect(redisService.getJson).toHaveBeenCalledWith(`user:${userId}`);
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not in cache', async () => {
      // Arrange
      const userId = 'user-123';
      const userWithOrg = createTestUserWithOrganization({ id: userId });

      // Mock: Cache miss
      redisService.getJson.mockResolvedValue(null);

      // Mock: Database fetch
      prismaService.user.findUnique.mockResolvedValue(userWithOrg);

      // Mock: Cache write
      redisService.setJson.mockResolvedValue('OK' as any);

      // Act
      const result = await service.getMe(userId);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('organization');
      expect(result.user).not.toHaveProperty('passwordHash');

      // Verify cache was checked first
      expect(redisService.getJson).toHaveBeenCalledWith(`user:${userId}`);

      // Verify database was queried
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { organization: true },
      });

      // Verify result was cached
      expect(redisService.setJson).toHaveBeenCalledWith(
        `user:${userId}`,
        expect.objectContaining({
          user: expect.not.objectContaining({ passwordHash: expect.anything() }),
        }),
        900, // TTL
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      // Mock: Cache miss
      redisService.getJson.mockResolvedValue(null);

      // Mock: User not found in database
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMe(userId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getMe(userId)).rejects.toThrow('User not found');
    });
  });
});
