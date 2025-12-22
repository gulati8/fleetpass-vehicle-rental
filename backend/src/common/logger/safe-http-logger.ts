import { LoggerService } from './logger.service';

interface HttpLogDto {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  statusCode: number;
  duration: number;
  userId?: string;
  organizationId?: string;
}

/**
 * Fail-safe HTTP logger that never throws or blocks responses.
 *
 * Uses process.nextTick() for async fire-and-forget logging.
 * Falls back to console.error if Pino fails.
 */
export class SafeHttpLogger {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Log HTTP request safely (never throws)
   */
  logRequestSafe(dto: HttpLogDto): void {
    // Fire-and-forget with process.nextTick (non-blocking)
    process.nextTick(() => {
      try {
        this.logger.log(
          `${dto.method} ${dto.url} ${dto.statusCode} - ${dto.duration}ms`,
          'HTTP',
        );

        // Also log structured data
        this.logger.logWithFields('info', `${dto.method} ${dto.url}`, {
          type: 'http_request',
          method: dto.method,
          url: dto.url,
          statusCode: dto.statusCode,
          duration: dto.duration,
          ip: dto.ip,
          userAgent: dto.userAgent,
          userId: dto.userId,
          organizationId: dto.organizationId,
        });
      } catch (error) {
        // Meta-logging: log that logging failed
        // Use console as fallback (Pino might be the problem)
        console.error('CRITICAL: HTTP logger failure', {
          error: error instanceof Error ? error.message : String(error),
          context: dto,
        });
      }
    });
  }

  /**
   * Log HTTP error safely (never throws)
   */
  logErrorSafe(
    dto: HttpLogDto,
    error: { name: string; message: string; stack?: string },
  ): void {
    process.nextTick(() => {
      try {
        this.logger.error(
          `Request failed: ${dto.method} ${dto.url}`,
          error.stack || error.message,
          {
            type: 'http_error',
            method: dto.method,
            url: dto.url,
            statusCode: dto.statusCode,
            duration: dto.duration,
            ip: dto.ip,
            userAgent: dto.userAgent,
            userId: dto.userId,
            organizationId: dto.organizationId,
            errorName: error.name,
            errorMessage: error.message,
          },
        );
      } catch (logError) {
        console.error('CRITICAL: HTTP error logger failure', {
          logError:
            logError instanceof Error ? logError.message : String(logError),
          originalError: error.message,
          context: dto,
        });
      }
    });
  }

  /**
   * Log slow request warning safely (never throws)
   */
  logSlowRequestSafe(dto: HttpLogDto): void {
    process.nextTick(() => {
      try {
        this.logger.warn(`Slow request detected: ${dto.method} ${dto.url}`, {
          duration: dto.duration,
          statusCode: dto.statusCode,
        });
      } catch (error) {
        console.error('CRITICAL: Slow request logger failure', {
          error: error instanceof Error ? error.message : String(error),
          context: dto,
        });
      }
    });
  }
}
