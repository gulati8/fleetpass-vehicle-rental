import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Health Check Controller
 *
 * Provides health status endpoints for monitoring and load balancers.
 * Checks the status of critical dependencies (database, Redis).
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Basic health check endpoint
   * Returns overall system health and dependency status
   */
  @Public()
  @Get()
  async check() {
    const startTime = Date.now();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
      performance: {
        responseTime: 0,
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      },
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Redis connection
    try {
      const redisClient = this.redis.getClient();
      await redisClient.ping();
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Add performance metrics
    const memoryUsage = process.memoryUsage();
    health.performance.responseTime = Date.now() - startTime;
    health.performance.memory = {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    };

    return health;
  }

  /**
   * Liveness probe endpoint
   * Returns 200 if the application is running
   * Used by Kubernetes/Docker to determine if container should be restarted
   */
  @Public()
  @Get('live')
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe endpoint
   * Returns 200 only if the application is ready to serve traffic
   * Used by load balancers to determine if traffic should be routed to this instance
   */
  @Public()
  @Get('ready')
  async readiness() {
    const checks = {
      database: false,
      redis: false,
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Check Redis
    try {
      const redisClient = this.redis.getClient();
      await redisClient.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const isReady = checks.database && checks.redis;

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
