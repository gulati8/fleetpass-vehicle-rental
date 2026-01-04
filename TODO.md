# FleetPass - Development Tracker

**Last Updated:** 2025-12-31
**Status:** Active Development

---

## 📊 Project Status Overview

### ✅ Core Features - COMPLETE

**Authentication & Multi-Tenancy**
- ✅ User signup/login with JWT + refresh tokens
- ✅ Cookie-based refresh token flow
- ✅ Route protection and auth guards
- ✅ Organization-based multi-tenancy

**Vehicle Management**
- ✅ Vehicle CRUD operations (list, create, edit, delete, detail)
- ✅ Image upload support (multiple images per vehicle)
- ✅ Backend API with full CRUD endpoints

**Customer Management**
- ✅ Customer CRUD operations (list, create, edit, delete, detail)
- ✅ KYC verification flow (Mock Persona integration)
- ✅ KYC wizard UI with step-by-step verification

**Booking Management**
- ✅ Booking CRUD operations (list, create, detail)
- ✅ BookingWizard orchestrator with 4-step flow:
  - Step 1: Booking details (vehicle, dates, location)
  - Step 2: Review booking with pricing
  - Step 3: Payment processing (Mock Stripe)
  - Step 4: Confirmation with booking summary
- ✅ Payment decline handling and retry flow
- ✅ Status management (pending, confirmed, active, completed, cancelled)
- ✅ Location relations (pickup/dropoff)
- ✅ Navigate to booking after KYC completion

**Payment System**
- ✅ Mock Stripe integration
- ✅ Payment processing in booking wizard
- ✅ Payment decline support with retry
- ✅ Backend payment APIs (create, retrieve, update)

**Lead Management**
- ✅ Lead CRUD operations (list, create, edit, delete, detail)
- ✅ Lead assignment to sales team members
- ✅ Lead conversion to deals
- ✅ Lead status management (new, contacted, qualified, converted, lost)
- ✅ Lead filtering (status, source, assignment)
- ✅ Lead search (name, email, phone)
- ✅ Grid/list view toggle
- ✅ Backend API with full CRUD + assignment + conversion endpoints

**Quality Assurance**
- ✅ Toast notifications for user feedback
- ✅ Comprehensive E2E tests (Playwright):
  - Authentication tests (13/13 passing)
  - Vehicle management tests (13/13 passing)
  - Customer management tests (20/20 passing)
  - Booking and payment wizard tests (9/9 passing)
  - Lead management tests (35/35 passing)

---

## 🚧 High Priority - Frontend UI Needed

These features have **complete backend APIs** but need **frontend UI implementation**.

### 1. Lead Management UI
**Backend Status:** ✅ Complete
**Frontend Status:** ✅ Complete (2025-12-31)
**Priority:** ~~HIGH~~ COMPLETED
**Complexity:** Medium

