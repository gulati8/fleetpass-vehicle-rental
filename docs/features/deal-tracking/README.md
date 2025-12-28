# Deal Tracking

> **Status**: ✅ Production
> **Owner**: Sales Team / Dealership Management
> **Last Updated**: 2024-12-28

## Overview

Deal Tracking enables dealership managers and sales teams to manage their sales pipeline by tracking vehicle deals from opportunity through closure. The feature records deal value, status progression, and closure outcomes (won/lost), providing visibility into the sales process and supporting deal analytics and reporting.

## User Stories

### Primary Use Cases

**As a sales agent, I want to create a deal for a customer interested in a vehicle so that I can track the sales opportunity through to closure.**

- **As a dealership manager, I want to view all deals with filtering by status so that I can monitor the sales pipeline health.**
- **As a sales agent, I want to mark a deal as won when a customer completes their purchase so that the system records the successful closure.**
- **As a sales agent, I want to mark a deal as lost when a customer doesn't proceed so that pipeline data stays accurate.**

### Supported Workflows

1. **Create Deal**
   - Step 1: User navigates to deals section
   - Step 2: User enters customer, vehicle, and deal value information
   - Step 3: System creates deal in "pending" status
   - Step 4: Deal appears in pipeline and can be viewed/updated

2. **View Pipeline**
   - Step 1: Manager opens deals list with filter options
   - Step 2: System displays deals filtered by status, lead, or search criteria
   - Step 3: Manager can sort by creation date, closure date, or deal value
   - Step 4: Manager can drill down into individual deal details

3. **Update Deal**
   - Step 1: User selects a deal from the list
   - Step 2: User updates customer, vehicle, or notes
   - Step 3: System validates all referenced entities exist
   - Step 4: Changes are saved and displayed

4. **Close Deal (Won)**
   - Step 1: Sales agent clicks "Mark as Won" on a pending deal
   - Step 2: System records closure timestamp and agent who closed it
   - Step 3: Deal status changes to "closed_won"
   - Step 4: Deal appears in closed/won reporting views

5. **Close Deal (Lost)**
   - Step 1: Sales agent clicks "Mark as Lost" on a pending deal
   - Step 2: System records closure timestamp and agent who closed it
   - Step 3: Deal status changes to "closed_lost"
   - Step 4: Deal appears in closed/lost reporting views

## Business Rules

### Validations

- **Customer Required**: Every deal must reference an existing customer in the system
- **Vehicle Required**: Every deal must reference an existing vehicle in inventory
- **Deal Value Required**: Deal value must be a non-negative integer (stored in cents)
- **Lead Optional**: A deal can optionally reference a lead (for tracking lead-to-deal conversion)
- **Organization Scope**: Deals are isolated per organization; users only see their organization's deals

### Constraints

- **Status Immutability**: Once a deal is closed (won or lost), it cannot transition back to pending or to another closed status
- **Single Closure**: A deal can only be marked won or lost once; subsequent closure attempts are rejected
- **Creation by System**: The `closedById` field is automatically set to the authenticated user when creating a deal (for audit trail)
- **Closure Tracking**: When marking a deal as won/lost, the closure timestamp and closing agent are automatically recorded

### Permissions

- **Who can access**: All authenticated dealership staff with proper organization membership
- **Access level**: Users can create, read, update, and delete deals within their organization
- **Multi-tenant isolation**: Deals are filtered by `organizationId`; queries automatically exclude deals from other organizations

## User Interface

### Key Screens/Components

**Deals Pipeline Dashboard**
- **Location**: `/dealer/deals` (assumed location based on architecture)
- **Purpose**: Display all deals in a pipeline view with filtering and sorting capabilities
- **Key Actions**:
  - Create new deal
  - Filter by status (pending, closed_won, closed_lost)
  - Filter by lead or search by customer
  - Sort by creation date, closure date, or deal value
  - View deal count per status

**Deal Creation Form**
- **Location**: `/dealer/deals/new` (modal or page)
- **Purpose**: Capture deal information when creating a new sales opportunity
- **Key Actions**:
  - Select customer from dropdown
  - Select vehicle from dropdown (shows availability)
  - Enter deal value
  - Optionally select lead association
  - Add notes
  - Submit to create

**Deal Detail View**
- **Location**: `/dealer/deals/:id`
- **Purpose**: View full deal information and history
- **Key Actions**:
  - View customer and vehicle details
  - Edit deal information
  - Mark as won or lost (if pending)
  - Delete deal
  - View closure information (if closed)

