import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { LoggerService } from '../logger/logger.service';

/**
 * Custom exception filter for rate limiting errors
 * Provides user-friendly error messages and logs rate limit violations
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(ThrottlerExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log rate limit violation for security monitoring
    this.logger.logSecurityEvent('rate_limit_exceeded', {
      ip: request.ip,
      path: request.path,
      method: request.method,
      userAgent: request.headers['user-agent'],
    });

    response.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        message: 'Too many requests from this IP. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
      },
    });
  }
}
