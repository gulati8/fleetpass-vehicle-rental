import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, BadRequestException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisService } from '../../redis/redis.service';
import { mockRedisService } from '../../test/test-utils';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let redisService: ReturnType<typeof mockRedisService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    redisService = mockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    method: string,
    headers: Record<string, string> = {},
    user?: any,
  ): ExecutionContext => {
    const request = {
      method,
      url: '/test',
      headers,
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
    } as ExecutionContext;
  };

  const createMockCallHandler = (response: any): CallHandler => ({
    handle: () => of(response),
  });

  describe('GET request handling', () => {
    it('should skip idempotency check for GET requests', async () => {
      // Arrange
      const context = createMockExecutionContext('GET');
      const responseData = { data: 'test' };
      const next = createMockCallHandler(responseData);

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert - Verify it returns the same observable
      const values: any[] = [];
      result.subscribe(value => values.push(value));

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(responseData);
      expect(redisService.getJson).not.toHaveBeenCalled();
      expect(redisService.setJson).not.toHaveBeenCalled();
    });
  });

  describe('@NonIdempotent decorator handling', () => {
    it('should skip idempotency check for endpoints with @NonIdempotent decorator', async () => {
      // Arrange
      const context = createMockExecutionContext('POST');
      const responseData = { data: 'test' };
      const next = createMockCallHandler(responseData);

      // Mock reflector to return true for non-idempotent
      reflector.get.mockReturnValue(true);

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert - Verify it returns the observable
      const values: any[] = [];
      result.subscribe(value => values.push(value));

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(responseData);
      expect(reflector.get).toHaveBeenCalledWith('non-idempotent', {});
      expect(redisService.getJson).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency-Key header validation', () => {
    it('should throw BadRequestException when Idempotency-Key is missing for POST request', async () => {
      // Arrange
      const context = createMockExecutionContext('POST', {});
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
      await expect(interceptor.intercept(context, next)).rejects.toThrow(
        'Idempotency-Key header is required for POST/PUT/PATCH/DELETE requests'
      );
    });

    it('should throw BadRequestException when Idempotency-Key is missing for PUT request', async () => {
      // Arrange
      const context = createMockExecutionContext('PUT', {});
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Idempotency-Key is missing for PATCH request', async () => {
      // Arrange
      const context = createMockExecutionContext('PATCH', {});
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Idempotency-Key is missing for DELETE request', async () => {
      // Arrange
      const context = createMockExecutionContext('DELETE', {});
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid key format (too short)', async () => {
      // Arrange
      const context = createMockExecutionContext('POST', {
        'idempotency-key': 'short',
      });
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
      await expect(interceptor.intercept(context, next)).rejects.toThrow(
        'Invalid Idempotency-Key format. Must be UUID or 16+ alphanumeric characters.'
      );
    });

    it('should throw BadRequestException for invalid key format (special characters)', async () => {
      // Arrange
      const context = createMockExecutionContext('POST', {
        'idempotency-key': 'invalid!@#$%^&*()',
      });
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid UUID format', async () => {
      // Arrange
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockExecutionContext('POST', {
        'idempotency-key': validUUID,
      });
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      // Act
      await interceptor.intercept(context, next);

      // Assert
      expect(redisService.getJson).toHaveBeenCalled();
    });

    it('should accept valid 16+ character alphanumeric key', async () => {
      // Arrange
      const validKey = 'my-custom-key-1234567890';
      const context = createMockExecutionContext('POST', {
        'idempotency-key': validKey,
      });
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);
      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);

      // Act
      await interceptor.intercept(context, next);

      // Assert
      expect(redisService.getJson).toHaveBeenCalled();
    });
  });

  describe('Cached response handling', () => {
    it('should return cached response for duplicate key when status is completed', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const cachedResponse = { id: 'user-123', email: 'test@example.com' };
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      });
      const next = createMockCallHandler({ data: 'new response' });
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue({
        status: 'completed',
        response: cachedResponse,
        completedAt: new Date().toISOString(),
      });

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert
      const values: any[] = [];
      result.subscribe(value => values.push(value));

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(cachedResponse);
      expect(redisService.getJson).toHaveBeenCalledWith('idempotency:public:test-key-1234567890');

      // Should not execute the request handler
      expect(redisService.setJson).not.toHaveBeenCalled();
    });

    it('should scope Redis key by organizationId when user is authenticated', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const cachedResponse = { id: 'customer-123' };
      const user = { id: 'user-123', organizationId: 'org-abc' };
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      }, user);
      const next = createMockCallHandler({ data: 'new response' });
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue({
        status: 'completed',
        response: cachedResponse,
      });

      // Act
      await interceptor.intercept(context, next);

      // Assert
      expect(redisService.getJson).toHaveBeenCalledWith('idempotency:org-abc:test-key-1234567890');
    });
  });

  describe('Concurrent request handling', () => {
    it('should throw ConflictException when request is already processing', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      });
      const next = createMockCallHandler({ data: 'test' });
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue({
        status: 'processing',
        startedAt: new Date().toISOString(),
      });

      // Act & Assert
      await expect(interceptor.intercept(context, next)).rejects.toThrow(ConflictException);
      await expect(interceptor.intercept(context, next)).rejects.toThrow(
        'A request with this Idempotency-Key is already being processed. Please try again later.'
      );
    });
  });

  describe('New request handling', () => {
    it('should process new request and cache the response', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const responseData = { id: 'user-123', email: 'test@example.com' };
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      });
      const next = createMockCallHandler(responseData);
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue(null); // No cached data
      redisService.setJson.mockResolvedValue(undefined);

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert
      const values: any[] = [];
      await new Promise<void>((resolve) => {
        result.subscribe({
          next: (value) => values.push(value),
          complete: () => resolve(),
        });
      });

      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(responseData);

      // Should mark as processing first
      expect(redisService.setJson).toHaveBeenCalledWith(
        'idempotency:public:test-key-1234567890',
        expect.objectContaining({
          status: 'processing',
          startedAt: expect.any(String),
        }),
        86400, // TTL
      );

      // Should cache completed response (called in tap operator after response)
      // Wait for async tap to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(redisService.setJson).toHaveBeenCalledWith(
        'idempotency:public:test-key-1234567890',
        expect.objectContaining({
          status: 'completed',
          response: responseData,
          completedAt: expect.any(String),
        }),
        86400,
      );
    });
  });

  describe('Error handling', () => {
    it('should clear processing lock when request fails', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const error = new Error('Test error');
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      });
      const next: CallHandler = {
        handle: () => throwError(() => error),
      };
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(1);

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert - verify error is thrown
      await expect(
        new Promise((resolve, reject) => {
          result.subscribe({
            next: resolve,
            error: reject,
          });
        })
      ).rejects.toThrow('Test error');

      // Wait for async error handler to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should delete the processing lock
      expect(redisService.del).toHaveBeenCalledWith('idempotency:public:test-key-1234567890');
    });

    it('should log error if deleting processing lock fails', async () => {
      // Arrange
      const idempotencyKey = 'test-key-1234567890';
      const error = new Error('Test error');
      const context = createMockExecutionContext('POST', {
        'idempotency-key': idempotencyKey,
      });
      const next: CallHandler = {
        handle: () => throwError(() => error),
      };
      reflector.get.mockReturnValue(false);

      redisService.getJson.mockResolvedValue(null);
      redisService.setJson.mockResolvedValue(undefined);
      redisService.del.mockRejectedValue(new Error('Redis delete failed'));

      // Act
      const result = await interceptor.intercept(context, next);

      // Assert - should still throw the original error
      await expect(
        new Promise((resolve, reject) => {
          result.subscribe({
            next: resolve,
            error: reject,
          });
        })
      ).rejects.toThrow('Test error');

      // Wait for async error handler
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have attempted to delete the lock
      expect(redisService.del).toHaveBeenCalled();
    });
  });
});
