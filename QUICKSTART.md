# FleetPass Quick Start Guide

Get FleetPass running locally in under 10 minutes.

## Prerequisites

- **Docker Desktop** installed and running
- **Node.js** 20+ (for local development)
- **Git** installed

## Quick Start (Docker - Recommended)

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/fleetpass.git
cd fleetpass

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

### 4. Test API

```bash
# Check health
curl http://localhost:3001/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "database": "healthy",
#     "redis": "healthy"
#   }
# }
```

## Local Development (Without Docker)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 2. Setup Database

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis

# Run migrations
cd backend
npx prisma migrate dev
```

### 3. Start Development Servers

```bash
# Backend (terminal 1)
cd backend
npm run start:dev

# Frontend (terminal 2)
cd frontend
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Default Credentials

**There are no default users.** You need to register a new account:

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Create an account

## Common Commands

### Docker

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service]

# Restart a service
docker-compose restart [service]

# Rebuild after code changes
docker-compose up -d --build
```

### Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate dev

# Open Prisma Studio
docker-compose exec backend npx prisma studio

# Reset database (WARNING: Deletes all data)
docker-compose exec backend npx prisma migrate reset
```

### Testing

```bash
# Backend tests
cd backend
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:cov           # With coverage

# Frontend tests
cd frontend
npm test                   # All tests
npm run test:ui           # Visual test UI
npm run test:coverage     # With coverage
```

## Project Structure

```
fleetpass/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/        # Authentication
│   │   ├── booking/     # Booking management
│   │   ├── customer/    # Customer management
│   │   ├── deal/        # CRM deals
│   │   ├── health/      # Health checks
│   │   ├── kyc/         # KYC verification
│   │   ├── lead/        # CRM leads
│   │   ├── location/    # Location management
│   │   ├── payment/     # Payment processing
│   │   ├── vehicle/     # Vehicle management
│   │   └── common/      # Shared utilities
│   ├── prisma/          # Database schema
│   └── test/            # Tests
│
├── frontend/            # Next.js UI
│   ├── app/            # App Router pages
│   ├── components/     # React components
│   ├── lib/           # Utilities
│   └── __tests__/     # Tests
│
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── DEPLOYMENT.md              # Production deployment guide
├── SECURITY.md                # Security documentation
└── PRODUCTION-CHECKLIST.md    # Pre-deployment checklist
```

## Key Features

### Implemented Features

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control
- Secure password hashing

✅ **Vehicle Management**
- CRUD operations
- Availability tracking
- Vehicle categories

✅ **Customer Management**
- Customer profiles
- Contact information
- Booking history

✅ **Booking System**
- Vehicle reservations
- Date range validation
- Booking status tracking

✅ **CRM**
- Lead management
- Deal pipeline
- Sales tracking

✅ **Payment Processing** (Stripe Mock)
- Payment intents
- Charge processing
- Webhook handling

✅ **KYC Verification** (Persona Mock)
- Identity verification
- Document upload
- Verification status tracking

✅ **Comprehensive Testing**
- 401 backend tests (100% passing)
- 236 frontend tests (100% passing)
- Unit, integration, and E2E coverage

### External Services

**Stripe Integration**:
- Mock implementation for development
- Replace with real API keys for production
- Webhook endpoint: `/api/v1/stripe/webhook`

**Persona Integration**:
- Mock implementation for development
- Replace with real API keys for production
- Supports inquiry creation and verification

## API Documentation

### Authentication

```bash
# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get profile (requires JWT token)
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Vehicles

```bash
# List vehicles
curl http://localhost:3001/api/v1/vehicles

# Create vehicle (requires authentication)
curl -X POST http://localhost:3001/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "year": 2024,
    "licensePlate": "ABC-1234",
    "vin": "1HGBH41JXMN109186",
    "color": "Silver",
    "status": "AVAILABLE",
    "dailyRate": 75.00,
    "locationId": 1
  }'
```

### Bookings

```bash
# Create booking
curl -X POST http://localhost:3001/api/v1/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": 1,
    "customerId": 1,
    "startDate": "2024-12-20T10:00:00Z",
    "endDate": "2024-12-25T10:00:00Z"
  }'
```

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker --version

# Check for port conflicts
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# View logs
docker-compose logs backend
docker-compose logs frontend
```

### Database connection issues

```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in backend/.env
# Should be: postgresql://fleetpass_user:password@postgres:5432/fleetpass?schema=public
```

### Redis connection issues

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Build errors

```bash
# Clean rebuild
docker-compose down -v  # WARNING: Deletes database
docker-compose build --no-cache
docker-compose up -d
```

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://fleetpass_user:password@postgres:5432/fleetpass?schema=public
POSTGRES_USER=fleetpass_user
POSTGRES_PASSWORD=password
POSTGRES_DB=fleetpass

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME=FleetPass
```

## Next Steps

1. **Explore the API**: Use the health check and test endpoints
2. **Create test data**: Register users, add vehicles, create bookings
3. **Run tests**: `npm test` in backend and frontend
4. **Read documentation**:
   - [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
   - [SECURITY.md](./SECURITY.md) for security best practices
   - [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) for go-live preparation

## Support

- **Issues**: https://github.com/your-org/fleetpass/issues
- **Documentation**: See README.md and docs/ folder
- **Security**: security@fleetpass.example.com

## License

[Your License Here]

---

**Quick Start Guide Version**: 1.0.0
**Last Updated**: 2024-12-18