### User Flow Diagram

```
[New Deal] → [Enter Details] → [Save] → [Pending Deal Created]
                                                    ↓
                                    [View in Pipeline List]
                                            ↓
                                  [Update/Edit Deal]
                                            ↓
                      [Mark Won] ← [Choose Action] → [Mark Lost]
                            ↓                           ↓
                    [Closed Won Deal]        [Closed Lost Deal]
                            ↓                           ↓
                    [Pipeline Reporting]    [Pipeline Reporting]
```

## Data Model

### Key Entities

**Deal**
- **Fields**:
  - `id` (UUID): Unique identifier
  - `leadId` (UUID, optional): Reference to lead entity (for lead-to-deal tracking)
  - `customerId` (UUID, required): Reference to customer entity
  - `vehicleId` (UUID, required): Reference to vehicle entity
  - `dealValueCents` (Integer): Deal value in cents (e.g., 3000000 = $30,000)
  - `status` (String): One of `pending`, `closed_won`, `closed_lost`
  - `closedAt` (DateTime, optional): Timestamp when deal was closed
  - `closedById` (UUID, optional): Reference to user who closed the deal
  - `notes` (String, optional): Internal notes about the deal
  - `createdAt` (DateTime): Record creation timestamp
  - `updatedAt` (DateTime): Record last update timestamp
- **Relationships**:
  - Belongs to `Organization` (multi-tenant)
  - Belongs to `Lead` (optional, for pipeline tracking)
  - Belongs to `Customer` (required)
  - Belongs to `User` via `closedBy` (optional, audit trail)

**Related Entities Referenced**:
- **Customer**: Contains customer contact information and KYC status
- **Lead**: Optional association for tracking lead-to-deal conversion
- **Vehicle**: The vehicle being sold in the deal
- **User**: The salesperson or agent closing the deal
- **Organization**: Multi-tenant parent entity

### Relationships
```
Organization (1) ──────── (many) Deal
         │                       │├─ (optional) Lead
         │                       ├─ Customer
         │                       ├─ User (closedBy)
         │                       └─ Vehicle
         └─── Customer
         └─── Lead
         └─── Vehicle
         └─── User
```

## Integration Points

### Internal Dependencies
- **Customer Module**: Deals reference customers; customer lookup required during deal creation/update
- **Vehicle Module**: Deals reference vehicles; vehicle lookup required during deal creation/update
- **Lead Module**: Optional association with leads for conversion tracking; supports lead-to-deal workflow
- **User Module**: Tracks which agent closed the deal (for audit and performance metrics)
- **Organization Module**: All deals scoped to organization via multi-tenancy

### External Services
- **None currently**: Deal tracking is internal to FleetPass; no external service integrations

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| **404 Not Found** | Deal ID doesn't exist or belongs to different organization | User sees error message; deal operations fail | Verify deal ID exists in current organization |
| **400 Bad Request - Customer not found** | `customerId` references non-existent customer | Deal creation/update fails | Select a valid customer from dropdown |
| **400 Bad Request - Vehicle not found** | `vehicleId` references non-existent vehicle | Deal creation/update fails | Select a valid vehicle from dropdown |
| **400 Bad Request - Lead not found** | `leadId` references non-existent lead | Deal creation/update fails | Select a valid lead or leave blank |
| **400 Bad Request - Cannot mark as won/lost** | Deal status is already closed (won or lost) | User sees error on action button | Cannot revert closed deal; must delete and recreate if needed |
| **400 Bad Request - Invalid status transition** | Attempt to transition from closed_won/closed_lost | Deal status update fails | Only pending deals can be closed |
| **400 Bad Request - Invalid deal value** | Deal value is negative or not an integer | Deal creation/update fails | Enter positive numeric value |

### Edge Cases

- **Zero-value deals**: System allows $0 deals (100 cents = $1 minimum is not enforced; based on cents validation only); useful for internal transfers or donated vehicles
- **Lead dissociation**: If a linked lead is deleted, the deal's `leadId` becomes null via cascade delete; deal persists
- **Customer deletion**: If a customer is deleted, the associated deal is also deleted (cascade delete); allows clean organization of old data
- **Reopening closed deals**: Cannot transition from closed_won or closed_lost back to pending; must delete and recreate
- **Concurrent closure attempts**: If two agents try to close the same deal simultaneously, the second request fails with status transition error

## Testing

### Test Coverage

