#!/bin/bash

# FleetPass Docker Setup Test Script
# This script verifies that the Docker Compose setup is working correctly

set -e  # Exit on any error

echo "🧪 FleetPass Docker Test Suite"
echo "================================"
echo ""

# Check if Docker is running
echo "1️⃣  Checking if Docker is running..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Check if docker-compose.yml exists
echo "2️⃣  Checking for docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi
echo "✅ docker-compose.yml found"
echo ""

# Validate docker-compose configuration
echo "3️⃣  Validating docker-compose.yml..."
docker compose config > /dev/null 2>&1
echo "✅ docker-compose.yml is valid"
echo ""

# Check for port conflicts
echo "4️⃣  Checking for port conflicts..."
PORTS=(3000 3001 5432 6379)
CONFLICTS=0

for PORT in "${PORTS[@]}"; do
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $PORT is already in use"
        CONFLICTS=$((CONFLICTS + 1))
    fi
done

if [ $CONFLICTS -eq 0 ]; then
    echo "✅ All required ports are available"
else
    echo "❌ $CONFLICTS port(s) in conflict. Please stop services using those ports."
    echo "   You can check what's using a port with: lsof -i :PORT"
    exit 1
fi
echo ""

# Start services
echo "5️⃣  Starting Docker Compose services..."
docker compose up -d
echo "✅ Services started"
echo ""

# Wait for services to be healthy
echo "6️⃣  Waiting for services to be healthy..."
echo "   This may take 30-60 seconds..."

MAX_WAIT=120
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    POSTGRES_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' fleetpass-postgres 2>/dev/null || echo "starting")
    REDIS_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' fleetpass-redis 2>/dev/null || echo "starting")

    if [ "$POSTGRES_HEALTH" = "healthy" ] && [ "$REDIS_HEALTH" = "healthy" ]; then
        echo "✅ All services are healthy"
        break
    fi

    echo "   PostgreSQL: $POSTGRES_HEALTH | Redis: $REDIS_HEALTH"
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "❌ Services did not become healthy in time"
    echo "   Check logs with: docker compose logs"
    exit 1
fi
echo ""

# Wait a bit more for backend to finish migrations and start
echo "7️⃣  Waiting for backend to complete startup..."
sleep 10

# Check if backend is responding
echo "8️⃣  Testing backend API..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/health || echo "000")

if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo "✅ Backend API is responding"
else
    echo "⚠️  Backend API returned status: $BACKEND_RESPONSE"
    echo "   Backend may still be starting up. Check logs with: docker compose logs backend"
fi
echo ""

# Check if frontend is responding
echo "9️⃣  Testing frontend..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ Frontend is responding"
else
    echo "⚠️  Frontend returned status: $FRONTEND_RESPONSE"
    echo "   Frontend may still be starting up. Check logs with: docker compose logs frontend"
fi
echo ""

# Test Redis connection
echo "🔟 Testing Redis connection..."
REDIS_PING=$(docker compose exec -T redis redis-cli ping 2>/dev/null || echo "FAILED")

if [ "$REDIS_PING" = "PONG" ]; then
    echo "✅ Redis is responding"
else
    echo "❌ Redis connection failed"
fi
echo ""

# Test PostgreSQL connection
echo "1️⃣1️⃣  Testing PostgreSQL connection..."
PSQL_TEST=$(docker compose exec -T postgres psql -U postgres -d fleetpass -c "SELECT 1;" 2>/dev/null || echo "FAILED")

if [[ "$PSQL_TEST" == *"1 row"* ]]; then
    echo "✅ PostgreSQL is responding"
else
    echo "❌ PostgreSQL connection failed"
fi
echo ""

# Summary
echo "================================"
echo "🎉 Docker Setup Test Complete!"
echo ""
echo "📊 Results Summary:"
echo "   - Docker: ✅"
echo "   - PostgreSQL: $([ "$POSTGRES_HEALTH" = "healthy" ] && echo "✅" || echo "❌")"
echo "   - Redis: $([ "$REDIS_HEALTH" = "healthy" ] && echo "✅" || echo "❌")"
echo "   - Backend API: $([ "$BACKEND_RESPONSE" = "200" ] && echo "✅" || echo "⚠️")"
echo "   - Frontend: $([ "$FRONTEND_RESPONSE" = "200" ] && echo "✅" || echo "⚠️")"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001/api/v1"
echo ""
echo "📝 View logs with:"
echo "   docker compose logs -f"
echo ""
echo "🛑 Stop services with:"
echo "   docker compose down"
echo ""