**Available Backend APIs:**
- `GET /api/v1/leads` - List leads with filtering (status, assignedTo, source)
- `POST /api/v1/leads` - Create new lead
- `GET /api/v1/leads/:id` - Get lead details
- `PATCH /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead
- `POST /api/v1/leads/:id/assign` - Assign lead to user
- `POST /api/v1/leads/:id/convert` - Convert lead to deal

**Database Schema:**
```typescript
Lead {
  id: string
  organizationId: string
  customerId?: string           // Link to existing customer
  customerEmail?: string        // Or email if not yet a customer
  customerName?: string
  customerPhone?: string
  source?: string               // 'website', 'phone', 'walk_in'
  vehicleInterestId?: string    // Reference to Vehicle
  status: string                // 'new', 'contacted', 'qualified', 'converted', 'lost'
  assignedToId?: string         // Assigned sales agent
  notes?: string
  createdById?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Required Frontend Pages:**
- [ ] `/leads` - Lead list page with filtering by status/assignment/source
- [ ] `/leads/new` - Create new lead form
- [ ] `/leads/[id]` - Lead detail page
- [ ] `/leads/[id]/edit` - Edit lead form

**Required Components:**
- [ ] `LeadList` - Table/grid with status badges, assignment info
- [ ] `LeadForm` - Form for creating/editing leads
- [ ] `LeadDetail` - Detail view with timeline, notes, assignment
- [ ] `LeadAssignModal` - Modal to assign lead to user
- [ ] `LeadConvertModal` - Modal to convert lead to deal
- [ ] `LeadStatusBadge` - Status indicator component
- [ ] `LeadFilters` - Filter sidebar/dropdown

**API Hooks Needed:**
- [ ] `useLeads()` - List leads with query params
- [ ] `useLead(id)` - Get single lead
- [ ] `useCreateLead()` - Create lead mutation
- [ ] `useUpdateLead()` - Update lead mutation
- [ ] `useDeleteLead()` - Delete lead mutation
- [ ] `useAssignLead()` - Assign lead mutation
- [ ] `useConvertLead()` - Convert lead mutation

**Type Definitions:**
- [ ] Create shared types in `shared/types/lead.types.ts`
- [ ] Add DTOs in frontend: `CreateLeadDto`, `UpdateLeadDto`, `AssignLeadDto`, `ConvertLeadDto`

---

### 2. Deal Management UI
**Backend Status:** ✅ Complete
**Frontend Status:** ❌ Not Started
**Priority:** HIGH
**Estimated Complexity:** Medium

**Available Backend APIs:**
- `GET /api/v1/deals` - List deals with filtering (status, customerId)
- `POST /api/v1/deals` - Create new deal
- `GET /api/v1/deals/:id` - Get deal details
- `PATCH /api/v1/deals/:id` - Update deal
- `DELETE /api/v1/deals/:id` - Delete deal
- `POST /api/v1/deals/:id/win` - Mark deal as won
- `POST /api/v1/deals/:id/lose` - Mark deal as lost

**Database Schema:**
```typescript
Deal {
  id: string
  organizationId: string
  leadId?: string              // Optional link to originating lead
  customerId: string           // Required - customer who made the deal
  vehicleId: string            // Reference to Vehicle
  dealValueCents: number       // Value in cents
  status: string               // 'pending', 'closed_won', 'closed_lost'
  closedAt?: DateTime
  closedById?: string          // User who closed the deal
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Required Frontend Pages:**
- [ ] `/deals` - Deal list/pipeline view with status columns
- [ ] `/deals/new` - Create new deal form
- [ ] `/deals/[id]` - Deal detail page
- [ ] `/deals/[id]/edit` - Edit deal form

**Required Components:**
- [ ] `DealPipeline` - Kanban/pipeline view with drag-and-drop
- [ ] `DealList` - Table view of deals
- [ ] `DealForm` - Form for creating/editing deals
- [ ] `DealDetail` - Detail view with customer/vehicle info, timeline
- [ ] `DealStatusBadge` - Status indicator component
- [ ] `DealValueDisplay` - Formatted currency display
- [ ] `DealFilters` - Filter by status, customer, date range

**API Hooks Needed:**
- [ ] `useDeals()` - List deals with query params
- [ ] `useDeal(id)` - Get single deal
- [ ] `useCreateDeal()` - Create deal mutation
- [ ] `useUpdateDeal()` - Update deal mutation
- [ ] `useDeleteDeal()` - Delete deal mutation
- [ ] `useWinDeal()` - Mark deal as won mutation
- [ ] `useLoseDeal()` - Mark deal as lost mutation

**Type Definitions:**
- [ ] Create shared types in `shared/types/deal.types.ts`
- [ ] Add DTOs in frontend: `CreateDealDto`, `UpdateDealDto`

---

### 3. Location Management UI
**Backend Status:** ✅ Complete
**Frontend Status:** ❌ Not Started
**Priority:** MEDIUM
**Estimated Complexity:** Low

**Available Backend APIs:**
- `GET /api/v1/locations` - List locations with search
- `POST /api/v1/locations` - Create new location
- `GET /api/v1/locations/:id` - Get location details
- `PATCH /api/v1/locations/:id` - Update location
- `DELETE /api/v1/locations/:id` - Delete location

**Database Schema:**
```typescript
Location {
  id: string
  organizationId: string
  name: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  postalCode: string
  country: string              // Default: 'US'
  latitude?: number
  longitude?: number
  phone?: string
  hoursOfOperation?: Json      // {monday: {open: "09:00", close: "18:00"}, ...}
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Required Frontend Pages:**
- [ ] `/locations` - Location list page
- [ ] `/locations/new` - Create new location form
- [ ] `/locations/[id]` - Location detail page
- [ ] `/locations/[id]/edit` - Edit location form

**Required Components:**
- [ ] `LocationList` - Table/grid of locations with address info
- [ ] `LocationForm` - Form for creating/editing locations with address fields
- [ ] `LocationDetail` - Detail view with map integration (optional)
- [ ] `HoursOfOperationEditor` - Component to edit business hours
- [ ] `AddressInput` - Reusable address input component group

**API Hooks Needed:**
- [ ] `useLocations()` - List locations with query params
- [ ] `useLocation(id)` - Get single location
- [ ] `useCreateLocation()` - Create location mutation
- [ ] `useUpdateLocation()` - Update location mutation
- [ ] `useDeleteLocation()` - Delete location mutation

**Type Definitions:**
- [ ] Create shared types in `shared/types/location.types.ts`
- [ ] Add DTOs in frontend: `CreateLocationDto`, `UpdateLocationDto`

---

### 4. Vehicle Search & Filter UI
**Backend Status:** ✅ Complete
**Frontend Status:** ❌ Not Started
**Priority:** MEDIUM
**Estimated Complexity:** Medium

**Available Backend Features:**
- Vehicle search supports filtering by:
  - `make`, `model`, `year`
  - `bodyType`, `transmission`, `fuelType`
  - `minDailyRate`, `maxDailyRate`
  - `isAvailableForRent`
  - `locationId`
- Optimized indexes for fast queries

**Required Frontend Pages:**
- [ ] `/vehicles/search` - Advanced search page with filters
- [ ] Update `/vehicles` list page to include filter sidebar

**Required Components:**
- [ ] `VehicleSearchFilters` - Comprehensive filter panel
  - Make/Model dropdowns (populated from existing vehicles)
  - Year range slider
  - Body type checkboxes (sedan, suv, truck, etc.)
  - Transmission/Fuel type filters
  - Price range slider
  - Availability toggle
  - Location selector
- [ ] `VehicleSearchResults` - Grid/list view with filter results
- [ ] `VehicleSearchBar` - Quick search input
- [ ] Update `VehicleList` to support filtering

**API Updates:**
- [ ] Update `useVehicles()` hook to support all query parameters
- [ ] Add `useVehicleFilters()` hook to manage filter state

**Type Definitions:**
- [ ] Add `VehicleFilterParams` type in `shared/types/vehicle.types.ts`

---

## 🐛 Code Quality & Technical Debt

### Inline TODO Comments (from codebase)

#### 1. Error Tracking Integration
**Priority:** MEDIUM
**Files:**
- `frontend/lib/error-logging.ts:30`
- `frontend/components/error/ErrorBoundary.tsx:34`

**Current State:**
- Error logging utility exists but uses `console.error`
- ErrorBoundary catches errors but only logs locally

**Action Items:**
- [ ] Choose error tracking service (Sentry recommended, or LogRocket)
- [ ] Add Sentry SDK to frontend dependencies
- [ ] Configure Sentry initialization in `app/layout.tsx`
- [ ] Update `logError()` function to send to Sentry
- [ ] Update ErrorBoundary to send errors to Sentry in production
- [ ] Add Sentry environment configuration to `.env.local`
- [ ] Update documentation with error tracking setup

**Environment Variables Needed:**
```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

---

#### 2. Toast Notification TODO Comment (Cleanup)
**Priority:** LOW
**File:** `frontend/lib/hooks/api/use-api-error.ts:33`

**Current State:**
- TODO comment says "Replace with toast notification when UI library is chosen"
- Toast notifications have been implemented (commit: "feat: Add toast notifications...")

**Action Items:**
- [ ] Remove outdated TODO comment
- [ ] Verify toast is being called instead of console.error
- [ ] Update any remaining console.error calls to use toast

---

#### 3. Timezone Conversion Support
**Priority:** LOW
**File:** `frontend/components/features/bookings/wizard/steps/Step2ReviewBooking.tsx:127`

**Current State:**
- TODO comment about implementing timezone conversion when timezone parameter is provided
- Currently assumes all dates are in local timezone

**Action Items:**
- [ ] Decide if timezone support is needed (depends on business requirements)
- [ ] If needed, add timezone parameter to booking API
- [ ] Use `date-fns-tz` or `dayjs` with timezone plugin
- [ ] Display booking times in location's timezone
- [ ] Add timezone selector to booking form

**Deferred:** Not critical for current MVP, can be added later if multi-timezone support is needed.

---

#### 4. Backend Atomic Transactions for Booking + Payment
**Priority:** MEDIUM
**File:** `frontend/components/features/bookings/wizard/steps/Step3Payment.tsx:73`

**Current State:**
- Booking creation and payment processing are separate API calls
- If payment fails, booking exists in "pending" state
- Manual cleanup required

**Action Items:**
- [ ] Create backend endpoint: `POST /api/v1/bookings/with-payment`
- [ ] Implement database transaction to create booking + payment atomically
- [ ] If payment fails, rollback booking creation
- [ ] Update frontend to use new endpoint
- [ ] Add E2E test for atomic transaction behavior

**Implementation Notes:**
```typescript
// Backend pseudo-code
async createBookingWithPayment(dto, userId, orgId) {
  return this.prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({ ... });
    const payment = await this.paymentService.createPayment(booking, dto.paymentDetails);

    if (payment.status !== 'succeeded') {
      throw new Error('Payment failed');
      // Transaction will auto-rollback
    }

    return { booking, payment };
  });
}
```

---

#### 5. Backend Endpoint to Cancel Bookings When Payment Fails
**Priority:** MEDIUM
**File:** `frontend/components/features/bookings/wizard/steps/Step3Payment.tsx:74`

**Current State:**
- No automated cleanup when payment fails
- Failed bookings remain in database with "pending" status

**Action Items:**
- [ ] Create endpoint: `DELETE /api/v1/bookings/:id/cancel`
- [ ] Only allow cancel for "pending" status bookings
- [ ] Update wizard to call cancel endpoint if user abandons after payment failure
- [ ] Add automatic cleanup job (optional) to delete old pending bookings
- [ ] Update E2E tests to verify cleanup

**Alternative:** Implement #4 (atomic transactions) to avoid this problem entirely.

---

## 📝 Documentation Updates Needed

- [ ] Update API documentation in `docs/api/` to include:
  - Lead management endpoints
  - Deal management endpoints
  - Location management endpoints
- [ ] Create frontend component documentation for:
  - LeadManagement components
  - DealManagement components
  - LocationManagement components
- [ ] Add error tracking setup guide to `docs/`
- [ ] Update `README.md` with new features once implemented

---

## 🧪 Testing Requirements

### E2E Tests to Add (Once UI is Implemented)

**Lead Management:**
- [ ] Create lead with all fields
- [ ] List leads with filtering
- [ ] Assign lead to user
- [ ] Convert lead to deal
- [ ] Update lead status progression

**Deal Management:**
- [ ] Create deal from lead
- [ ] Create standalone deal
- [ ] Move deal through pipeline
- [ ] Mark deal as won
- [ ] Mark deal as lost
- [ ] Deal list with filtering

**Location Management:**
- [ ] Create location with required fields
- [ ] List locations
- [ ] Edit location details
- [ ] Delete location (verify cascade behavior)

---

## 🎯 Implementation Strategy

### Recommended Order of Implementation:

1. **Lead Management UI** (Highest Priority)
   - Most critical for sales workflow
   - Foundation for deal pipeline
   - Estimated: 2-3 days

2. **Deal Management UI** (High Priority)
   - Depends on lead management
   - Core revenue tracking feature
   - Estimated: 2-3 days

3. **Location Management UI** (Medium Priority)
   - Required for multi-location dealerships
   - Relatively straightforward CRUD
   - Estimated: 1-2 days

4. **Vehicle Search/Filter UI** (Medium Priority)
   - Enhances existing vehicle management
   - Improves user experience
   - Estimated: 1-2 days

5. **Error Tracking Integration** (Medium Priority)
   - Production readiness requirement
   - Quick to implement
   - Estimated: 0.5 days

6. **Backend Improvements** (Lower Priority)
   - Atomic transactions for booking+payment
   - Cleanup endpoints
   - Estimated: 1 day

---

## 🔄 Session Resume Context

**For Future Sessions:**
When resuming work, check this section to understand current state:

**Last Completed Work:**
- Booking wizard with payment integration ✅
- E2E tests for payment flow ✅
- Toast notifications ✅
- Route protection ✅

**Currently In Progress:**
- None (awaiting next task assignment)

**Next Recommended Task:**
- Start with Lead Management UI implementation
- Begin with basic CRUD pages, then add assignment/conversion features

**Quick Start Command:**
To resume work on the next priority item:
```bash
# 1. Review this file to see current state
# 2. Say: "Let's start implementing Lead Management UI"
# 3. I'll create the necessary pages, components, hooks, and types
```

---

## 📊 Progress Tracking

**Overall Completion:**
- ✅ Core Features: 100% (Auth, Vehicles, Customers, Bookings)
- 🚧 Extended Features: 0% (Leads, Deals, Locations, Advanced Search)
- 🚧 Code Quality: 60% (Tests ✅, Error Tracking ❌, Backend Improvements ❌)

**Total Outstanding Items:** 7 major features + 5 technical improvements

---

**Notes:**
- All backend APIs are production-ready with full authentication, validation, and error handling
- Frontend follows established patterns from existing pages (vehicles, customers, bookings)
- Reuse existing components: `PageHeader`, `Table`, `Button`, `Form`, `Card`, etc.
- All mutations should use React Query with optimistic updates
- Follow existing API client patterns with automatic idempotency keys
- E2E tests should be added after UI implementation (follow existing Playwright patterns)
