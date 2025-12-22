# Idempotency Quick Reference

## For Frontend Developers

### ✅ You don't need to do anything

Idempotency is **100% automatic**. The API client handles it transparently.

```typescript
// This just works - idempotency key auto-generated
await apiClient.post('/auth/signup', { email, password });
```

### Manual override (rare)

```typescript
await apiClient.post('/auth/signup',
  { email, password },
  { headers: { 'Idempotency-Key': 'your-custom-key' } }
);
```

---

## For Backend Developers

### Default behavior: All mutations require idempotency key

```typescript
@Post('create-user')
async createUser() {
  // Idempotency automatically enforced
  // Duplicate requests return cached response
}
```

### Opt out (use sparingly!)

```typescript
import { NonIdempotent } from '@/common/decorators/non-idempotent.decorator';

@Post('generate-random-token')
@NonIdempotent()  // Requires code review justification
async generateToken() {
  // This endpoint will NOT enforce idempotency
}
```

---

## Testing Locally

### Test 1: Valid request
```bash
IDEMPOTENCY_KEY=$(uuidgen)

curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{"email": "test@example.com", "password": "Test123!@#", "organizationName": "Test"}'
```

### Test 2: Duplicate (same key)
```bash
# Rerun Test 1 with SAME key
# Expected: Same response, no duplicate data in DB
```

### Test 3: Missing key
```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!@#"}'

# Expected: 400 "Idempotency-Key header is required"
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| **201/200** | Success (first request or cached response) |
| **400** | Missing or invalid `Idempotency-Key` header |
| **409** | Concurrent request with same key already processing |

---

## Redis Commands

### View cached keys
```bash
redis-cli KEYS idempotency:*
```

### Get cached response
```bash
redis-cli GET idempotency:org-123:<UUID>
```

### Clear cache (dev/staging only!)
```bash
redis-cli FLUSHDB
```

---

## Troubleshooting

### "Idempotency-Key header is required"
✅ Frontend: Check `lib/api-client.ts` interceptor is active
✅ Manual testing: Add `-H "Idempotency-Key: $(uuidgen)"`

### 409 Conflict
✅ This is correct! Concurrent requests detected.
✅ Wait a few seconds and retry (or use a new key).

### Cached response is stale
✅ Keys expire after 24 hours automatically
✅ Or use a different `Idempotency-Key`

---

## Key Formats

### ✅ Valid
- UUID: `550e8400-e29b-41d4-a716-446655440000`
- Alphanumeric (16+ chars): `abc123def456ghi789jkl`

### ❌ Invalid
- Too short: `short`
- Special chars: `contains spaces!`

---

## Full Documentation

- **Implementation guide:** `backend/docs/IDEMPOTENCY.md`
- **Logging guide:** `backend/docs/FAIL_SAFE_LOGGING.md`
- **Phase 2 summary:** `backend/PHASE2_IMPLEMENTATION_SUMMARY.md`
