import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse, ApiError } from '../types/api-response.types';
import { LoggerService } from '../logger/logger.service';

/**
 * Global exception filter that standardizes all HTTP error responses
 * Handles validation errors, authentication errors, and general exceptions
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract error details from exception
    const errorMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'An error occurred';

    // Generate error code from exception name or status
    const errorCode = this.generateErrorCode(exception, status);

    // Handle validation errors (422 Unprocessable Entity)
    let details: Record<string, string[]> | undefined;
    if (status === HttpStatus.UNPROCESSABLE_ENTITY && typeof exceptionResponse === 'object') {
      details = this.extractValidationErrors(exceptionResponse);
    }

    // Build standardized error response
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        message: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
        code: errorCode,
        statusCode: status,
        ...(details && { details }),
      },
    };

    // Log error with context (but not stack trace in production for 4xx errors)
    const shouldLogStack = status >= 500 || process.env.NODE_ENV !== 'production';
    if (shouldLogStack) {
      this.logger.error(
        `HTTP ${status} Error: ${errorResponse.error!.message}`,
        exception.stack,
        {
          path: request.url,
          method: request.method,
          statusCode: status,
          errorCode,
          ip: request.ip,
        },
      );
    } else {
      this.logger.warn(`HTTP ${status} Error: ${errorResponse.error!.message}`, {
        path: request.url,
        method: request.method,
        statusCode: status,
        errorCode,
        ip: request.ip,
      });
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Generate a consistent error code from the exception
   */
  private generateErrorCode(exception: HttpException, status: number): string {
    // Use exception name if available
    const exceptionName = exception.constructor.name;

    // Map common NestJS exceptions to error codes
    const exceptionCodeMap: Record<string, string> = {
      BadRequestException: 'BAD_REQUEST',
      UnauthorizedException: 'UNAUTHORIZED',
      ForbiddenException: 'FORBIDDEN',
      NotFoundException: 'NOT_FOUND',
      ConflictException: 'CONFLICT',
      UnprocessableEntityException: 'VALIDATION_ERROR',
      InternalServerErrorException: 'INTERNAL_ERROR',
    };

    if (exceptionCodeMap[exceptionName]) {
      return exceptionCodeMap[exceptionName];
    }

    // Fallback to status-based codes
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Extract validation errors from class-validator errors
   */
  private extractValidationErrors(
    exceptionResponse: any,
  ): Record<string, string[]> | undefined {
    // Check if response contains validation errors array
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      const details: Record<string, string[]> = {};

      for (const error of exceptionResponse.message) {
        if (typeof error === 'object' && error.property && error.constraints) {
          // Extract constraint messages
          details[error.property] = Object.values(error.constraints) as string[];
        } else if (typeof error === 'string') {
          // Fallback for simple string errors
          details['_general'] = details['_general'] || [];
          details['_general'].push(error);
        }
      }

      return Object.keys(details).length > 0 ? details : undefined;
    }

    return undefined;
  }
}
