# Docker Setup Guide

This guide explains how to run FleetPass locally using Docker Compose.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- Git

## Architecture

The Docker Compose setup runs 4 services:

1. **PostgreSQL** - Database (port 5432)
2. **Redis** - Caching and session management (port 6379)
3. **Backend** - NestJS API (port 3001)
4. **Frontend** - Next.js application (port 3000)

All services run in isolated containers and communicate over a bridge network.

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FleetPass
```

### 2. Start All Services

```bash
docker compose up
```

This command will:
- Pull the required images (PostgreSQL 15, Redis 7, Node 20)
- Build the backend and frontend containers
- Start all services with proper dependency ordering
- Run database migrations automatically
- Mount source code for hot-reloading

### 3. Access the Application

Once all services are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **API Health Check**: http://localhost:3001/api/v1/health

### 4. Stop All Services

Press `Ctrl+C` in the terminal, or run:

```bash
docker compose down
```

## Development Workflow

### Hot Reloading

Both frontend and backend support hot reloading:

- **Backend**: Changes to `backend/src/**/*.ts` will trigger automatic rebuild
- **Frontend**: Changes to `frontend/app/**`, `frontend/components/**`, `frontend/lib/**` will trigger hot reload

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

### Restart a Service

```bash
# Restart backend
docker compose restart backend

# Restart frontend
docker compose restart frontend
```

### Rebuild Containers

If you modify `package.json` or `Dockerfile`:

```bash
# Rebuild and restart all services
docker compose up --build

# Rebuild specific service
docker compose up --build backend
```

## Database Management

### Run Prisma Migrations

Migrations run automatically on startup, but you can run them manually:

```bash
docker compose exec backend npx prisma migrate dev --name migration_name
```

### Access Prisma Studio

```bash
docker compose exec backend npx prisma studio
```

Then open http://localhost:5555 in your browser.

### Reset Database

```bash
docker compose exec backend npx prisma migrate reset
```

### Direct PostgreSQL Access

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d fleetpass

# Or from host machine (if psql installed)
psql postgresql://postgres:postgres@localhost:5432/fleetpass
```

## Redis Management

### Access Redis CLI

```bash
docker compose exec redis redis-cli
```

### Common Redis Commands

```bash
# View all keys
KEYS *

# Get a specific key
GET user:some-user-id

# Flush all cache
FLUSHALL
```

## Environment Variables

The `docker-compose.yml` file contains default development environment variables:

### Backend Environment Variables

- `NODE_ENV`: development
- `PORT`: 3001
- `DATABASE_URL`: Connection string to PostgreSQL container
- `REDIS_HOST`: redis
- `REDIS_PORT`: 6379
- `JWT_SECRET`: dev-secret-key-change-in-production
- `JWT_EXPIRES_IN`: 15m
- `FRONTEND_URL`: http://localhost:3000

### Frontend Environment Variables

- `NEXT_PUBLIC_API_URL`: http://localhost:3001/api/v1
- `NEXT_PUBLIC_APP_NAME`: FleetPass

To customize variables, create a `.env` file in the root directory (it will be ignored by Docker but can be referenced).

## Troubleshooting

### Port Conflicts

If ports 3000, 3001, 5432, or 6379 are already in use:

1. Stop the conflicting service
2. Or modify the port mappings in `docker-compose.yml`:

```yaml
ports:
  - "3002:3000"  # Map host:container
```

### Database Connection Issues

If the backend can't connect to PostgreSQL:

1. Check PostgreSQL is healthy:
   ```bash
   docker compose ps
   ```
2. View PostgreSQL logs:
   ```bash
   docker compose logs postgres
   ```
3. Restart PostgreSQL:
   ```bash
   docker compose restart postgres
   ```

### Permission Issues

On Linux, if you encounter permission errors:

```bash
sudo chown -R $USER:$USER .
```

### Clean Start

To completely remove containers, volumes, and start fresh:

```bash
# Stop and remove containers, networks
docker compose down

# Remove volumes (WARNING: This deletes all data)
docker compose down -v

# Start fresh
docker compose up
```

## Data Persistence

Data is persisted using Docker volumes:

- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis persistence files
- `backend_node_modules` - Backend dependencies
- `frontend_node_modules` - Frontend dependencies

These volumes persist even when containers are stopped or removed.

### View Volumes

```bash
docker volume ls | grep fleetpass
```

### Remove Volumes

```bash
# Remove specific volume
docker volume rm fleetpass_postgres_data

# Remove all project volumes
docker compose down -v
```

## Production Deployment

This Docker setup is for **development only**. For production:

1. Use the production Dockerfiles:
   - `backend/Dockerfile.prod`
   - `frontend/Dockerfile.prod`

2. Create a `docker-compose.prod.yml` with:
   - Environment-specific variables
   - No volume mounts for hot reload
   - Proper secrets management
   - Health checks with appropriate intervals
   - Resource limits

3. Use a managed database service instead of containerized PostgreSQL
4. Use a managed Redis service (e.g., Redis Cloud, AWS ElastiCache)

See the CI/CD documentation for automated deployments to Railway and Vercel.

## Useful Commands Cheat Sheet

```bash
# Start services
docker compose up

# Start in background (detached)
docker compose up -d

# Stop services
docker compose down

# View running services
docker compose ps

# View logs
docker compose logs -f [service_name]

# Rebuild containers
docker compose up --build

# Execute command in container
docker compose exec backend npm run test

# Remove everything including volumes
docker compose down -v

# Restart single service
docker compose restart backend
```

## Next Steps

1. Sign up at http://localhost:3000/auth/signup
2. Create your first organization
3. Explore the API documentation
4. Check the main README.md for API endpoint details
5. Review the backend code in `backend/src/`
6. Review the frontend code in `frontend/app/`

## Support

For issues:
1. Check the logs: `docker compose logs -f`
2. Verify all services are healthy: `docker compose ps`
3. Try a clean restart: `docker compose down && docker compose up`
4. Check the main README.md for additional documentation