- ✅ **Unit Tests**: `backend/src/deal/deal.service.spec.ts` (434 lines) - Service layer business logic
  - Deal creation with validation
  - Deal updates with status transitions
  - Win/lose closure operations
  - Error cases and edge cases

- ✅ **Integration Tests**: `backend/src/deal/deal.controller.integration.spec.ts` - Full request/response cycle
  - HTTP endpoint behavior
  - Authentication and authorization
  - Error handling (400, 404, 500)

- ❌ **E2E Tests**: Planned for Phase 3 (customer management and payment flows currently in Phase 2)

### Manual Testing Checklist

- [ ] Create deal with all fields (customer, vehicle, value, notes)
- [ ] Create deal with only required fields (no lead, no notes)
- [ ] View deals list with no filters
- [ ] Filter deals by status (pending, closed_won, closed_lost)
- [ ] Search deals by customer name/email
- [ ] Sort deals by creation date, closure date, deal value
- [ ] Update deal with new vehicle
- [ ] Mark pending deal as won and verify status/timestamp
- [ ] Mark pending deal as lost and verify status/timestamp
- [ ] Attempt to re-mark a closed deal (should fail)
- [ ] Delete a deal from list and verify removal
- [ ] Verify deals are only visible to correct organization

## Performance Considerations

- **Expected Load**: Typical dealership: 20-50 deals per month per location; pipeline view loads 100-500 deals for filtering/sorting
- **Optimization**:
  - Composite index `(status, closedAt)` optimizes pipeline and reporting queries
  - Pagination support in list endpoint (default 10 items, configurable to 100)
  - Optional search/filter fields allow efficient querying without full list scans
- **Limits**:
  - List endpoint limited to 100 items per page
  - No hard limit on deal value, but field is integer (max ~9 billion cents = $90M per deal)
  - Search fields (customer name, email) support case-insensitive contains matching

## Security Considerations

- **Authentication**: All endpoints require JWT authentication via `JwtAuthGuard`; unauthenticated requests receive 401 Unauthorized
- **Authorization**:
  - All deals filtered by `organizationId` from JWT token
  - Users cannot access/modify deals from other organizations
  - No role-based access control currently (all authenticated users can perform all deal operations)

- **Data Protection**:
  - Deal values stored in cents as integers (no floating-point precision issues)
  - Closure tracking via `closedBy` user ID enables audit trail
  - Notes field can contain sensitive information; access controlled via org isolation

- **Vulnerabilities Addressed**:
  - OWASP Top 10: Input validation via class-validator DTOs, SQL injection prevented by Prisma ORM parameterization
  - No XSS risks: deal notes are plain text fields
  - No CSRF: endpoints use standard REST conventions with CORS configuration

## Known Limitations

- **No Draft/Proposal Stage**: Deals go directly to "pending" on creation; no intermediate workflow stages (e.g., "quoted", "proposed")
- **No Automatic Win Conditions**: Deals must be manually marked as won; no auto-win based on completed booking
- **Limited Historical Tracking**: Only final status and closure timestamp stored; no status history/audit log of status changes
- **No Deal Analytics**: No built-in revenue reporting or pipeline forecasting (can be built on top of deal data)
- **No Deal Notifications**: No alerts when deals are created, updated, or closed
- **No Bulk Operations**: Cannot close multiple deals or bulk update pipeline in single request

## Future Enhancements

- **Deal Stages**: Add intermediate stages (opportunity, quote, proposal, negotiation) with customizable workflows per organization
- **Deal History**: Track all status changes with timestamps and user info for full audit trail
- **Automatic Closure**: Auto-mark deal as won when associated booking is completed
- **Deal Analytics Dashboard**: Revenue tracking, win rate metrics, pipeline forecasting, sales rep performance
- **Deal Notifications**: Email/in-app alerts for deal creation, status changes, and closures
- **Deal Templates**: Pre-configured deal notes and fields for common scenarios
- **Bulk Operations**: Bulk close, bulk update, bulk export functionality
- **Deal Comments**: Support for internal notes and comment threads on deals
- **Integration with Accounting**: Auto-create invoices or accounting records when deal is won

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [Customer Management Feature](../customer-management/README.md)
- [Lead Tracking Feature](../lead-tracking/README.md)
- [Booking System](../booking/README.md)
- [API Endpoints - Deals](../../api/endpoints.md#deal-endpoints)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-28 | Initial documentation for Deal Tracking feature | Claude |
| | Documented endpoints, workflows, data model, and business rules | |
| | Listed known limitations and future enhancements | |
