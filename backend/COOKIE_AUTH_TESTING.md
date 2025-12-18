# Cookie-Based Authentication - Testing Guide

## What Changed

JWT tokens are now stored in httpOnly cookies instead of localStorage, eliminating XSS vulnerabilities.

## Manual Testing Steps

### 1. Start the Backend
```bash
cd backend
npm run start:dev
```

### 2. Test Login (cURL)
```bash
curl -i -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "YourPassword123!"
  }'
```

**Expected Response:**
- Status: 201 Created
- Headers include: `Set-Cookie: auth_token=<JWT>; Path=/; HttpOnly; SameSite=Lax`
- Body does NOT contain `access_token` field
- Body contains `user` and `organization` data

### 3. Test Authenticated Request (cURL)
```bash
# Save cookie from login response
curl -i -X GET http://localhost:3001/api/v1/auth/me \
  -H "Cookie: auth_token=<JWT_FROM_STEP_2>"
```

**Expected Response:**
- Status: 200 OK
- Body contains user and organization data

### 4. Test Logout (cURL)
```bash
curl -i -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Cookie: auth_token=<JWT_FROM_STEP_2>"
```

**Expected Response:**
- Status: 201 Created
- Headers include: `Set-Cookie: auth_token=; Path=/; Expires=<past_date>`
- Body contains `{"message": "Logged out successfully"}`

## Browser Testing (DevTools)

### 1. Open Frontend
```bash
cd frontend
npm run dev
```

### 2. Navigate to Login
Open http://localhost:3000/auth/login

### 3. Check Cookie in DevTools
1. Open DevTools (F12)
2. Go to Application tab → Cookies → http://localhost:3001
3. After login, verify `auth_token` cookie exists with:
   - ✅ HttpOnly flag checked
   - ✅ SameSite: Lax
   - ✅ Path: /
   - ✅ Secure: false (dev mode) / true (production)

### 4. Verify XSS Protection
In browser console, try to access the cookie:
```javascript
document.cookie // Should NOT show auth_token
localStorage.getItem('auth_token') // Should return null
```

### 5. Test Authenticated Navigation
- Login successfully
- Navigate to http://localhost:3000/dealer
- Should see dashboard (authenticated)
- Refresh page - should remain authenticated

### 6. Test Logout
- Click "Logout" button in dashboard
- Should redirect to login page
- Check DevTools: `auth_token` cookie should be gone
- Try to navigate to /dealer - should redirect to login

## Security Validation Checklist

- [ ] **XSS Protection**: Cannot access token via JavaScript
- [ ] **HttpOnly Flag**: Cookie marked as HttpOnly in DevTools
- [ ] **SameSite**: Set to 'Lax' to prevent CSRF
- [ ] **Secure Flag**: Set in production (HTTPS only)
- [ ] **No Token in Response**: Login/signup responses don't include token
- [ ] **CORS Credentials**: Backend accepts credentials from frontend
- [ ] **Cookie Cleared on Logout**: Cookie properly removed

## Integration Tests

Run auth tests to verify cookie behavior:
```bash
cd backend
npm run test:integration -- auth.controller.integration.spec.ts
```

**Expected:**
- ✅ Login sets httpOnly cookie
- ✅ Signup sets httpOnly cookie
- ✅ Logout clears cookie
- ✅ Cookie has correct attributes (HttpOnly, SameSite=Lax, Path=/)
- ✅ Token NOT in response body

## Common Issues

### Issue: CORS error on login
**Fix:** Ensure `credentials: true` in CORS config (backend/src/main.ts)

### Issue: Cookie not sent with requests
**Fix:** Ensure `withCredentials: true` in axios config (frontend/lib/api-client.ts)

### Issue: Cookie not visible in DevTools
**Check:**
1. Cookie domain matches request domain
2. Path is `/`
3. Cookie not expired

### Issue: "401 Unauthorized" on protected routes
**Fix:**
1. Verify cookie is being sent (Network tab → Headers → Cookie)
2. Check JWT strategy is reading from cookie (backend/src/auth/strategies/jwt.strategy.ts)
3. Verify cookie name matches (`auth_token`)

## Production Checklist

Before deploying to production:
- [ ] Set `NODE_ENV=production`
- [ ] Verify `secure: true` flag on cookies (HTTPS only)
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Update frontend `NEXT_PUBLIC_API_URL` to production domain
- [ ] Test on HTTPS (cookies with secure flag require HTTPS)
