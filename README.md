# FleetPass - Vehicle Rental Platform

A multi-tenant vehicle rental platform for car dealerships, built with Next.js, NestJS, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ installed (or use Docker)
- npm or yarn

### 1. Start PostgreSQL Database

**Option A: Using Docker**
```bash
docker run --name fleetpass-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=fleetpass \
  -p 5432:5432 \
  -d postgres:15
```

**Option B: Use existing PostgreSQL**
- Create a database named `fleetpass`
- Update the DATABASE_URL in backend/.env

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Update .env with your database connection
# DATABASE_URL="postgresql://user:password@localhost:5432/fleetpass?schema=public"

# Generate Prisma Client
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# Start the backend server
npm run start:dev
```

Backend will run on http://localhost:3001

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm run dev
```

Frontend will run on http://localhost:3000

## 🎯 Testing the Application

### 1. Visit the Landing Page
Open http://localhost:3000 in your browser

### 2. Create an Account
- Click "Sign Up"
- Fill in:
  - Organization Name: "Acme Motors"
  - First Name: "John"
  - Last Name: "Doe"
  - Email: "john@acmemotors.com"
  - Password: "password123"
- Click "Create account"

### 3. You're In!
You'll be redirected to the dealer dashboard with your organization details.

## 📁 Project Structure

```
FleetPass/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── auth/    # Authentication module (JWT)
│   │   ├── prisma/  # Database service
│   │   └── main.ts  # Entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── frontend/         # Next.js 14 application
│   ├── app/
│   │   ├── auth/    # Login/Signup pages
│   │   ├── (dealer)/ # Dealer dashboard
│   │   └── page.tsx # Landing page
│   ├── lib/
│   │   └── api-client.ts  # Axios instance
│   └── package.json
│
└── README.md
```

## 🔧 Tech Stack

**Backend:**
- NestJS (Node.js framework)
- Prisma ORM
- PostgreSQL
- Passport JWT
- bcrypt

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios

## ✅ What's Working

- ✅ User signup with organization creation
- ✅ User login with JWT authentication
- ✅ Protected dealer dashboard
- ✅ Automatic organization creation
- ✅ Session management

## 🚧 What's Next

The following features are planned but not yet implemented:

- Vehicle Management (CRUD)
- Customer Management
- Booking System with Mock Stripe
- Mock KYC Integration
- Vehicle Search & Filtering
- Dealer Analytics

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user (requires auth)

### Health Check
- `GET /api/v1/health` - Server health status

## 🔒 Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with RS256 (15 min expiry)
- Protected routes require authentication
- CORS configured for frontend origin

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend/.env
- Verify database exists: `psql -l`

### Port Already in Use
- Backend (3001): Change PORT in backend/.env
- Frontend (3000): Next.js will prompt for alternative port

### Migration Errors
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev --name init
```

## 📚 Development Commands

**Backend:**
```bash
npm run start:dev   # Start with hot reload
npm run build       # Build for production
npm run start:prod  # Run production build
```

**Frontend:**
```bash
npm run dev    # Development server
npm run build  # Build for production
npm run start  # Start production server
```

## 🎉 Demo Completed

You now have a working authentication system with:
- User signup creating organizations automatically
- JWT-based authentication
- Protected dealer dashboard
- Single-tenant architecture (each org gets isolated data)

Continue building features by adding modules to the backend and pages to the frontend!
