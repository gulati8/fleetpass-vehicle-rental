import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { UploadRateLimitGuard } from './upload-rate-limit.guard';
import { RedisService } from '../../redis/redis.service';
import { mockRedisService } from '../../test/test-utils';

describe('UploadRateLimitGuard - Token Bucket Rate Limiting', () => {
  let guard: UploadRateLimitGuard;
  let redisService: ReturnType<typeof mockRedisService>;

  const CAPACITY_BYTES = 100 * 1024 * 1024; // 100MB
  const REFILL_RATE_BYTES_PER_SECOND = (10 * 1024 * 1024) / 60; // 10MB per minute
  const ESTIMATED_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  beforeEach(async () => {
    redisService = mockRedisService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadRateLimitGuard,
        {
          provide: RedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    guard = module.get<UploadRateLimitGuard>(UploadRateLimitGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to create mock execution context
   */
  const createMockContext = (userId?: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: userId ? { id: userId } : undefined,
        }),
      }),
    } as ExecutionContext;
  };

  describe('Initial bucket state (first upload)', () => {
    it('should allow first upload with full capacity', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Simulate empty bucket (first upload)
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith(`upload:tokens:${userId}`);
      expect(redisService.set).toHaveBeenCalledWith(
        `upload:tokens:${userId}`,
        expect.stringContaining('"tokens"'),
        3600, // TTL
      );

      // Verify tokens were deducted
      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);
      expect(bucketData.tokens).toBe(CAPACITY_BYTES - ESTIMATED_FILE_SIZE);
      expect(bucketData.lastRefill).toBeGreaterThan(0);
    });

    it('should initialize bucket with full capacity for new user', async () => {
      const userId = 'new-user-456';
      const context = createMockContext(userId);

      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);

      await guard.canActivate(context);

      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);

      // New user gets full 100MB capacity
      expect(bucketData.tokens).toBe(CAPACITY_BYTES - ESTIMATED_FILE_SIZE);
    });
  });

  describe('Sequential uploads within capacity', () => {
    it('should allow multiple uploads within capacity limit', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);
      const now = Date.now() / 1000;

      // Simulate bucket with 50MB remaining
      const initialTokens = 50 * 1024 * 1024;
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: initialTokens,
          lastRefill: now,
        }),
      );
      redisService.set.mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      // Verify tokens were deducted
      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);
      expect(bucketData.tokens).toBe(initialTokens - ESTIMATED_FILE_SIZE);
    });

    it('should track 10 sequential uploads correctly', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Start with full capacity
      let currentTokens = CAPACITY_BYTES;
      const now = Date.now() / 1000;

      for (let i = 0; i < 10; i++) {
        redisService.get.mockResolvedValue(
          JSON.stringify({
            tokens: currentTokens,
            lastRefill: now,
          }),
        );
        redisService.set.mockResolvedValue(undefined);

        const result = await guard.canActivate(context);

        if (currentTokens >= ESTIMATED_FILE_SIZE) {
          expect(result).toBe(true);
          currentTokens -= ESTIMATED_FILE_SIZE;
        } else {
          // Should be rate limited
          expect(result).toBe(false);
          break;
        }
      }

      // After 10 uploads, should have consumed 100MB
      expect(currentTokens).toBe(0);
    });
  });

  describe('Rate limiting (exceeding capacity)', () => {
    it('should rate limit when tokens depleted', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);
      const now = Date.now() / 1000;

      // Simulate bucket with only 5MB remaining (less than 10MB required)
      const lowTokens = 5 * 1024 * 1024;
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: lowTokens,
          lastRefill: now,
        }),
      );

      try {
        await guard.canActivate(context);
        fail('Should have thrown rate limit exception');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error.getResponse()).toMatchObject({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: expect.stringContaining('Upload rate limit exceeded'),
          retryAfter: expect.any(Number),
        });
      }

      // Verify bucket state was NOT updated (upload rejected)
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should provide accurate retry time in rate limit response', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);
      const now = Date.now() / 1000;

      // No tokens remaining
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: 0,
          lastRefill: now,
        }),
      );

      try {
        await guard.canActivate(context);
        fail('Should have thrown rate limit exception');
      } catch (error: any) {
        const response = error.getResponse();

        // Calculate expected retry time
        // Need 10MB, refill rate is 10MB per 60 seconds
        const expectedRetryMinutes = Math.ceil(
          (ESTIMATED_FILE_SIZE - 0) / REFILL_RATE_BYTES_PER_SECOND / 60,
        );

        expect(response.retryAfter).toBe(expectedRetryMinutes * 60);
        expect(response.message).toContain(`${expectedRetryMinutes} minute(s)`);
      }
    });

    it('should rate limit 11th upload after 10 successful uploads', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);
      const now = Date.now() / 1000;

      // After 10 uploads, bucket is empty
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: 0,
          lastRefill: now,
        }),
      );

      try {
        await guard.canActivate(context);
        fail('Should have thrown rate limit exception');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('Token bucket refill mechanism', () => {
    it('should refill tokens based on elapsed time', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Bucket was empty 60 seconds ago
      const sixtySecondsAgo = Date.now() / 1000 - 60;
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: 0,
          lastRefill: sixtySecondsAgo,
        }),
      );
      redisService.set.mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      // After 60 seconds, should have refilled 10MB (exactly one file worth)
      expect(result).toBe(true);

      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);

      // Refilled 10MB, then immediately consumed 10MB, should be ~0
      expect(bucketData.tokens).toBeLessThan(1 * 1024 * 1024); // Less than 1MB remaining
    });

    it('should cap refilled tokens at capacity (no overflow)', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Bucket had 50MB, but last refill was 24 hours ago
      const oneDayAgo = Date.now() / 1000 - 86400;
      const initialTokens = 50 * 1024 * 1024;
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: initialTokens,
          lastRefill: oneDayAgo,
        }),
      );
      redisService.set.mockResolvedValue(undefined);

      await guard.canActivate(context);

      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);

      // Even after 24 hours, should not exceed capacity - ESTIMATED_FILE_SIZE
      expect(bucketData.tokens).toBeLessThanOrEqual(CAPACITY_BYTES);
      expect(bucketData.tokens).toBe(CAPACITY_BYTES - ESTIMATED_FILE_SIZE);
    });

    it('should allow upload after waiting for refill', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // First call: bucket depleted
      const now = Date.now() / 1000;
      redisService.get.mockResolvedValueOnce(
        JSON.stringify({
          tokens: 0,
          lastRefill: now,
        }),
      );

      try {
        await guard.canActivate(context);
        fail('Should have been rate limited');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }

      // Second call: 60 seconds later, bucket refilled
      const sixtySecondsLater = now + 60;
      redisService.get.mockResolvedValueOnce(
        JSON.stringify({
          tokens: 0,
          lastRefill: now, // Still shows old timestamp
        }),
      );
      redisService.set.mockResolvedValue(undefined);

      // Mock Date.now to return future time
      const originalNow = Date.now;
      Date.now = jest.fn(() => sixtySecondsLater * 1000);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should calculate refill correctly at 10MB per minute rate', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // 30 seconds elapsed, should refill 5MB
      const thirtySecondsAgo = Date.now() / 1000 - 30;
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: 0,
          lastRefill: thirtySecondsAgo,
        }),
      );
      redisService.set.mockResolvedValue(undefined);

      try {
        await guard.canActivate(context);
        fail('Should be rate limited (only 5MB refilled, need 10MB)');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('Multi-user isolation', () => {
    it('should isolate token buckets per user', async () => {
      const user1 = 'user-111';
      const user2 = 'user-222';

      // User 1 depletes their bucket
      const context1 = createMockContext(user1);
      redisService.get.mockResolvedValue(
        JSON.stringify({
          tokens: 0,
          lastRefill: Date.now() / 1000,
        }),
      );

      try {
        await guard.canActivate(context1);
        fail('User 1 should be rate limited');
      } catch (error: any) {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }

      // User 2 has full capacity
      const context2 = createMockContext(user2);
      redisService.get.mockResolvedValue(null); // New user
      redisService.set.mockResolvedValue(undefined);

      const result = await guard.canActivate(context2);

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith(`upload:tokens:${user2}`);
    });

    it('should maintain separate bucket states for different users', async () => {
      const users = ['user-aaa', 'user-bbb', 'user-ccc'];
      const now = Date.now() / 1000;

      for (const userId of users) {
        const context = createMockContext(userId);

        redisService.get.mockResolvedValue(null);
        redisService.set.mockResolvedValue(undefined);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(redisService.get).toHaveBeenCalledWith(
          `upload:tokens:${userId}`,
        );
      }

      // Verify each user got their own bucket
      expect(redisService.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('Unauthenticated requests', () => {
    it('should allow unauthenticated requests (let auth guard handle)', async () => {
      const context = createMockContext(undefined); // No user

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(redisService.get).not.toHaveBeenCalled();
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should not create bucket for unauthenticated user', async () => {
      const context = createMockContext(undefined);

      await guard.canActivate(context);

      expect(redisService.get).not.toHaveBeenCalled();
    });
  });

  describe('Redis error handling', () => {
    it('should handle Redis connection failure gracefully', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Simulate Redis error
      redisService.get.mockRejectedValue(new Error('Redis connection failed'));

      // Should throw error (not silently fail)
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should handle Redis timeout gracefully', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      redisService.get.mockRejectedValue(new Error('Operation timed out'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Operation timed out',
      );
    });

    it('should handle corrupted bucket data gracefully', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Return invalid JSON
      redisService.get.mockResolvedValue('invalid-json-data');

      // Should throw parsing error
      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });

  describe('Bucket TTL and expiration', () => {
    it('should set 1 hour TTL on bucket state', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(redisService.set).toHaveBeenCalledWith(
        `upload:tokens:${userId}`,
        expect.any(String),
        3600, // 1 hour in seconds
      );
    });

    it('should reinitialize bucket after TTL expiration', async () => {
      const userId = 'user-123';
      const context = createMockContext(userId);

      // Simulate expired bucket (Redis returns null)
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(undefined);

      await guard.canActivate(context);

      const setCall = redisService.set.mock.calls[0][1];
      const bucketData = JSON.parse(setCall);

      // Should start fresh with full capacity
      expect(bucketData.tokens).toBe(CAPACITY_BYTES - ESTIMATED_FILE_SIZE);
    });
  });

  describe('Configuration validation', () => {
    it('should use correct capacity of 100MB', () => {
      const capacity = (guard as any).CAPACITY_BYTES;
      expect(capacity).toBe(100 * 1024 * 1024);
    });

    it('should use correct refill rate of 10MB per minute', () => {
      const refillRate = (guard as any).REFILL_RATE_BYTES_PER_SECOND;
      const expectedRate = (10 * 1024 * 1024) / 60;
      expect(refillRate).toBeCloseTo(expectedRate, 0);
    });

    it('should use correct TTL of 1 hour', () => {
      const ttl = (guard as any).TTL_SECONDS;
      expect(ttl).toBe(3600);
    });
  });
});
