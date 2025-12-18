# Security Setup Guide

## Overview

All secrets have been removed from version control and are now managed through environment variables. This document explains the new security configuration.

## Critical Changes

### 1. Environment Variables
All sensitive configuration is now stored in `backend/.env` (NOT committed to git):

- **Database credentials**: `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **JWT secret**: `JWT_SECRET` (64-byte cryptographically secure random value)
- **Redis password**: `REDIS_PASSWORD` (32-byte cryptographically secure random value)

### 2. Security Improvements

#### Port Binding
- PostgreSQL: Bound to `127.0.0.1:5432` (localhost only)
- Redis: Bound to `127.0.0.1:6379` (localhost only)
- **Impact**: Services are no longer accessible from external networks

#### Redis Authentication
- Redis now requires password authentication
- Connection string updated in backend service
- Health checks use authenticated connections

#### Database User
- Changed from default `postgres` user to dedicated `fleetpass_user`
- Follows principle of least privilege

## Setup Instructions

### For New Developers

1. **Copy the example environment file**:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Generate strong secrets**:
   ```bash
   # Generate JWT secret (64 bytes)
   openssl rand -base64 64

   # Generate Redis password (32 bytes)
   openssl rand -base64 32

   # Generate Postgres password (24 bytes)
   openssl rand -base64 24
   ```

3. **Update `backend/.env`** with the generated secrets:
   - Replace `REPLACE_WITH_64_BYTE_RANDOM_SECRET_USE_openssl_rand_base64_64` with JWT secret
   - Replace `REPLACE_WITH_REDIS_PASSWORD_USE_openssl_rand_base64_32` with Redis password
   - Replace `REPLACE_WITH_STRONG_PASSWORD_USE_openssl_rand_base64_24` with Postgres password
   - Update `DATABASE_URL` with the Postgres password

4. **Start the application**:
   ```bash
   docker-compose up -d
   ```

### Verifying Security

```bash
# 1. Verify no secrets in docker-compose.yml
grep -E "(dev-secret|password.*:)" docker-compose.yml
# Should return nothing

# 2. Verify .env is gitignored
git check-ignore backend/.env
# Should output: backend/.env

# 3. Test Redis requires authentication
docker exec fleetpass-redis redis-cli ping
# Should return: (error) NOAUTH Authentication required

# 4. Test authenticated Redis connection
docker exec fleetpass-redis redis-cli -a $(grep REDIS_PASSWORD backend/.env | cut -d= -f2) ping
# Should return: PONG
```

## Production Deployment

### Environment Variables
For production, use your platform's secret management:

- **AWS**: AWS Secrets Manager or Parameter Store
- **Azure**: Azure Key Vault
- **GCP**: Secret Manager
- **Kubernetes**: Sealed Secrets or External Secrets Operator
- **Docker**: Docker Secrets

### Recommendations

1. **Rotate secrets regularly**: Every 90 days minimum
2. **Use different secrets per environment**: Never reuse dev secrets in production
3. **Audit access**: Monitor who accesses secrets
4. **Backup safely**: Use encrypted backups for secret rotation plans

## Troubleshooting

### "NOAUTH Authentication required" Error
**Cause**: Redis password not configured correctly

**Solution**:
```bash
# Check REDIS_PASSWORD is set in backend/.env
grep REDIS_PASSWORD backend/.env

# Restart containers
docker-compose restart redis backend
```

### Backend Can't Connect to Database
**Cause**: DATABASE_URL doesn't match POSTGRES_PASSWORD

**Solution**:
```bash
# Ensure DATABASE_URL contains the same password as POSTGRES_PASSWORD
# Example: postgresql://fleetpass_user:YOUR_PASSWORD@postgres:5432/fleetpass?schema=public
```

### "Connection Refused" for PostgreSQL/Redis
**Cause**: Ports are bound to localhost only

**Solution**: This is intentional for security. Access from:
- Inside Docker network (backend service)
- Localhost tools (e.g., `psql -h localhost`)
- Not accessible from other machines (by design)

## Security Checklist

- [x] No hardcoded secrets in docker-compose.yml
- [x] backend/.env gitignored (not committed)
- [x] Strong cryptographic secrets generated
- [x] Redis password authentication enabled
- [x] Database uses non-default user
- [x] Ports bound to localhost only
- [x] .env.example provided with clear placeholders
- [x] Documentation updated

## Questions?

Contact the infrastructure team for:
- Production secret management
- Secret rotation procedures
- Security incident response
