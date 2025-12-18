import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';
import { getLoggerConfig } from '../../config/logger.config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;

  constructor(context?: string) {
    this.logger = pino(getLoggerConfig());
    if (context) {
      this.logger = this.logger.child({ context });
    }
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(
    message: string,
    trace?: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: string | Record<string, any>,
  ) {
    if (typeof context === 'string') {
      this.logger.error({ context, trace }, message);
    } else {
      this.logger.error({ ...context, trace }, message);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, context?: string | Record<string, any>) {
    if (typeof context === 'string') {
      this.logger.warn({ context }, message);
    } else {
      this.logger.warn(context, message);
    }
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }

  // Custom methods for structured logging
  logWithFields(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: Record<string, any>,
  ) {
    this.logger[level](fields, message);
  }

  // Log HTTP requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logRequest(req: any, res: any, duration: number) {
    this.logger.info(
      {
        req,
        res,
        duration,
        type: 'http_request',
      },
      `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`,
    );
  }

  // Log security events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logSecurityEvent(event: string, details: Record<string, any>) {
    this.logger.warn(
      {
        type: 'security_event',
        event,
        ...details,
      },
      `Security event: ${event}`,
    );
  }

  // Log database queries (for slow query detection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logSlowQuery(query: string, duration: number, params?: any) {
    if (duration > 100) {
      this.logger.warn(
        {
          type: 'slow_query',
          query,
          duration,
          params,
        },
        `Slow query detected: ${duration}ms`,
      );
    }
  }
}
