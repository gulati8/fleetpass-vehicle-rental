# Docker Setup Testing Guide

This guide helps you verify that the Docker Compose setup is working correctly.

## Prerequisites

1. Start Docker Desktop
2. Ensure Docker daemon is running: `docker info`

## Automated Testing

Run the automated test script:

```bash
./test-docker.sh
```

This script will:
- ✅ Verify Docker is running
- ✅ Validate docker-compose.yml
- ✅ Check for port conflicts
- ✅ Start all services
- ✅ Wait for health checks
- ✅ Test backend API
- ✅ Test frontend
- ✅ Test Redis connection
- ✅ Test PostgreSQL connection

## Manual Testing Checklist

### 1. Start Services

```bash
docker compose up
```

Watch the logs for:
- `fleetpass-postgres` - Should show "database system is ready to accept connections"
- `fleetpass-redis` - Should show "Ready to accept connections"
- `fleetpass-backend` - Should show "Nest application successfully started"
- `fleetpass-frontend` - Should show "Ready in X ms" or "compiled successfully"

### 2. Verify Service Health

```bash
# Check all containers are running
docker compose ps

# Should show:
# fleetpass-postgres  running (healthy)
# fleetpass-redis     running (healthy)
# fleetpass-backend   running
# fleetpass-frontend  running
```

### 3. Test Database Connection

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d fleetpass

# In psql prompt, run:
\dt  # List tables - should see Organization, User, etc.
\q   # Quit
```

Expected tables:
- Organization
- Location
- User
- Vehicle
- Customer
- Booking
- Lead
- Deal

### 4. Test Redis Connection

```bash
# Connect to Redis
docker compose exec redis redis-cli

# In redis-cli, run:
PING     # Should return PONG
KEYS *   # List all keys (may be empty initially)
exit
```

### 5. Test Backend API

```bash
# Health check endpoint
curl http://localhost:3001/api/v1/health

# Expected: {"status":"ok"}

# Try signup
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Test Motors",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@testmotors.com",
    "password": "password123"
  }'

# Expected: JSON with user, organization, and access_token
```

### 6. Test Frontend

Open in browser:
- http://localhost:3000 - Landing page
- http://localhost:3000/auth/signup - Signup page
- http://localhost:3000/auth/login - Login page

### 7. Test Hot Reload

#### Backend Hot Reload

1. Edit `backend/src/app.controller.ts`
2. Change the health check message
3. Save the file
4. Watch backend logs - should see "File change detected. Starting incremental compilation..."
5. Verify change at http://localhost:3001/api/v1/health

#### Frontend Hot Reload

1. Edit `frontend/app/page.tsx`
2. Change some text
3. Save the file
4. Browser should automatically refresh with new content

### 8. Test Redis Caching

```bash
# Login to get a token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@testmotors.com","password":"password123"}' \
  | jq -r '.access_token')

# Call /me endpoint twice (first hits DB, second hits cache)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/auth/me

# Check Redis for cached user data
docker compose exec redis redis-cli KEYS "user:*"

# Should show: user:<user-id>
```

### 9. Test Database Persistence

```bash
# Create data (signup/login)
# Stop services
docker compose down

# Start again
docker compose up

# Data should still exist (volumes preserve data)
```

## Common Issues and Solutions

### Port Already in Use

**Error**: "Bind for 0.0.0.0:3000 failed: port is already allocated"

**Solution**: Stop the service using that port or change the port mapping in docker-compose.yml:

```yaml
ports:
  - "3002:3000"  # Map host 3002 to container 3000
```

### Database Connection Failed

**Symptoms**: Backend logs show "connection refused" or "database does not exist"

**Solutions**:
1. Wait longer - PostgreSQL takes ~10 seconds to be ready
2. Check PostgreSQL health: `docker compose ps`
3. View PostgreSQL logs: `docker compose logs postgres`
4. Restart services: `docker compose restart backend`

### Redis Connection Failed

**Symptoms**: Backend logs show Redis connection errors

**Solutions**:
1. Check Redis health: `docker compose ps`
2. View Redis logs: `docker compose logs redis`
3. Restart Redis: `docker compose restart redis`

### Backend Won't Start

**Symptoms**: Backend container exits immediately

**Solutions**:
1. View full logs: `docker compose logs backend`
2. Common issues:
   - Migration failed: Run `docker compose exec backend npx prisma migrate reset`
   - Dependencies missing: Rebuild `docker compose up --build backend`
   - Syntax error: Check recent code changes

### Frontend Won't Start

**Symptoms**: Frontend container exits or shows build errors

**Solutions**:
1. View logs: `docker compose logs frontend`
2. Rebuild: `docker compose up --build frontend`
3. Check node_modules: `docker compose down -v && docker compose up`

### Hot Reload Not Working

**Backend**:
- Check volume mounts in docker-compose.yml
- Ensure file is in mounted directory (src/, prisma/)
- Restart: `docker compose restart backend`

**Frontend**:
- Check volume mounts for app/, components/, lib/
- Restart: `docker compose restart frontend`
- Clear browser cache

## Performance Checks

### Memory Usage

```bash
docker stats

# Should show reasonable memory usage:
# - postgres: ~50-100 MB
# - redis: ~10-20 MB
# - backend: ~100-200 MB
# - frontend: ~200-400 MB
```

### Response Times

```bash
# Test backend response time
time curl http://localhost:3001/api/v1/health

# Should be < 100ms after warm-up

# Test with caching
# First request (cache miss): ~50-100ms
# Second request (cache hit): ~10-20ms
```

## Logs Analysis

### View All Logs

```bash
docker compose logs -f
```

### View Specific Service

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

### Search Logs

```bash
# Find errors
docker compose logs | grep -i error

# Find warnings
docker compose logs | grep -i warn

# Find specific text
docker compose logs | grep "Nest application"
```

## Success Criteria

Your Docker setup is working correctly if:

- ✅ All 4 containers are running and healthy
- ✅ Frontend accessible at http://localhost:3000
- ✅ Backend API responds at http://localhost:3001/api/v1
- ✅ You can signup and create an organization
- ✅ You can login and access /me endpoint
- ✅ Hot reload works for both frontend and backend
- ✅ Redis caching reduces database queries
- ✅ Data persists after `docker compose down && docker compose up`
- ✅ No error logs in any service
- ✅ Response times are reasonable (<100ms)

## Next Steps

Once everything is working:

1. ⭐ Star the repo
2. 🚀 Start building features
3. 📖 Read the API documentation in README.md
4. 🔧 Explore the codebase structure
5. 🎨 Customize the frontend design
6. 📊 Add more API endpoints

## Cleanup

When done testing:

```bash
# Stop services (keep data)
docker compose down

# Stop and remove all data
docker compose down -v
```
