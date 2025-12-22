import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../logger/logger.service';

interface IdempotencyRecord {
  status: 'processing' | 'completed';
  response?: any;
  startedAt?: string;
  completedAt?: string;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new LoggerService('IdempotencyInterceptor');
  private readonly DEFAULT_TTL = 86400; // 24 hours

  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    // Skip GET requests (already idempotent by nature)
    if (req.method === 'GET') {
      return next.handle();
    }

    // Check if endpoint explicitly opted out
    const isNonIdempotent = this.reflector.get<boolean>(
      'non-idempotent',
      context.getHandler(),
    );
    if (isNonIdempotent) {
      this.logger.debug(
        `Endpoint opted out of idempotency: ${req.method} ${req.url}`,
      );
      return next.handle();
    }

    // Get idempotency key from header
    const idempotencyKey = req.headers['idempotency-key'];

    // Require idempotency key for all mutations
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency-Key header is required for POST/PUT/PATCH/DELETE requests',
      );
    }

    // Validate key format (must be UUID or 16+ alphanumeric characters)
    if (!this.isValidIdempotencyKey(idempotencyKey)) {
      throw new BadRequestException(
        'Invalid Idempotency-Key format. Must be UUID or 16+ alphanumeric characters.',
      );
    }

    // Build Redis key with organization scoping
    const redisKey = this.buildRedisKey(
      req.user?.organizationId || 'public',
      idempotencyKey,
    );

    // Check for existing cached response
    const cached = await this.redis.getJson<IdempotencyRecord>(redisKey);

    if (cached) {
      // Return cached response if request already completed
      if (cached.status === 'completed') {
        this.logger.debug(`Idempotency cache hit: ${idempotencyKey}`);
        return of(cached.response);
      }

      // Request is currently in progress (concurrent duplicate)
      if (cached.status === 'processing') {
        this.logger.warn(`Concurrent request detected: ${idempotencyKey}`);
        throw new ConflictException(
          'A request with this Idempotency-Key is already being processed. Please try again later.',
        );
      }
    }

    // Mark request as processing
    await this.redis.setJson(
      redisKey,
      {
        status: 'processing',
        startedAt: new Date().toISOString(),
      } as IdempotencyRecord,
      this.DEFAULT_TTL,
    );

    // Execute the request
    return next.handle().pipe(
      tap({
        next: async (response) => {
          try {
            // Cache successful response
            await this.redis.setJson(
              redisKey,
              {
                status: 'completed',
                response,
                completedAt: new Date().toISOString(),
              } as IdempotencyRecord,
              this.DEFAULT_TTL,
            );
            this.logger.debug(`Cached response for: ${idempotencyKey}`);
          } catch (error) {
            this.logger.error(
              `Failed to cache idempotent response: ${idempotencyKey}`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        error: async (_error) => {
          try {
            // Remove processing lock on error to allow retry with same key
            await this.redis.del(redisKey);
            this.logger.debug(
              `Cleared processing lock for failed request: ${idempotencyKey}`,
            );
          } catch (delError) {
            this.logger.error(
              `Failed to clear processing lock: ${idempotencyKey}`,
              delError instanceof Error ? delError.stack : String(delError),
            );
          }
        },
      }),
    );
  }

  private buildRedisKey(organizationId: string, key: string): string {
    return `idempotency:${organizationId}:${key}`;
  }

  private isValidIdempotencyKey(key: string): boolean {
    // Accept UUIDs or 16+ character alphanumeric strings
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const alphanumericPattern = /^[a-zA-Z0-9-_]{16,}$/;

    return uuidPattern.test(key) || alphanumericPattern.test(key);
  }
}
