# API Response Standardization

This document describes the standardized API response format implemented across the FleetPass backend.

## Overview

All API responses now follow a consistent format using the `ApiResponse<T>` and `ApiError` interfaces from the shared types library (`@shared/types`).

## Implementation

### Components

1. **ResponseInterceptor** (`src/common/interceptors/response.interceptor.ts`)
   - Wraps all successful responses in `ApiResponse<T>` format
   - Automatically extracts pagination metadata
   - Adds timestamp to responses
   - Skips wrapping for responses already in standard format

2. **HttpExceptionFilter** (`src/common/filters/http-exception.filter.ts`)
   - Standardizes all HTTP error responses
   - Extracts validation errors from class-validator
   - Logs errors with appropriate context
   - Generates consistent error codes

3. **ThrottlerExceptionFilter** (unchanged)
   - Handles rate limiting errors specifically
   - Already returns ApiError format

### Global Registration

Both components are registered globally in `app.module.ts`:

```typescript
providers: [
  // Exception filters (most specific first)
  { provide: APP_FILTER, useClass: ThrottlerExceptionFilter },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },

  // Interceptors (executed in registration order)
  { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
]
```

## Response Formats

### Success Response

```typescript
{
  success: true,
  data: T,              // Your response data
  timestamp: string,    // ISO 8601 timestamp
  meta?: {              // Optional pagination metadata
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**Example - Simple Success:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "john@example.com",
      "firstName": "John"
    },
    "access_token": "eyJhbGc..."
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Example - Paginated Success:**
```json
{
  "success": true,
  "data": [
    { "id": "veh_1", "make": "Toyota" },
    { "id": "veh_2", "make": "Honda" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    message: string,              // Human-readable error message
    code: string,                 // Machine-readable error code
    statusCode: number,           // HTTP status code
    details?: Record<string, string[]>  // Field-level validation errors
  }
}
```

**Example - Simple Error:**
```json
{
  "success": false,
  "error": {
    "message": "User with this email already exists",
    "code": "CONFLICT",
    "statusCode": 409
  }
}
```

**Example - Validation Error:**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 422,
    "details": {
      "email": ["must be a valid email address"],
      "password": [
        "must be at least 8 characters",
        "must contain at least one number"
      ]
    }
  }
}
```

**Example - Rate Limit Error:**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests from this IP. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429
  }
}
```

## Error Codes

The system generates consistent error codes:

| HTTP Status | Error Code | When Used |
|-------------|------------|-----------|
| 400 | BAD_REQUEST | Invalid request format |
| 401 | UNAUTHORIZED | Authentication required/failed |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource (e.g., email exists) |
| 422 | VALIDATION_ERROR | Input validation failed |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |

## Controller Implementation

Controllers should return raw data directly. The ResponseInterceptor will automatically wrap it.

### Before (Manual Wrapping)
```typescript
@Get('me')
async getMe(@Request() req) {
  const userData = await this.authService.getMe(req.user.id);
  return {
    success: true,
    data: userData,
    timestamp: new Date().toISOString()
  };
}
```

### After (Automatic Wrapping)
```typescript
@Get('me')
async getMe(@Request() req) {
  return this.authService.getMe(req.user.id);
}
```

The interceptor handles the wrapping automatically.

## Error Handling

### Throwing Standard Exceptions

```typescript
// Conflict error
if (existingUser) {
  throw new ConflictException('User with this email already exists');
}

// Unauthorized error
if (!isValidPassword) {
  throw new UnauthorizedException('Invalid credentials');
}

// Validation is handled automatically by class-validator DTOs
```

### Validation with DTOs

```typescript
import { IsEmail, MinLength, IsString } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: 'must be a valid email address' })
  email: string;

  @MinLength(8, { message: 'must be at least 8 characters' })
  password: string;

  @IsString()
  firstName: string;
}
```

Validation errors are automatically caught and formatted by HttpExceptionFilter.

## Logging

### Success Requests
- Logged by LoggingInterceptor with request/response details
- Includes duration, status code, IP, user agent

### Error Requests
- 4xx errors: Logged as warnings with context (no stack trace in production)
- 5xx errors: Logged as errors with full stack trace
- Rate limit violations: Logged as security events

## Testing

### Manual Testing

```bash
# Success response
curl http://localhost:3000/api/health

# Expected:
# {
#   "success": true,
#   "data": {
#     "status": "ok",
#     "timestamp": "2024-01-15T10:30:00.000Z",
#     "service": "fleetpass-api",
#     "version": "1.0.0"
#   },
#   "timestamp": "2024-01-15T10:30:00.000Z"
# }

# Error response (404)
curl http://localhost:3000/nonexistent

# Expected:
# {
#   "success": false,
#   "error": {
#     "message": "Cannot GET /nonexistent",
#     "code": "NOT_FOUND",
#     "statusCode": 404
#   }
# }

# Validation error
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid", "password": "123"}'

# Expected:
# {
#   "success": false,
#   "error": {
#     "message": "Validation failed",
#     "code": "VALIDATION_ERROR",
#     "statusCode": 422,
#     "details": {
#       "email": ["must be a valid email address"],
#       "password": ["must be at least 8 characters"]
#     }
#   }
# }
```

## Benefits

1. **Consistency**: All API responses follow the same format
2. **Type Safety**: Shared types ensure frontend and backend alignment
3. **Developer Experience**: Clear error messages with field-level details
4. **Debugging**: Automatic logging with context
5. **Security**: Stack traces hidden in production for client errors
6. **Observability**: Request IDs and structured logging for monitoring

## Migration Notes

- Existing controllers don't need changes if they return raw data
- If controllers manually wrap responses, remove the wrapping
- The interceptor handles all wrapping automatically
- Existing error handling (throw new ConflictException) continues to work
- Validation via class-validator DTOs works seamlessly
