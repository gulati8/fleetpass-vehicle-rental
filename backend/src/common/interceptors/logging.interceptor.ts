import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';
import { SafeHttpLogger } from '../logger/safe-http-logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly safeLogger: SafeHttpLogger;

  constructor() {
    const logger = new LoggerService('HTTP');
    this.safeLogger = new SafeHttpLogger(logger);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;

          const logDto = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent') || '',
            statusCode: res.statusCode,
            duration,
            userId: req.user?.sub,
            organizationId: req.user?.organizationId,
          };

          // Safe logging - never throws or blocks
          this.safeLogger.logRequestSafe(logDto);

          // Warn on slow requests
          if (duration > 1000) {
            this.safeLogger.logSlowRequestSafe(logDto);
          }
        },
        error: (error) => {
          const duration = Date.now() - start;

          const logDto = {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent') || '',
            statusCode: error.status || 500,
            duration,
            userId: req.user?.sub,
            organizationId: req.user?.organizationId,
          };

          const errorDto = {
            name: error.name,
            message: error.message,
            stack: error.stack,
          };

          // Safe error logging - never throws or blocks
          this.safeLogger.logErrorSafe(logDto, errorDto);
        },
      }),
    );
  }
}
