import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new LoggerService(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password, // Enable password authentication
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err.stack);
    });

    this.client.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting');
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Get parsed JSON value by key
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(
        'Error parsing JSON from Redis',
        error instanceof Error ? error.stack : String(error),
        { key },
      );
      return null;
    }
  }

  /**
   * Set value with optional expiration (in seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Set JSON value with optional expiration (in seconds)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async setJson(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.set(key, serialized, ttl);
  }

  /**
   * Delete key(s)
   */
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiration on key (in seconds)
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
