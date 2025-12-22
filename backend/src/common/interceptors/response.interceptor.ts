import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/api-response.types';

/**
 * Global response interceptor that wraps all successful responses
 * in a standardized ApiResponse<T> format
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response is already wrapped (has success field), return as-is
        // This handles cases like ThrottlerExceptionFilter that return custom formats
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Check if response includes pagination metadata
        const hasPaginationMeta =
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'total' in data &&
          'page' in data &&
          'limit' in data;

        if (hasPaginationMeta) {
          // Extract pagination data
          const { items, total, page, limit, totalPages } = data as any;

          return {
            success: true,
            data: items,
            meta: {
              page,
              limit,
              total,
              totalPages,
            },
            timestamp: new Date().toISOString(),
          };
        }

        // Standard success response
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
