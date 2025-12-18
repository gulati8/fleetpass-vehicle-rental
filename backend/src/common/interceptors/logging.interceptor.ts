import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new LoggerService('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const statusCode = res.statusCode;

          this.logger.logRequest(
            { method, url, ip, userAgent },
            { statusCode },
            duration,
          );

          // Warn on slow requests
          if (duration > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${url}`, {
              duration,
              statusCode,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(`Request failed: ${method} ${url}`, error.stack, {
            ip,
            userAgent,
            duration,
          });
        },
      }),
    );
  }
}
