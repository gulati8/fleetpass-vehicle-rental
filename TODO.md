# FleetPass - TODO

## ✅ Completed Features

**Backend + Frontend:**
- User authentication (signup, login, JWT + refresh tokens)
- Organization management (multi-tenant)
- Vehicle Management (CRUD with image upload)
- Customer Management (CRUD)
- KYC verification (Mock Persona with wizard UI)

**Backend Only (APIs exist, no UI yet):**
- Booking System
- Payment System (Mock Stripe)
- Lead Management
- Deal Management
- Location Management
- Vehicle Search & Filtering

---

## 🚧 Frontend UI Needed

These have full backend APIs but need UI:

- [ ] Booking management pages (list, create, detail)
- [ ] Payment UI (integrate with booking workflow)
- [ ] Lead management pages (list, create, detail, assignment)
- [ ] Deal management pages (list, create, detail, pipeline)
- [ ] Location management pages (list, create, edit)
- [ ] Vehicle search/filter UI

---

## 🐛 Code TODOs

From inline comments in the codebase:

1. **Error tracking** (`frontend/lib/error-logging.ts:30`)
   - Integrate with Sentry, LogRocket, or similar

2. **Error boundary** (`frontend/components/error/ErrorBoundary.tsx:34`)
   - Send errors to tracking service in production

3. **Toast notifications** (`frontend/lib/hooks/api/use-api-error.ts:33`)
   - Replace console.error with toast library

4. **Booking navigation** (`frontend/components/features/customers/KYCWizard.tsx:220`)
   - Navigate to booking page after KYC (needs booking UI first)

---

**Last Updated:** 2025-12-23
