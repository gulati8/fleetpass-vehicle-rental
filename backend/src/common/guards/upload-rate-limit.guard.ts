import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Token bucket rate limiter for file uploads
 * Allows bursts but prevents sustained abuse
 *
 * Configuration:
 * - Capacity: 100MB (allows ~10 images immediately)
 * - Refill rate: 10MB per minute
 */
@Injectable()
export class UploadRateLimitGuard implements CanActivate {
  private readonly CAPACITY_BYTES = 100 * 1024 * 1024; // 100MB
  private readonly REFILL_RATE_BYTES_PER_SECOND = (10 * 1024 * 1024) / 60; // 10MB per minute
  private readonly TTL_SECONDS = 3600; // 1 hour

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true; // Let auth guard handle this
    }

    const key = `upload:tokens:${userId}`;
    const now = Date.now() / 1000; // Current time in seconds

    // Get current bucket state
    const bucketData = await this.redis.get(key);
    let tokens: number;
    let lastRefill: number;

    if (bucketData) {
      const parsed = JSON.parse(bucketData);
      tokens = parsed.tokens;
      lastRefill = parsed.lastRefill;

      // Calculate tokens to add based on time elapsed
      const elapsedSeconds = now - lastRefill;
      const tokensToAdd = elapsedSeconds * this.REFILL_RATE_BYTES_PER_SECOND;
      tokens = Math.min(this.CAPACITY_BYTES, tokens + tokensToAdd);
    } else {
      // Initialize bucket with full capacity
      tokens = this.CAPACITY_BYTES;
      lastRefill = now;
    }

    // Estimate upload size (conservative: assume 10MB per file if not known)
    const estimatedSize = 10 * 1024 * 1024; // 10MB estimate

    if (tokens < estimatedSize) {
      const refillTime = Math.ceil(
        (estimatedSize - tokens) / this.REFILL_RATE_BYTES_PER_SECOND / 60,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Upload rate limit exceeded. Please wait approximately ${refillTime} minute(s) before uploading more images.`,
          retryAfter: refillTime * 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Deduct tokens and update bucket
    const newTokens = tokens - estimatedSize;
    await this.redis.set(
      key,
      JSON.stringify({ tokens: newTokens, lastRefill: now }),
      this.TTL_SECONDS,
    );

    return true;
  }
}
