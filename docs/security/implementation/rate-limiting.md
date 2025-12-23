# Rate Limiting Implementation

## Overview

FleetPass API implements comprehensive rate limiting to prevent brute force attacks, denial of service, and resource exhaustion. This document describes the implementation and configuration.

## Rate Limiting Tiers

### Global Limits (Applied to All Endpoints)

The API uses a multi-tier approach to rate limiting:

| Tier | Window | Limit | Use Case |
|------|--------|-------|----------|
| **Short** | 1 second | 3 requests | Prevent rapid-fire abuse |
| **Medium** | 10 seconds | 20 requests | Prevent sustained abuse |
| **Long** | 1 minute | 100 requests | Overall API usage limit |

All three tiers must be satisfied for a request to be allowed.

### Authentication Endpoint Limits (Stricter)

Authentication endpoints have additional, stricter limits to prevent credential attacks:

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /auth/login` | 5 requests | 15 minutes | Prevent brute force password attacks |
| `POST /auth/signup` | 5 requests | 15 minutes | Prevent spam account creation |
| `POST /auth/validate-password` | 10 requests | 1 minute | Limit password validation checks |

## Implementation Details

### Technology Stack

- **@nestjs/throttler**: NestJS rate limiting module
- **Storage**: In-memory (default) or Redis for distributed systems

### Architecture

1. **ThrottlerModule**: Configured in `app.module.ts` with global rate limiting tiers
2. **ThrottlerGuard**: Applied globally via `APP_GUARD` provider
3. **ThrottlerExceptionFilter**: Custom exception filter for user-friendly error messages
4. **@Throttle() Decorator**: Per-endpoint overrides for stricter limits

### Files Modified

```
backend/src/
├── app.module.ts                          # ThrottlerModule configuration
├── main.ts                                # Application bootstrap
├── auth/auth.controller.ts                # Stricter auth endpoint limits
└── common/filters/
    └── throttler-exception.filter.ts      # Custom error handler
```

## Response Headers

The API includes rate limit information in response headers:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1702834567
```

- **X-RateLimit-Limit**: Maximum requests allowed in the current window
- **X-RateLimit-Remaining**: Requests remaining in the current window
- **X-RateLimit-Reset**: Unix timestamp when the window resets

## Error Response Format

When rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "error": {
    "message": "Too many requests from this IP. Please try again later.",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429
  }
}
```

## Security Logging

Rate limit violations are logged for security monitoring:

```json
{
  "event": "rate_limit_exceeded",
  "ip": "192.168.1.100",
  "path": "/api/v1/auth/login",
  "method": "POST",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-12-17T16:30:00.000Z"
}
```

This enables detection of:
- Brute force attack attempts
- Distributed denial of service patterns
- Credential stuffing campaigns
- API scraping/abuse

## Production Configuration

### Redis-Backed Storage (Recommended)

For production environments with multiple backend instances, use Redis for shared rate limit storage:

1. **Install Redis storage adapter**:
   ```bash
   npm install @nestjs/throttler-storage-redis ioredis
   ```

2. **Configure ThrottlerModule** in `app.module.ts`:
   ```typescript
   import { ThrottlerStorageRedisService } from '@nestjs/throttler-storage-redis';
   import Redis from 'ioredis';

   ThrottlerModule.forRootAsync({
     useFactory: () => ({
       throttlers: [
         { name: 'short', ttl: 1000, limit: 3 },
         { name: 'medium', ttl: 10000, limit: 20 },
         { name: 'long', ttl: 60000, limit: 100 },
       ],
       storage: new ThrottlerStorageRedisService(
         new Redis({
           host: process.env.REDIS_HOST || 'localhost',
           port: parseInt(process.env.REDIS_PORT || '6379'),
           password: process.env.REDIS_PASSWORD,
         }),
       ),
     }),
   }),
   ```

3. **Add environment variables**:
   ```bash
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-redis-password
   ```

### Benefits of Redis Storage

- **Distributed rate limiting**: Consistent limits across multiple backend instances
- **Persistence**: Rate limit state survives application restarts
- **Performance**: Redis is optimized for this use case
- **Scalability**: Handles high-traffic scenarios efficiently

## Testing Rate Limiting

### Automated Test Script

Run the included test script to verify rate limiting works:

```bash
cd backend
./test-rate-limit.sh
```

Expected output:
```
Attempt 1: HTTP 401 (Invalid credentials, as expected)
Attempt 2: HTTP 401
Attempt 3: HTTP 401
Attempt 4: HTTP 401
Attempt 5: HTTP 401
Attempt 6: HTTP 429
✅ Rate limit triggered successfully!
```

### Manual Testing with curl

**Test login rate limiting**:
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

**Check rate limit headers**:
```bash
curl -I -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

