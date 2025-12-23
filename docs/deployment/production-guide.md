# FleetPass Deployment Guide

Complete guide for deploying FleetPass to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Production Configuration](#production-configuration)
- [Deployment](#deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Database Management](#database-management)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Backup Strategy](#backup-strategy)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)
- [Maintenance](#maintenance)

---

## Prerequisites

### Required Software
- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Git** >= 2.30
- **Domain name** configured with DNS (e.g., fleetpass.example.com)
- **SSL certificates** (Let's Encrypt recommended)

### Server Requirements

**Minimum** (Development/Testing):
- 2 CPU cores
- 4 GB RAM
- 20 GB storage
- Ubuntu 20.04+ or similar Linux distribution

**Recommended** (Production):
- 4+ CPU cores
- 8+ GB RAM
- 50+ GB SSD storage
- Ubuntu 22.04 LTS or similar

### External Services

1. **Stripe Account** (for payments)
   - Live API keys
   - Webhook endpoint configured

2. **Persona Account** (for KYC)
   - Production API key
   - Template ID configured

3. **Monitoring** (optional but recommended)
   - Sentry account for error tracking
   - Datadog/New Relic for APM

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/fleetpass.git
cd fleetpass

# Checkout the latest stable release
git checkout tags/v1.0.0  # Replace with latest version
```

### 2. Generate Secrets

FleetPass requires several cryptographically secure secrets. Generate them using OpenSSL:

```bash
# Generate JWT secret (64 bytes)
openssl rand -base64 64

# Generate database password
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 32
```

**IMPORTANT**: Store these secrets securely (e.g., password manager, vault). Never commit them to version control.

### 3. Configure Environment Variables

#### Backend Configuration

```bash
# Copy example file
cp backend/.env.production.example backend/.env.production

# Edit with your secrets
nano backend/.env.production
```

**Required variables to update:**

```bash
# Database
POSTGRES_PASSWORD=<paste-database-password>
DATABASE_URL=postgresql://fleetpass_prod:<paste-database-password>@postgres:5432/fleetpass_production?schema=public

# Redis
REDIS_PASSWORD=<paste-redis-password>

# JWT
JWT_SECRET=<paste-jwt-secret>

# CORS
FRONTEND_URL=https://fleetpass.example.com

# External Services
STRIPE_SECRET_KEY=sk_live_... # Your live Stripe key
PERSONA_API_KEY=persona_live_... # Your production Persona key
```

#### Frontend Configuration

```bash
# Copy example file
cp frontend/.env.production.example frontend/.env.production

# Edit with your API URL
nano frontend/.env.production
```

**Required variables to update:**

```bash
NEXT_PUBLIC_API_URL=https://api.fleetpass.example.com
# OR if using same domain with path:
# NEXT_PUBLIC_API_URL=https://fleetpass.example.com/api
```

### 4. Create Production Environment File

Create a root-level `.env` file for Docker Compose:

```bash
# Create .env file
cat > .env << 'EOF'
# Database
POSTGRES_USER=fleetpass_prod
POSTGRES_PASSWORD=<paste-database-password>
POSTGRES_DB=fleetpass_production

# Redis
REDIS_PASSWORD=<paste-redis-password>

# JWT
JWT_SECRET=<paste-jwt-secret>
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
LOG_LEVEL=info

# CORS
FRONTEND_URL=https://fleetpass.example.com

# API URL for frontend
NEXT_PUBLIC_API_URL=https://api.fleetpass.example.com

# External Services
STRIPE_SECRET_KEY=sk_live_...
PERSONA_API_KEY=persona_live_...

# Database URL
DATABASE_URL=postgresql://fleetpass_prod:<paste-database-password>@postgres:5432/fleetpass_production?schema=public
EOF
```

---

## Production Configuration

### Docker Compose Setup

The production stack uses `docker-compose.prod.yml`:

```bash
# Verify configuration
docker-compose -f docker-compose.prod.yml config

# Expected services: postgres, redis, backend, frontend
```

### Resource Limits

Default resource limits (adjust based on your server):

**Backend:**
- CPU: 1.0 core (limit), 0.5 core (reservation)
- Memory: 1GB (limit), 512MB (reservation)

**Frontend:**
- CPU: 0.5 core (limit), 0.25 core (reservation)
- Memory: 512MB (limit), 256MB (reservation)

To modify, edit `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'  # Increase for better performance
      memory: 2G
```

---

## Deployment

### Build and Start Services

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services in detached mode
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Run Database Migrations

```bash
# Run Prisma migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify migration status
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

### Optional: Seed Database

```bash
# Seed with sample data (only for testing production setup)
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

**WARNING**: Do not seed production databases with sample data in live environments.

### Verify Deployment

```bash
# Check service health
curl http://localhost:3001/api/v1/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "database": "healthy",
#     "redis": "healthy"
#   }
# }

# Check frontend
curl http://localhost:3000

# Should return HTML
```

---

## SSL/TLS Configuration

### Option 1: Nginx Reverse Proxy (Recommended)

Install Nginx and Certbot:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/fleetpass
```

**Configuration:**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name fleetpass.example.com api.fleetpass.example.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# Frontend - Main domain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name fleetpass.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/fleetpass.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fleetpass.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API - Subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.fleetpass.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/fleetpass.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fleetpass.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to backend API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint (bypass rate limiting)
    location /health {
        proxy_pass http://localhost:3001/api/v1/health;
        access_log off;
    }
}
```

Enable configuration:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fleetpass /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Obtain SSL certificate
sudo certbot --nginx -d fleetpass.example.com -d api.fleetpass.example.com

# Reload Nginx
sudo systemctl reload nginx
```

### Option 2: Cloudflare (Alternative)

If using Cloudflare:

1. Add your domain to Cloudflare
2. Point DNS records to your server IP
3. Enable SSL/TLS (Full or Full Strict mode)
4. Configure origin certificates on your server

---

## Database Management

### Backup Strategy

#### Automated Daily Backups

Create backup script:

```bash
# Create backup directory
sudo mkdir -p /backups/fleetpass
sudo chown $USER:$USER /backups/fleetpass

# Create backup script
cat > /home/$USER/backup-fleetpass.sh << 'EOF'
#!/bin/bash

# Configuration
BACKUP_DIR="/backups/fleetpass"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker-compose -f /path/to/fleetpass/docker-compose.prod.yml exec -T postgres \
  pg_dump -U fleetpass_prod fleetpass_production | \
  gzip > "$BACKUP_DIR/fleetpass_$DATE.sql.gz"

# Delete old backups
find "$BACKUP_DIR" -name "fleetpass_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: fleetpass_$DATE.sql.gz"
EOF

chmod +x /home/$USER/backup-fleetpass.sh
```

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/$USER/backup-fleetpass.sh >> /var/log/fleetpass-backup.log 2>&1
```

#### Manual Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U fleetpass_prod fleetpass_production | \
  gzip > fleetpass_backup_$(date +%Y%m%d).sql.gz
```

#### Restore from Backup

```bash
# Stop backend service
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
gunzip -c fleetpass_backup_YYYYMMDD.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U fleetpass_prod -d fleetpass_production

# Restart services
docker-compose -f docker-compose.prod.yml start backend
```

### Database Migrations

```bash
# Check migration status
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# Deploy pending migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Reset database (DANGER: Deletes all data)
# docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate reset
```

---

## Monitoring & Health Checks

### Health Endpoints

FleetPass provides three health check endpoints:

1. **General Health**: `GET /api/v1/health`
   - Returns overall system status
   - Checks database and Redis connectivity
   - Includes performance metrics

2. **Liveness Probe**: `GET /api/v1/health/live`
   - Checks if application is running
   - Used by orchestrators to restart unhealthy containers

3. **Readiness Probe**: `GET /api/v1/health/ready`
   - Checks if application is ready to serve traffic
   - Used by load balancers for traffic routing

### Monitoring Setup

#### Option 1: Uptime Monitoring (Simple)

Use services like:
- **UptimeRobot** (free tier available)
- **Pingdom**
- **StatusCake**

Configure to monitor: `https://api.fleetpass.example.com/api/v1/health`

#### Option 2: Sentry (Error Tracking)

```bash
# Add to backend/.env.production
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Add to frontend/.env.production
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### Option 3: Full Observability Stack

Deploy Prometheus + Grafana for metrics:

```bash
# Add to docker-compose.prod.yml (optional)
# See prometheus/ directory for configuration examples
```

### Log Management

#### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

#### Log Rotation

Configure Docker log rotation:

```bash
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

---

## Backup Strategy

### What to Backup

1. **Database** (Critical)
   - PostgreSQL database
   - Backup frequency: Daily
   - Retention: 30 days

2. **Environment Files** (Critical)
   - `.env` files
   - Backup frequency: On change
   - Storage: Secure vault

3. **Uploaded Files** (If applicable)
   - User uploads, invoices, etc.
   - Backup frequency: Daily
   - Storage: S3 or similar

### Backup Verification

Test backups regularly:

```bash
# Quarterly backup test procedure
1. Restore backup to test environment
2. Verify data integrity
3. Test application functionality
4. Document results
```

---

## Scaling

### Horizontal Scaling

#### Database (Read Replicas)

For high-traffic applications:

1. Set up PostgreSQL primary-replica replication
2. Configure read-only queries to use replicas
3. Use connection pooling (PgBouncer)

#### Application (Multiple Instances)

```yaml
# Scale backend to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Add load balancer (Nginx upstream)
upstream backend_servers {
  server localhost:3001;
  server localhost:3002;
  server localhost:3003;
}
```

#### Redis (Cluster Mode)

For high availability:

1. Use Redis Cluster or Redis Sentinel
2. Configure automatic failover
3. Update connection configuration

### Vertical Scaling

Increase resources for existing containers:

```yaml
# In docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '2.0'  # Increased from 1.0
      memory: 4G   # Increased from 1G
```

### CDN Integration

For frontend static assets:

1. Configure Cloudflare or AWS CloudFront
2. Update `NEXT_PUBLIC_CDN_URL` in frontend config
3. Enable asset caching

---

## Troubleshooting

### Application Won't Start

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U fleetpass_prod -d fleetpass_production

# Check DATABASE_URL format:
# postgresql://user:password@host:5432/database?schema=public

# Verify PostgreSQL is healthy
docker-compose -f docker-compose.prod.yml exec postgres pg_isready
```

### Redis Connection Issues

```bash
# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis \
  redis-cli -a YOUR_REDIS_PASSWORD ping

# Expected output: PONG

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis
```

### High Memory Usage

```bash
# Check container resource usage
docker stats

# Identify memory-hungry containers
# Consider:
# - Increasing memory limits
# - Optimizing queries
# - Enabling Redis memory limits
```

### Slow Performance

1. **Check database query performance**
   ```bash
   # Enable slow query logging
   # Analyze with EXPLAIN ANALYZE
   ```

2. **Monitor Redis cache hit rate**
   ```bash
   docker-compose -f docker-compose.prod.yml exec redis \
     redis-cli -a PASSWORD INFO stats
   ```

3. **Review application logs** for errors

### SSL Certificate Issues

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Test renewal (dry run)
sudo certbot renew --dry-run

# Check certificate expiry
echo | openssl s_client -servername fleetpass.example.com \
  -connect fleetpass.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets generated using cryptographically secure methods
- [ ] Environment files not committed to version control
- [ ] `.env.production` files have restrictive permissions (600)
- [ ] Database password is strong (32+ characters)
- [ ] JWT secret is strong (64+ bytes)
- [ ] Redis password is set
- [ ] CORS configured to allow only your frontend domain
- [ ] Rate limiting enabled (default: 100 req/min)

### Post-Deployment

- [ ] SSL/TLS enabled and enforced
- [ ] HTTP redirects to HTTPS
- [ ] Security headers configured (Nginx)
- [ ] Database not exposed to public internet
- [ ] Redis not exposed to public internet
- [ ] SSH key-based authentication only
- [ ] Firewall configured (allow only 80, 443, 22)
- [ ] Fail2ban installed and configured
- [ ] Regular security updates scheduled

### Ongoing

- [ ] Monitor security advisories for dependencies
- [ ] Review access logs weekly
- [ ] Test backups quarterly
- [ ] Rotate secrets annually
- [ ] Review user permissions monthly
- [ ] Audit API access patterns

### Firewall Configuration

```bash
# Ubuntu UFW example
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Maintenance

### Update Application

```bash
# Pull latest changes
cd /path/to/fleetpass
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify health
curl https://api.fleetpass.example.com/api/v1/health
```

### Restart Services

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Graceful restart (zero downtime - requires multiple instances)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend
```

### View Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Database Maintenance

```bash
# Vacuum database (reclaim space)
docker-compose -f docker-compose.prod.yml exec postgres \
  vacuumdb -U fleetpass_prod -d fleetpass_production --analyze

# Reindex database
docker-compose -f docker-compose.prod.yml exec postgres \
  reindexdb -U fleetpass_prod -d fleetpass_production
```

---

## Support & Additional Resources

### Documentation
- API Documentation: `https://api.fleetpass.example.com/api/docs` (if Swagger enabled)
- GitHub Repository: `https://github.com/your-org/fleetpass`

### Getting Help
- File issues: GitHub Issues
- Security vulnerabilities: security@fleetpass.example.com (create this email)
- General support: support@fleetpass.example.com

### Useful Commands Reference

```bash
# Quick reference for common operations

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Execute command in container
docker-compose -f docker-compose.prod.yml exec [service] [command]

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale [service]=[number]

# Update and restart
git pull && docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Appendix

### Environment Variables Reference

See `.env.production.example` files for complete list of configuration options.

### Port Reference

- `3000`: Frontend (Next.js)
- `3001`: Backend API (NestJS)
- `5432`: PostgreSQL (internal only)
- `6379`: Redis (internal only)

### Default Credentials

**WARNING**: There are no default credentials. All credentials must be set during initial setup.

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: 2024-12-18
**FleetPass Version**: 1.0.0
