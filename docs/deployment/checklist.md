# FleetPass Production Readiness Checklist

Complete checklist for deploying FleetPass to production. Review each section carefully before going live.

## Table of Contents

- [Pre-Deployment](#pre-deployment)
- [Infrastructure Setup](#infrastructure-setup)
- [Security Configuration](#security-configuration)
- [Application Configuration](#application-configuration)
- [Database Setup](#database-setup)
- [Monitoring & Observability](#monitoring--observability)
- [Testing in Production](#testing-in-production)
- [Go-Live](#go-live)
- [Post-Deployment](#post-deployment)

---

## Pre-Deployment

### Documentation Review

- [ ] Read complete [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- [ ] Read [SECURITY.md](./SECURITY.md) security guide
- [ ] Review [README.md](./README.md) for application overview
- [ ] Understand backup and restore procedures

### Team Preparation

- [ ] Incident response team identified
- [ ] Contact information documented and shared
- [ ] Escalation procedures defined
- [ ] Deployment schedule communicated
- [ ] Rollback plan documented and understood
- [ ] On-call rotation established

### Requirements Verification

- [ ] Server meets minimum requirements (4 CPU, 8GB RAM, 50GB storage)
- [ ] Domain name registered and DNS configured
- [ ] SSL certificates available or Let's Encrypt configured
- [ ] External service accounts ready (Stripe, Persona)
- [ ] Monitoring accounts created (Sentry, etc.)
- [ ] Email service configured (for notifications)

---

## Infrastructure Setup

### Server Configuration

- [ ] Ubuntu 22.04 LTS (or equivalent) installed
- [ ] System packages updated: `sudo apt update && sudo apt upgrade`
- [ ] Docker installed: `docker --version` (>= 20.10)
- [ ] Docker Compose installed: `docker-compose --version` (>= 2.0)
- [ ] Git installed: `git --version` (>= 2.30)
- [ ] Server timezone set: `timedatectl set-timezone UTC`
- [ ] NTP configured for time synchronization

### Network Configuration

- [ ] Static IP address assigned
- [ ] DNS A records configured:
  - `fleetpass.example.com` → Server IP
  - `api.fleetpass.example.com` → Server IP
- [ ] DNS propagation verified: `dig fleetpass.example.com`
- [ ] Firewall installed: `sudo ufw status`
- [ ] Firewall rules configured:
  - Port 22 (SSH) - **allowed**
  - Port 80 (HTTP) - **allowed**
  - Port 443 (HTTPS) - **allowed**
  - Port 3000 (Frontend) - **denied** (internal only)
  - Port 3001 (Backend) - **denied** (internal only)
  - Port 5432 (PostgreSQL) - **denied** (internal only)
  - Port 6379 (Redis) - **denied** (internal only)

### Nginx Reverse Proxy

- [ ] Nginx installed: `nginx -v`
- [ ] Site configuration created at `/etc/nginx/sites-available/fleetpass`
- [ ] Configuration validated: `sudo nginx -t`
- [ ] Site enabled: symlink in `/etc/nginx/sites-enabled/`
- [ ] Default site disabled
- [ ] Nginx reloaded: `sudo systemctl reload nginx`

### SSL/TLS Configuration

- [ ] Let's Encrypt Certbot installed
- [ ] SSL certificates obtained: `sudo certbot --nginx -d fleetpass.example.com -d api.fleetpass.example.com`
- [ ] Auto-renewal configured: `sudo certbot renew --dry-run`
- [ ] Certificate expiry reminder set (30 days before)
- [ ] HTTPS working: `curl https://fleetpass.example.com`
- [ ] HTTP redirects to HTTPS verified
- [ ] SSL labs test passed: https://www.ssllabs.com/ssltest/
  - Target: A+ rating

---

## Security Configuration

### Secrets Generation

- [ ] JWT secret generated: `openssl rand -base64 64`
- [ ] Database password generated: `openssl rand -base64 32`
- [ ] Redis password generated: `openssl rand -base64 32`
- [ ] All secrets stored in secure password manager
- [ ] Secrets documented (location, rotation schedule)

### Environment Files

- [ ] Backend `.env.production` created from example
- [ ] Frontend `.env.production` created from example
- [ ] Root `.env` file created for Docker Compose
- [ ] All placeholder values replaced with real secrets
- [ ] File permissions set to 600: `chmod 600 backend/.env.production`
- [ ] Files NOT committed to Git (verify with `git status`)

### SSH Hardening

- [ ] SSH key-based authentication configured
- [ ] Password authentication disabled in `/etc/ssh/sshd_config`
- [ ] Root login disabled: `PermitRootLogin no`
- [ ] SSH port changed from default 22 (optional but recommended)
- [ ] Fail2ban installed: `sudo apt install fail2ban`
- [ ] Fail2ban configured for SSH protection
- [ ] Fail2ban active: `sudo systemctl status fail2ban`

### Server Hardening

- [ ] Non-root user created for deployment
- [ ] Sudo access configured for deployment user
- [ ] Automatic security updates enabled: `sudo dpkg-reconfigure unattended-upgrades`
- [ ] Unnecessary services disabled
- [ ] Swap configured (if needed): `sudo swapon --show`

### Docker Security

- [ ] Docker running as non-root user: verified in Dockerfile.prod
- [ ] Docker images from trusted sources only
- [ ] Docker daemon secured: `/etc/docker/daemon.json` configured
- [ ] Docker socket permissions verified

---

## Application Configuration

### Repository Setup

- [ ] Repository cloned: `git clone https://github.com/your-org/fleetpass.git`
- [ ] Latest stable version checked out: `git checkout tags/v1.0.0`
- [ ] Project directory ownership set: `chown -R user:user /path/to/fleetpass`

### Environment Variables

**Backend** (`backend/.env.production`):

- [ ] `DATABASE_URL` - correct PostgreSQL connection string
- [ ] `POSTGRES_USER` - set to `fleetpass_prod`
- [ ] `POSTGRES_PASSWORD` - strong random password
- [ ] `POSTGRES_DB` - set to `fleetpass_production`
- [ ] `REDIS_HOST` - set to `redis`
- [ ] `REDIS_PORT` - set to `6379`
- [ ] `REDIS_PASSWORD` - strong random password
- [ ] `JWT_SECRET` - 64-byte random secret
- [ ] `JWT_EXPIRES_IN` - set to `7d` or as required
- [ ] `NODE_ENV` - set to `production`
- [ ] `PORT` - set to `3001`
- [ ] `LOG_LEVEL` - set to `info`
- [ ] `FRONTEND_URL` - set to `https://fleetpass.example.com`
- [ ] `STRIPE_SECRET_KEY` - live Stripe key (sk_live_...)
- [ ] `PERSONA_API_KEY` - production Persona key
- [ ] `SENTRY_DSN` - (optional) Sentry error tracking

**Frontend** (`frontend/.env.production`):

- [ ] `NEXT_PUBLIC_API_URL` - set to `https://api.fleetpass.example.com`
- [ ] `NODE_ENV` - set to `production`
- [ ] `NEXT_PUBLIC_ENV` - set to `production`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - (optional) Sentry error tracking

**Docker Compose** (`.env`):

- [ ] All required variables present
- [ ] Variables match backend `.env.production`
- [ ] `DATABASE_URL` includes correct password

### External Services

**Stripe**:

- [ ] Production account verified
- [ ] Live API keys obtained (sk_live_... and pk_live_...)
- [ ] Webhook endpoint configured: `https://api.fleetpass.example.com/api/v1/stripe/webhook`
- [ ] Webhook secret saved
- [ ] Test payment successful in Stripe dashboard

**Persona**:

- [ ] Production account verified
- [ ] Production API key obtained
- [ ] Template ID configured
- [ ] KYC workflow tested
- [ ] Webhook endpoint configured (if applicable)

---

## Database Setup

### PostgreSQL Configuration

- [ ] Database service started: `docker-compose -f docker-compose.prod.yml up -d postgres`
- [ ] Database health check passed: `docker-compose -f docker-compose.prod.yml ps postgres`
- [ ] Database connection verified: `docker-compose -f docker-compose.prod.yml exec postgres psql -U fleetpass_prod -d fleetpass_production`
- [ ] Database encoding verified: `SHOW SERVER_ENCODING;` should be `UTF8`

### Database Migrations

- [ ] Prisma migrations run: `docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy`
- [ ] Migration status verified: `docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status`
- [ ] Database schema verified (all tables created)
- [ ] Indexes created (verify with `\di` in psql)

### Database Backup

- [ ] Backup directory created: `mkdir -p /backups/fleetpass`
- [ ] Backup script tested: `./scripts/backup-database.sh`
- [ ] Backup file created and verified
- [ ] Backup restoration tested: `./scripts/restore-database.sh <backup-file>`
- [ ] Automated daily backups configured (cron)
- [ ] Backup retention policy set (30 days default)
- [ ] Off-site backup configured (S3, Backblaze, etc.)

### Redis Configuration

- [ ] Redis service started: `docker-compose -f docker-compose.prod.yml up -d redis`
- [ ] Redis health check passed
- [ ] Redis connection verified: `docker-compose -f docker-compose.prod.yml exec redis redis-cli -a PASSWORD ping`
- [ ] Redis password authentication working
- [ ] Redis persistence enabled (AOF or RDB)
- [ ] Redis maxmemory policy configured: `allkeys-lru`

---

## Monitoring & Observability

### Health Checks

- [ ] Backend health endpoint accessible: `curl https://api.fleetpass.example.com/health`
- [ ] Health check returns JSON with status "healthy"
- [ ] Database health check passing
- [ ] Redis health check passing
- [ ] Liveness probe working: `/health/live`
- [ ] Readiness probe working: `/health/ready`

### Error Tracking

**Sentry** (if using):

- [ ] Sentry project created
- [ ] DSN added to backend `.env.production`
- [ ] DSN added to frontend `.env.production`
- [ ] Test error sent and received in Sentry dashboard
- [ ] Alert rules configured
- [ ] Team members invited

### Uptime Monitoring

- [ ] Uptime monitor configured (UptimeRobot, Pingdom, etc.)
- [ ] Monitor endpoint: `https://api.fleetpass.example.com/health`
- [ ] Alert contacts configured
- [ ] SMS/email alerts enabled
- [ ] Status page created (optional)

### Logging

- [ ] Application logs accessible: `docker-compose -f docker-compose.prod.yml logs -f`
- [ ] Log levels appropriate (info in production)
- [ ] No sensitive data in logs (passwords, tokens, etc.)
- [ ] Log rotation configured
- [ ] Centralized logging configured (optional: Logtail, Papertrail)

### Metrics (Optional)

- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Key metrics tracked:
  - Request rate
  - Error rate
  - Response time (p50, p95, p99)
  - Database connections
  - Redis hit rate
  - Memory usage
  - CPU usage

---

## Testing in Production

### Smoke Tests

- [ ] Frontend loads: `curl https://fleetpass.example.com`
- [ ] API responds: `curl https://api.fleetpass.example.com/health`
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS working (frontend can call backend)
- [ ] Rate limiting active (test with rapid requests)

### Functional Tests

**Authentication**:

- [ ] User registration works
- [ ] User login works
- [ ] JWT token issued
- [ ] Protected routes require authentication
- [ ] Logout works

**Core Features**:

- [ ] Create vehicle (if seeded or manually created)
- [ ] List vehicles
- [ ] Create customer
- [ ] Create booking
- [ ] Payment flow (Stripe test mode first)
- [ ] KYC verification (Persona test mode first)

**Error Handling**:

- [ ] 404 pages render correctly
- [ ] API errors return proper JSON format
- [ ] Frontend handles API errors gracefully
- [ ] Rate limiting returns 429 Too Many Requests

### Performance Tests

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms for simple queries
- [ ] Database query performance acceptable
- [ ] No memory leaks (monitor over 24 hours)
- [ ] Static assets cached properly

### Security Tests

- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection working
- [ ] Security headers present:
  - Strict-Transport-Security
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
- [ ] Rate limiting prevents brute force
- [ ] Passwords never exposed in responses
- [ ] Admin routes require authentication

---

## Go-Live

### Pre-Launch

- [ ] All checklist items above completed
- [ ] Final backup created
- [ ] Rollback plan documented and understood
- [ ] Team notified of go-live schedule
- [ ] Support team on standby

### Launch

- [ ] DNS cutover (if migrating from another system)
- [ ] Monitor error rates closely (first 15 minutes)
- [ ] Verify traffic is being served
- [ ] Check logs for errors
- [ ] Test critical user flows
- [ ] Monitor resource usage (CPU, memory, disk)

### Immediate Post-Launch (First Hour)

- [ ] Error rate < 1%
- [ ] Response times within acceptable range
- [ ] No 500 errors in logs
- [ ] Database connections stable
- [ ] Redis hit rate > 80% (after cache warm-up)
- [ ] No customer-reported issues

---

## Post-Deployment

### First 24 Hours

- [ ] Monitor error tracking dashboard
- [ ] Review application logs
- [ ] Check database performance
- [ ] Verify backups running
- [ ] Monitor uptime percentage
- [ ] Respond to any user feedback

### First Week

- [ ] Daily log reviews
- [ ] Backup verification (test restore)
- [ ] Performance baseline established
- [ ] User feedback collected and addressed
- [ ] Minor issues documented
- [ ] Team retrospective scheduled

### Ongoing

- [ ] Weekly log reviews
- [ ] Monthly security updates
- [ ] Quarterly dependency updates
- [ ] Quarterly backup restore tests
- [ ] Bi-annual penetration testing
- [ ] Annual security audit

### Documentation

- [ ] Runbook created for common operations
- [ ] Incident response procedures documented
- [ ] Deployment history maintained
- [ ] Known issues documented
- [ ] FAQs created based on user questions

---

## Rollback Plan

If critical issues occur post-deployment:

### Immediate Actions

1. **Stop traffic** (disable in load balancer or nginx)
2. **Preserve logs**: `docker-compose -f docker-compose.prod.yml logs > incident_logs.txt`
3. **Notify team** via established communication channel
4. **Assess severity**:
   - P0 (Critical): Data loss, security breach → Immediate rollback
   - P1 (High): Major feature broken → Rollback within 30 mins
   - P2 (Medium): Minor feature broken → Fix forward or rollback
   - P3 (Low): Cosmetic issues → Fix forward

### Rollback Procedure

```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Checkout previous version
git checkout tags/v0.9.0  # Previous stable version

# 3. Restore database backup
./scripts/restore-database.sh backups/fleetpass_YYYYMMDD.sql.gz

# 4. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Verify rollback
curl https://api.fleetpass.example.com/health

# 6. Notify users
# Send notification about temporary issues (if needed)
```

### Post-Rollback

- [ ] Document incident timeline
- [ ] Identify root cause
- [ ] Create fix plan
- [ ] Schedule re-deployment

---

## Sign-Off

### Deployment Team

- [ ] **DevOps Engineer**: Infrastructure ready
- [ ] **Backend Developer**: Backend application ready
- [ ] **Frontend Developer**: Frontend application ready
- [ ] **Security Engineer**: Security measures in place
- [ ] **QA Engineer**: Testing completed successfully
- [ ] **Product Manager**: Features ready for production

### Final Approval

- [ ] **CTO/Engineering Manager**: Approved for production deployment

**Deployment Date**: _______________

**Approved By**: _______________

---

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [SECURITY.md](./SECURITY.md) - Security best practices
- [README.md](./README.md) - Application overview
- [GitHub Repository](https://github.com/your-org/fleetpass)

---

**Checklist Version**: 1.0.0
**Last Updated**: 2024-12-18
**FleetPass Version**: 1.0.0