## Customizing Rate Limits

### Adding Endpoint-Specific Limits

Use the `@Throttle()` decorator to override global limits for specific endpoints:

```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('api')
export class ApiController {
  // Allow 1000 requests per minute for this endpoint
  @Throttle({ default: { limit: 1000, ttl: 60000 } })
  @Get('bulk-data')
  getBulkData() {
    // ...
  }

  // Disable rate limiting for this endpoint
  @Throttle({ default: { limit: 0, ttl: 0 } })
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
```

### Skipping Rate Limits for Specific Users

For trusted users or service accounts, you can skip rate limiting:

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@Controller('admin')
export class AdminController {
  @SkipThrottle()
  @Get('reports')
  getReports() {
    // No rate limiting applied
  }
}
```

## Monitoring and Alerts

### Recommended Alerts

Set up alerts for:

1. **High rate limit violations**: >100 violations per minute from single IP
2. **Distributed attacks**: >10 IPs hitting rate limits simultaneously
3. **Auth endpoint abuse**: Any rate limit violations on `/auth/*` endpoints

### Metrics to Track

- Total requests per minute
- Rate limit violations per endpoint
- Top IPs by violation count
- Geographic distribution of violations
- Time-series of violation patterns

### Integration with Monitoring Tools

Example Prometheus metrics:
```
# Total rate limit violations
fleetpass_rate_limit_violations_total{endpoint="/auth/login",ip="192.168.1.100"} 5

# Current request rate
fleetpass_requests_per_second{endpoint="/auth/login"} 0.5
```

## Security Considerations

### What Rate Limiting Protects Against

✅ **Brute force password attacks**: Limited login attempts prevent password guessing
✅ **Account enumeration**: Rate limiting makes enumeration attacks impractical
✅ **Denial of service**: Request limits prevent API flooding
✅ **Resource exhaustion**: Prevents database and memory exhaustion
✅ **Credential stuffing**: Limits impact of stolen credential lists

### What Rate Limiting Does NOT Protect Against

❌ **Distributed attacks**: Attackers using many IPs can bypass rate limits
❌ **Application logic flaws**: SQL injection, XSS, etc. require separate defenses
❌ **Zero-day exploits**: Unknown vulnerabilities need patching and WAF

### Defense in Depth

Rate limiting is ONE layer of security. Also implement:

- Strong password requirements (already implemented)
- Account lockout after failed attempts
- CAPTCHA for suspicious activity
- Multi-factor authentication
- IP reputation checking
- WAF (Web Application Firewall)
- Intrusion detection system

## Troubleshooting

### Rate Limit Triggered Too Early

**Symptom**: Legitimate users hitting rate limits

**Solution**:
1. Check client-side code for excessive retries
2. Increase limits for affected endpoints
3. Use Redis storage to ensure accurate counting across instances

### Rate Limit Headers Missing

**Symptom**: Response headers don't include `X-RateLimit-*`

**Solution**:
1. Verify CORS configuration exposes headers (already configured in `main.ts`)
2. Check that ThrottlerGuard is applied globally
3. Ensure request actually hit the rate limiter (not a static file)

### Rate Limiting Not Working

**Symptom**: Can exceed limits without getting 429 error

**Solution**:
1. Verify `ThrottlerGuard` is in `app.module.ts` providers with `APP_GUARD`
2. Check that endpoint doesn't have `@SkipThrottle()` decorator
3. Restart backend after configuration changes
4. Check logs for errors during ThrottlerModule initialization

## Future Enhancements

Potential improvements for future releases:

1. **Account-based rate limiting**: Limit per user account, not just IP
2. **Dynamic rate limiting**: Adjust limits based on system load
3. **IP whitelisting**: Bypass rate limits for trusted IPs
4. **Geographic rate limiting**: Stricter limits for high-risk regions
5. **CAPTCHA integration**: Require CAPTCHA after N violations
6. **Progressive penalties**: Increase timeout duration with repeated violations
7. **User-level quotas**: Per-user daily/monthly request quotas

## References

- [NestJS Throttler Documentation](https://docs.nestjs.com/security/rate-limiting)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Redis Rate Limiting Patterns](https://redis.io/docs/manual/patterns/rate-limiting/)
