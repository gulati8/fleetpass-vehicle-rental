# Security Headers Implementation

## Overview

FleetPass backend API now includes comprehensive security headers via Helmet middleware to protect against common web vulnerabilities including XSS, clickjacking, MIME sniffing, and other header-based attacks.

## Implementation

### Files Created/Modified

1. **backend/src/config/helmet.config.ts** (Created)
   - Centralized Helmet configuration
   - Environment-aware CSP rules
   - Comprehensive security header settings

2. **backend/src/main.ts** (Modified)
   - Integrated Helmet middleware
   - Improved CORS configuration with origin validation
   - Cleaner security setup

3. **backend/package.json** (Modified)
   - Added `helmet@^8.1.0` dependency

4. **backend/test-security-headers.sh** (Created)
   - Automated test script to verify security headers
   - Validates all critical headers are present
   - Confirms X-Powered-By is removed

## Security Headers Applied

### Content-Security-Policy (CSP)
Prevents XSS attacks by controlling which resources can be loaded.

```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'  # Required for Tailwind CSS
img-src 'self' data: https:
connect-src 'self' http://localhost:3000 ws://localhost:3000  # Dev only
font-src 'self' https: data:
object-src 'none'
media-src 'self'
frame-src 'none'
base-uri 'self'
form-action 'self'
```

### Strict-Transport-Security (HSTS)
Forces HTTPS connections for 1 year.

```
max-age=31536000; includeSubDomains; preload
```

### X-Frame-Options
Prevents clickjacking attacks.

```
DENY
```

### X-Content-Type-Options
Prevents MIME type sniffing.

```
nosniff
```

### X-XSS-Protection
Legacy browser XSS protection (modern CSP is preferred).

```
0  # Disabled in favor of CSP
```

### Referrer-Policy
Controls referrer information leakage.

```
strict-origin-when-cross-origin
```

### X-Powered-By
Removed to avoid revealing technology stack.

## Environment-Specific Configuration

The Helmet configuration adapts based on `NODE_ENV`:

### Development
- Allows WebSocket connections for Hot Module Replacement (HMR)
- Allows localhost connections in CSP `connect-src`

### Production
- Stricter CSP rules
- No WebSocket or localhost exceptions

## CORS Improvements

Enhanced CORS configuration with:

- **Origin validation function**: Explicitly checks allowed origins
- **Credentials support**: Enabled for authenticated requests
- **Exposed headers**: Rate limit headers for client-side monitoring
- **Method restrictions**: Only allows necessary HTTP methods

## Testing

### Automated Test

Run the security headers test:

```bash
./backend/test-security-headers.sh
```

Expected output:
```
✅ X-Frame-Options present
✅ Strict-Transport-Security present
✅ X-Content-Type-Options present
✅ X-XSS-Protection present
✅ Referrer-Policy present
✅ Content-Security-Policy present
✅ X-Powered-By removed
```

### Manual Verification

Check headers on any endpoint:

```bash
curl -I http://localhost:3001/api/v1/health
```

## Security Impact

This implementation mitigates the following OWASP Top 10 risks:

| OWASP Category | Risk | Mitigation |
|----------------|------|------------|
| **A03:2021 - Injection** | XSS attacks | Content-Security-Policy prevents inline scripts |
| **A05:2021 - Security Misconfiguration** | Missing security headers | All critical headers now present |
| **A05:2021 - Security Misconfiguration** | Information disclosure | X-Powered-By removed |
| **A07:2021 - Identification and Authentication Failures** | Session hijacking | HSTS forces HTTPS for secure transport |

## Production Considerations

### Before Deploying to Production

1. **Update FRONTEND_URL**: Set correct production frontend URL in environment variables
2. **HTTPS Required**: HSTS header requires HTTPS in production
3. **CSP Tuning**: May need to adjust CSP for CDN resources (fonts, images, etc.)
4. **Browser Compatibility**: Test with target browsers (modern browsers fully support these headers)

### Environment Variables

```bash
# .env
FRONTEND_URL=https://app.fleetpass.com
NODE_ENV=production
```

## Maintenance

### Adding New External Resources

If you need to load resources from external domains:

1. Update `helmet.config.ts`
2. Add the domain to appropriate CSP directive
3. Re-test headers with the test script

Example: Adding Google Fonts

```typescript
// In helmet.config.ts
fontSrc: ["'self'", 'https:', 'data:', 'https://fonts.googleapis.com'],
styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
```

### CSP Violation Reporting

To monitor CSP violations in production, add a report-uri:

```typescript
contentSecurityPolicy: {
  directives: {
    // ... existing directives
    reportUri: '/api/v1/csp-report',
  },
},
```

Then implement the `/csp-report` endpoint to log violations.

## References

- [Helmet Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
