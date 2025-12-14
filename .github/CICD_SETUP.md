# CI/CD Setup Guide

This project uses GitHub Actions for continuous integration and continuous deployment.

## 📋 Workflows

### 1. CI Pipeline (`ci.yml`)
**Triggers:** On push and pull request to `main` and `develop` branches

**Backend CI:**
- Installs dependencies
- Generates Prisma client
- Runs ESLint
- Type checks with TypeScript
- Builds the application
- Runs database migrations on test database

**Frontend CI:**
- Installs dependencies
- Runs ESLint
- Type checks with TypeScript
- Builds Next.js application

### 2. Backend Deployment (`deploy-backend.yml`)
**Triggers:** On push to `main` branch (backend changes only)

**Steps:**
1. Deploys to Railway (or Render)
2. Runs database migrations on production database
3. Health check to verify deployment

### 3. Frontend Deployment (`deploy-frontend.yml`)
**Triggers:** On push to `main` branch (frontend changes only)

**Steps:**
1. Builds Next.js application
2. Deploys to Vercel production
3. Health check to verify deployment

### 4. PR Preview (`pr-preview.yml`)
**Triggers:** On pull request creation/update

**Steps:**
1. Builds Next.js application
2. Deploys preview to Vercel
3. Comments on PR with preview URL

## 🔧 Required Secrets

Configure these secrets in your GitHub repository settings:
**Settings → Secrets and variables → Actions → New repository secret**

### For Railway Deployment (Backend)

```bash
RAILWAY_TOKEN          # Railway CLI token
DATABASE_URL           # Production database connection string
BACKEND_URL           # Production backend URL (e.g., https://api.fleetpass.com)
```

**How to get Railway token:**
```bash
railway login
railway token
```

### For Vercel Deployment (Frontend)

```bash
VERCEL_TOKEN                # Vercel authentication token
VERCEL_ORG_ID              # Vercel organization ID
VERCEL_PROJECT_ID          # Vercel project ID
NEXT_PUBLIC_API_URL        # Backend API URL
FRONTEND_URL               # Frontend URL (e.g., https://fleetpass.com)
```

**How to get Vercel credentials:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (run in frontend directory)
cd frontend
vercel link

# Get credentials from .vercel/project.json
cat .vercel/project.json
```

### Alternative: Render Deployment (Backend)

If using Render instead of Railway:

```bash
RENDER_DEPLOY_HOOK_URL  # Render deploy hook URL
```

Get this from: **Render Dashboard → Your Service → Settings → Deploy Hook**

## 🚀 Setup Instructions

### Step 1: Configure Railway (Backend)

1. **Create Railway Project:**
   ```bash
   railway login
   cd backend
   railway init
   ```

2. **Add PostgreSQL:**
   ```bash
   railway add postgresql
   ```

3. **Set Environment Variables in Railway:**
   - `DATABASE_URL` (auto-set by Railway)
   - `JWT_SECRET`
   - `PORT=3001`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-url.vercel.app`

4. **Get Railway Token:**
   ```bash
   railway token
   ```

5. **Add to GitHub Secrets:**
   - `RAILWAY_TOKEN` = (token from above)
   - `DATABASE_URL` = (from Railway dashboard)
   - `BACKEND_URL` = (your Railway app URL)

### Step 2: Configure Vercel (Frontend)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Link Project:**
   ```bash
   cd frontend
   vercel link
   ```

3. **Get Project Info:**
   ```bash
   cat .vercel/project.json
   ```

4. **Add to GitHub Secrets:**
   - `VERCEL_TOKEN` = (from `vercel token`)
   - `VERCEL_ORG_ID` = (from project.json)
   - `VERCEL_PROJECT_ID` = (from project.json)
   - `NEXT_PUBLIC_API_URL` = (your Railway backend URL + /api/v1)
   - `FRONTEND_URL` = (your Vercel deployment URL)

5. **Configure Vercel Environment Variables:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend.railway.app/api/v1`

### Step 3: Test Workflows

1. **Test CI Pipeline:**
   ```bash
   git checkout -b test-ci
   # Make a small change
   git add .
   git commit -m "test: CI pipeline"
   git push origin test-ci
   ```
   - Create a pull request
   - CI should run automatically
   - Check Actions tab in GitHub

2. **Test Deployment:**
   ```bash
   git checkout main
   git merge test-ci
   git push origin main
   ```
   - Backend and frontend deployments should trigger
   - Check Actions tab for progress

## 📊 Monitoring Deployments

### View Workflow Status

1. Go to your GitHub repository
2. Click "Actions" tab
3. See all workflow runs and their status

### View Deployment Logs

**Railway:**
- Railway Dashboard → Your Service → Deployments → View Logs

**Vercel:**
- Vercel Dashboard → Your Project → Deployments → View Function Logs

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Create Branch  │
                    │  Make Changes   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Push to GitHub │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Open PR        │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
       ┌────────────────┐        ┌───────────────┐
       │  CI Pipeline   │        │ PR Preview    │
       │  - Lint        │        │  Deploy       │
       │  - Type Check  │        └───────────────┘
       │  - Build       │
       │  - Tests       │
       └────────┬───────┘
                │
                ▼
       ┌────────────────┐
       │  Review & Merge│
       │  to main       │
       └────────┬───────┘
                │
                ▼
       ┌────────────────────────┐
       │  Production Deploy     │
       │  1. Backend → Railway  │
       │  2. Run Migrations     │
       │  3. Frontend → Vercel  │
       │  4. Health Checks      │
       └────────────────────────┘
                │
                ▼
       ┌────────────────┐
       │  ✅ Live in    │
       │  Production!   │
       └────────────────┘
```

## 🐛 Troubleshooting

### CI Failures

**Linting errors:**
```bash
cd backend  # or frontend
npm run lint -- --fix
```

**Type errors:**
```bash
npx tsc --noEmit
# Fix reported errors
```

**Build errors:**
```bash
npm run build
# Check error messages and fix
```

### Deployment Failures

**Railway deployment fails:**
- Check Railway logs
- Verify environment variables are set
- Ensure `DATABASE_URL` is correct

**Vercel deployment fails:**
- Check build logs in Vercel dashboard
- Verify `NEXT_PUBLIC_API_URL` is set
- Check for TypeScript errors

**Migration fails:**
- Verify `DATABASE_URL` secret is correct
- Check Prisma schema for errors
- Manually run: `npx prisma migrate deploy`

## 📝 Best Practices

1. **Always create feature branches:**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Wait for CI before merging:**
   - All checks must pass before merging to main

3. **Review deployment logs:**
   - Check Railway/Vercel logs after each deployment

4. **Use PR previews:**
   - Test changes in preview environment before merging

5. **Keep secrets secure:**
   - Never commit secrets to the repository
   - Rotate tokens periodically

## 🔐 Security Notes

- All secrets are encrypted in GitHub
- Workflows only have access to secrets they need
- Railway/Vercel tokens have limited scopes
- Database URLs use SSL/TLS encryption

## 🎉 Success Indicators

Your CI/CD is working correctly when:
- ✅ CI runs automatically on every PR
- ✅ All checks pass (green checkmarks)
- ✅ PR preview deploys successfully
- ✅ Merging to main triggers production deployment
- ✅ Backend and frontend are live and healthy

---

**Need help?** Check the workflow files in `.github/workflows/` or GitHub Actions documentation.
