# FleetPass Security Guide

Comprehensive security documentation for FleetPass deployment and operations.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Infrastructure Security](#infrastructure-security)
- [Secrets Management](#secrets-management)
- [Compliance](#compliance)
- [Incident Response](#incident-response)
- [Security Monitoring](#security-monitoring)

---

## Security Architecture

### Defense in Depth

FleetPass implements multiple layers of security:

```
┌─────────────────────────────────────────────┐
│ Layer 1: Network Security                  │
│ - Firewall (UFW/iptables)                  │
│ - DDoS protection (Cloudflare)             │
│ - SSL/TLS encryption                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Application Security              │
│ - Rate limiting                             │
│ - CORS policies                             │
│ - Security headers                          │
│ - Input validation                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 3: Authentication                     │
│ - JWT tokens                                │
│ - Password hashing (bcrypt)                 │
│ - Session management                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 4: Authorization                      │
│ - Role-based access control                 │
│ - Resource ownership validation             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Layer 5: Data Security                      │
│ - Encryption at rest                        │
│ - Encrypted backups                         │
│ - Secure data deletion                      │
└─────────────────────────────────────────────┘
```

### Security Principles

1. **Least Privilege**: Users and services have minimum required permissions
2. **Zero Trust**: Verify every request, never assume trust
3. **Defense in Depth**: Multiple security layers
4. **Fail Secure**: System defaults to secure state on failure
5. **Audit Everything**: Comprehensive logging and monitoring

---

## Authentication & Authorization

### JWT Token Security

**Token Configuration**:
```bash
# Strong secret (64 bytes minimum)
JWT_SECRET=$(openssl rand -base64 64)

# Short expiration for production (balance security vs. UX)
JWT_EXPIRES_IN=7d  # Adjust based on risk assessment
```

**Token Security Features**:
- Signed with HS256 algorithm
- Contains user ID and role only (minimal claims)
- Stateless (validated without database lookup)
- Short expiration time
- Stored in HttpOnly cookies (prevents XSS)

### Password Security

**Requirements** (enforced by validation):
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Hashing**:
- Algorithm: bcrypt
- Salt rounds: 10 (configurable)
- Automatic salt generation

**Best Practices**:
```typescript
// Never log passwords
logger.log('User login', { email }); // ✅ Good
logger.log('User login', { email, password }); // ❌ Bad

// Never return password hashes in API responses
// Prisma exclude middleware handles this automatically
```

### Session Management

**Features**:
- Redis-backed sessions
- Automatic expiration
- Session invalidation on logout
- Concurrent session detection (optional)

**Security Measures**:
- Session tokens stored in Redis only
- No sensitive data in session storage
- Session rotation on privilege escalation

---

## Data Protection

### Encryption at Rest

**Database**:
```bash
# PostgreSQL encryption (if using managed service)
# AWS RDS: Enable encryption when creating instance
# Self-hosted: Use LUKS disk encryption

# Encrypt PostgreSQL data directory
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup open /dev/sdb postgres_encrypted
```

**Backups**:
```bash
# Encrypted backups using GPG
pg_dump -U user database | \
  gzip | \
  gpg --symmetric --cipher-algo AES256 \
  > backup_$(date +%Y%m%d).sql.gz.gpg

# Decrypt backup
gpg --decrypt backup_YYYYMMDD.sql.gz.gpg | \
  gunzip | \
  psql -U user database
```

### Encryption in Transit

**TLS Configuration**:
```nginx
# Strong TLS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
```

**Certificate Management**:
- Use Let's Encrypt for free certificates
- Auto-renewal configured
- Monitor expiration (30-day warning)

### Personal Data (GDPR Compliance)

**Data Collection**:
- Collect only necessary data
- Explicit consent for marketing
- Clear privacy policy

**Data Access**:
- Users can request their data
- Export in machine-readable format (JSON)

**Data Deletion**:
- "Right to be forgotten" implementation
- Soft delete with configurable retention
- Hard delete after retention period

---

## API Security

### Rate Limiting

**Configuration**:
```typescript
// Three-tier rate limiting
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,      // 1 second
    limit: 3,       // 3 requests
  },
  {
    name: 'medium',
    ttl: 10000,     // 10 seconds
    limit: 20,      // 20 requests
  },
  {
    name: 'long',
    ttl: 60000,     // 1 minute
    limit: 100,     // 100 requests
  },
]);
```

**Bypass for Health Checks**:
```nginx
# In Nginx config
location /health {
  proxy_pass http://backend;
  access_log off;
  # No rate limiting on health checks
}
```

### CORS Policy

**Production Configuration**:
```typescript
// Only allow your frontend domain
FRONTEND_URL=https://fleetpass.example.com

// Backend automatically configures CORS:
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

**Security Headers**:
```nginx
# Nginx security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

### Input Validation

**Server-side Validation**:
- All inputs validated using class-validator
- DTOs define allowed fields and types
- Automatic sanitization of string inputs

**Example**:
```typescript
// Email validation
@IsEmail()
@IsNotEmpty()
email: string;

// Strong password validation
@IsString()
@MinLength(8)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
password: string;
```

### SQL Injection Prevention

**Prisma ORM**:
- Parameterized queries automatically
- No raw SQL unless explicitly needed
- Input sanitization

**Example**:
```typescript
// ✅ Safe (parameterized)
await prisma.user.findUnique({
  where: { email: userInput },
});

// ⚠️ Use with caution (raw query)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;
```

### XSS Prevention

**Backend**:
- Content-Type headers set correctly
- No user input in HTML responses
- JSON-only API responses

**Frontend**:
- React automatic XSS protection
- No dangerouslySetInnerHTML usage
- Sanitize user content before rendering

---

## Infrastructure Security

### Docker Security

**Best Practices**:
```dockerfile
# ✅ Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# ✅ Use specific image versions
FROM node:20-alpine

# ✅ Minimize attack surface
RUN apk add --no-cache openssl
```

**Container Hardening**:
```yaml
# docker-compose.prod.yml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
```

### Network Security

**Firewall Configuration**:
```bash
# Ubuntu UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH (consider changing default port)
sudo ufw allow 80/tcp   # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp  # HTTPS

# Enable firewall
sudo ufw enable
```

**Internal Network Isolation**:
- Database accessible only from backend container
- Redis accessible only from backend container
- No direct external access to data stores

### SSH Security

**Hardening**:
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

**Fail2ban**:
```bash
# Install Fail2ban
sudo apt install fail2ban

# Configure
sudo nano /etc/fail2ban/jail.local

# Add:
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

### Server Hardening

**Automatic Security Updates**:
```bash
# Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

**Disable Unnecessary Services**:
```bash
# List running services
systemctl list-units --type=service --state=running

# Disable unnecessary services
sudo systemctl disable <service-name>
```

---

## Secrets Management

### Environment Variables

**File Permissions**:
```bash
# Restrict access to .env files
chmod 600 backend/.env.production
chmod 600 frontend/.env.production

# Only owner can read/write
-rw------- 1 user user .env.production
```

**Never Commit Secrets**:
```gitignore
# .gitignore
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
```

### Secret Rotation

**Rotation Schedule**:
- JWT_SECRET: Annually or after security incident
- Database passwords: Annually
- Redis password: Annually
- API keys: As per provider recommendations

**Rotation Procedure**:
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# 2. Update configuration
echo "JWT_SECRET=$NEW_SECRET" >> backend/.env.production

# 3. Graceful restart
docker-compose -f docker-compose.prod.yml restart backend

# 4. Monitor for issues
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Third-Party API Keys

**Stripe**:
- Use test keys in development
- Restrict live keys to production servers only
- Enable webhook signature verification

**Persona**:
- Use sandbox environment for testing
- Restrict production API key to production servers
- Monitor API usage for anomalies

---

## Compliance

### GDPR Compliance

**Data Protection Officer**:
- Designate DPO contact
- Document data processing activities
- Maintain records of processing

**User Rights**:
1. **Right to Access**: Provide user data export
2. **Right to Rectification**: Allow data updates
3. **Right to Erasure**: Implement account deletion
4. **Right to Portability**: Provide machine-readable exports
5. **Right to Object**: Allow opt-out of marketing

**Implementation**:
```typescript
// User data export endpoint
@Get('me/export')
async exportData(@GetUser() user: User) {
  return {
    profile: user,
    bookings: await this.bookingService.findByCustomer(user.id),
    // ... other data
  };
}

// Account deletion endpoint
@Delete('me')
async deleteAccount(@GetUser() user: User) {
  await this.userService.softDelete(user.id);
  // Schedule hard delete after retention period
}
```

### PCI DSS Compliance (Payment Data)

**Stripe Integration**:
- Never store card numbers
- Use Stripe.js for tokenization
- Payment data goes directly to Stripe
- Use Stripe webhooks for payment confirmation

**Implementation**:
```typescript
// ✅ Correct: Token-based payment
async createPayment(token: string, amount: number) {
  return this.stripe.charges.create({
    amount,
    currency: 'usd',
    source: token, // Token from Stripe.js
  });
}

// ❌ Wrong: Never do this
// cardNumber: string  // Never handle raw card data
```

---

## Incident Response

### Security Incident Response Plan

**Preparation**:
1. Incident response team identified
2. Contact information documented
3. Escalation procedures defined
4. Communication templates prepared

**Detection**:
- Monitor security logs
- Set up alerts for anomalies
- Review access logs regularly

**Containment**:
```bash
# Immediate actions for suspected breach:

# 1. Isolate affected systems
docker-compose -f docker-compose.prod.yml stop backend

# 2. Preserve evidence
docker-compose -f docker-compose.prod.yml logs backend > incident_logs_$(date +%s).txt

# 3. Change credentials
# Rotate all secrets immediately

# 4. Notify stakeholders
# Follow communication plan
```

**Recovery**:
1. Identify root cause
2. Patch vulnerabilities
3. Restore from clean backups
4. Verify system integrity
5. Resume operations

**Post-Incident**:
1. Document incident timeline
2. Conduct post-mortem
3. Update security measures
4. Train team on lessons learned

### Data Breach Response

**Obligations** (varies by jurisdiction):
- Notify authorities within 72 hours (GDPR)
- Notify affected users
- Document breach details
- Report remediation steps

**Breach Notification Template**:
```
Subject: Important Security Notice

Dear [User],

We are writing to inform you of a security incident that may have affected your account.

What Happened:
[Brief description]

What Information Was Involved:
[Specific data types]

What We Are Doing:
[Remediation steps]

What You Can Do:
[User actions]

Contact:
security@fleetpass.example.com

Sincerely,
FleetPass Security Team
```

---

## Security Monitoring

### Logging

**What to Log**:
- Authentication attempts (success and failure)
- Authorization failures
- API errors (4xx, 5xx)
- Database queries (in development)
- Security events (password changes, etc.)

**What NOT to Log**:
- Passwords (plain or hashed)
- Credit card numbers
- API keys or secrets
- Personal identification numbers

**Log Levels**:
```
Production: INFO and above
Staging: DEBUG and above
Development: ALL
```

### Monitoring Tools

**Recommended Stack**:
1. **Error Tracking**: Sentry
   - Real-time error alerts
   - Stack traces
   - User context

2. **Uptime Monitoring**: UptimeRobot
   - Health check monitoring
   - Downtime alerts
   - Public status page

3. **Log Aggregation**: Logtail / Papertrail
   - Centralized logs
   - Search and filter
   - Alerts on patterns

4. **Metrics**: Prometheus + Grafana
   - Custom metrics
   - Visualization
   - Alerting rules

### Security Audits

**Regular Audits**:
- Monthly: Review access logs
- Quarterly: Dependency vulnerability scan
- Bi-annually: Penetration testing
- Annually: Full security audit

**Dependency Scanning**:
```bash
# Backend
cd backend
npm audit

# Fix critical vulnerabilities
npm audit fix

# Frontend
cd frontend
npm audit
npm audit fix
```

**Docker Image Scanning**:
```bash
# Scan images for vulnerabilities
docker scan fleetpass-backend:latest
docker scan fleetpass-frontend:latest
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets are randomly generated (not defaults)
- [ ] `.env` files have 600 permissions
- [ ] No secrets in version control
- [ ] Database password is strong (32+ chars)
- [ ] JWT secret is strong (64+ bytes)
- [ ] Redis password is set
- [ ] CORS restricted to frontend domain only
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### Post-Deployment

- [ ] SSL/TLS certificates valid
- [ ] Firewall configured correctly
- [ ] SSH hardened (key-based only)
- [ ] Fail2ban installed and active
- [ ] Automatic security updates enabled
- [ ] Backups tested and encrypted
- [ ] Monitoring and alerts configured
- [ ] Incident response plan documented
- [ ] Security contact established
- [ ] Privacy policy published
- [ ] Terms of service published

### Ongoing

- [ ] Review logs weekly
- [ ] Scan dependencies monthly
- [ ] Test backups quarterly
- [ ] Rotate secrets annually
- [ ] Conduct security training annually
- [ ] Perform penetration tests bi-annually
- [ ] Update security documentation

---

## Contact

**Security Issues**: security@fleetpass.example.com

**Responsible Disclosure**:
We appreciate responsible disclosure of security vulnerabilities. Please report any security issues to security@fleetpass.example.com rather than creating public GitHub issues.

---

**Security Guide Version**: 1.0.0
**Last Updated**: 2024-12-18
