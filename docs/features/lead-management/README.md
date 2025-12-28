# Lead Management

> **Status**: Production
> **Owner**: Sales & Customer Success
> **Last Updated**: 2025-12-28

## Overview

Lead Management is a core sales pipeline feature that tracks potential customers from initial contact through conversion to active deals. The system captures lead source, assignment to sales agents, status progression, and conversion to binding deals with vehicle information.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to capture new leads from multiple sources (website, phone, walk-in) so that no potential customer falls through the cracks.**

**As a sales agent, I want to track assigned leads with their contact information and vehicle interests so that I can follow up effectively.**

**As a sales manager, I want to monitor lead conversion rates and pipeline status so that I can optimize sales performance and identify coaching opportunities.**

### Supported Workflows

1. **Lead Capture & Creation**
   - Step 1: Sales staff receives customer inquiry (via website form, phone, in-person visit)
   - Step 2: System creates new lead with source tracking (website, phone, walk_in, referral, etc.)
   - Step 3: Lead is assigned automatic status of "new" and ready for assignment or follow-up

2. **Lead Assignment & Qualification**
   - Step 1: Manager assigns lead to specific sales agent (or agent claims lead)
   - Step 2: Lead progresses through workflow: new → contacted → qualified
   - Step 3: Agent tracks notes and vehicle interest to maintain context
   - Step 4: Lead marked as qualified when customer is genuinely interested

3. **Lead Conversion to Deal**
   - Step 1: Qualified lead selects vehicle and is ready to proceed
   - Step 2: System converts lead to Deal (binding record with pricing)
   - Step 3: Lead status becomes "converted" and links to associated deal
   - Step 4: Customer moves to active booking/payment workflow

4. **Lead Disqualification**
   - Step 1: Agent determines customer is not viable (price sensitive, wrong fit, etc.)
   - Step 2: Lead status changed to "lost"
   - Step 3: No further action possible (immutable status)
   - Step 4: System tracks disqualification for analytics

## Business Rules

### Validations

- **Lead Source**: Optional field that categorizes origin (website, phone, walk_in, referral). Supports any custom source string for flexible reporting.
- **Customer Association**: Lead can be tied to existing customer (via `customerId`) or created as a prospect (email/name only).
- **Vehicle Interest**: Optional reference to specific vehicle. Used for personalized follow-up and recommendation tracking.
- **Status Workflow**: Leads must follow a defined progression (new → contacted → qualified → converted/lost). Invalid transitions are rejected.
- **Assignment**: Lead can only be assigned to active, authorized users within the organization.
- **Conversion Requirements**: Lead must have associated customer AND selected vehicle before conversion to deal.

### Constraints

- **No Backward Transitions**: Once a lead is marked "converted" or "lost", it cannot revert to previous states (immutable terminal states).
- **Conversion Prevents State Changes**: A "converted" lead is archived from further workflow progression (no editing status).
- **Lost Lead Protection**: Cannot convert a lead marked "lost". Must be requalified through direct customer re-engagement (not automated).
- **Single Organization Isolation**: Leads are scoped strictly to organization and never visible cross-tenant.

### Permissions

- **Who can access**: Authenticated dealership users (admin, manager, sales_agent, support)
- **Access level**:
  - Read: All authenticated users can view leads in their organization
  - Write: Users can create leads; managers can assign/edit any lead; agents can self-assign
  - Admin: Organization admins can manage all leads and user assignments
- **Multi-tenant isolation**: All queries automatically filtered by `organizationId` from JWT token. No cross-organization data leakage.

## User Interface

### Key Screens/Components

**Lead List Dashboard**
- **Location**: `/dashboard/leads` or `/leads`
- **Purpose**: Sales team views all leads in pipeline with filtering and search
- **Key Actions**:
  - Filter by status (new/contacted/qualified/converted/lost)
  - Filter by source (website/phone/walk_in, etc.)
  - Filter by assigned user (to see my leads, manager's leads, etc.)
  - Search by customer name, email, or phone number
  - Sort by creation date, last updated, or status
  - Pagination with configurable page size
  - Quick assign to user

**Lead Detail View**
- **Location**: `/leads/:id`
- **Purpose**: Sales agent reviews lead history, notes, and vehicle interest
- **Key Actions**:
  - View customer information (name, email, phone, linked customer profile if exists)
  - View assigned sales agent and creation date
  - Edit customer notes and contact information
  - Change status (with validation of allowed transitions)
  - View associated deals (if converted)
  - Assign to different user
  - Delete lead (soft delete conceptually, but hard delete in API)

**Lead Conversion Form**
- **Location**: Lead detail view → "Convert" button
- **Purpose**: Transition qualified lead to active deal
- **Key Actions**:
  - Select vehicle for the deal
  - Enter deal value (negotiated price)
  - Add deal notes
  - Confirm conversion (triggers transaction: creates Deal + updates Lead status)

**Lead Assignment Modal**
- **Location**: Lead list or detail view → "Assign" button
- **Purpose**: Reassign lead to another sales agent
- **Key Actions**:
  - Select target user/agent
  - Confirm assignment
  - Notes about reassignment reason (optional)

### User Flow Diagram

```
[Lead Created]
     ↓
[Status: new]
     ↓
[Assigned to Sales Agent]
     ↓
[Status: contacted]
     ↓
[Status: qualified OR Status: lost]
     ↓
[If qualified]:
     ↓
[Status: converted + Create Deal] → [Booking/Payment Flow]
     ↓
[If lost]:
     ↓
[Archived, no further action]
```

## Data Model

### Key Entities

**Lead** (`backend/src/lead`)
- **Fields**:
  - `id` (String, UUID): Unique lead identifier
  - `customerId` (String?, optional): Foreign key to Customer if prospect is already registered
  - `customerEmail` (String?, optional): Email for prospects not yet in system
  - `customerName` (String?, optional): Name for prospects not yet in system
  - `customerPhone` (String?, optional): Phone for prospects not yet in system
  - `source` (String?, optional): Origin channel (website, phone, walk_in, referral, etc.)
  - `vehicleInterestId` (String?, optional): Foreign key to Vehicle of interest
  - `status` (String): One of new | contacted | qualified | converted | lost
  - `assignedToId` (String?, optional): Foreign key to User (sales agent)
  - `notes` (String?, optional): Internal notes from sales team
  - `createdById` (String?, optional): Foreign key to User who created the lead
  - `organizationId` (String): Foreign key to Organization (required for multi-tenancy)
  - `createdAt` (DateTime): Timestamp of creation
  - `updatedAt` (DateTime): Timestamp of last modification

- **Relationships**:
  - Belongs to `Organization` (one-to-many)
  - Belongs to `Customer` (optional, many-to-one)
  - Belongs to `User` (assignedTo, optional)
  - Belongs to `User` (createdBy, optional)
  - Has many `Deal` (inverse relationship)

**Deal** (`backend/src/deal`)
- **Key Link**: A Deal is created when a Lead is converted
- **Fields**: `leadId` (optional FK to Lead), `customerId`, `vehicleId`, `dealValueCents`, `status`, etc.

**Database Indexes** (for performance):
- `[organizationId]` - Multi-tenant filtering on every query
- `[customerId]` - Find leads by customer
- `[status]` - Filter dashboard by workflow status
- `[assignedToId]` - Find leads assigned to specific agent
- `[status, assignedToId, createdAt]` COMPOSITE - Lead dashboard queries (most critical)
- `[source, status]` - Lead source analytics and funnel reporting

## Integration Points

### Internal Dependencies

- **Customer Module** (`backend/src/customer`): Leads validate customer existence before creation/update. Optional linkage for prospect leads.
- **Vehicle Module** (`backend/src/vehicle`): Leads track vehicle interest. Validates vehicle exists and belongs to organization before storage.
- **Deal Module** (`backend/src/deal`): Lead conversion creates Deal. Shares customer and vehicle context.
- **User Module** (`backend/src/user`): Lead assignment queries User existence. Ensures assigned user is active.
- **Authentication** (`@nestjs/jwt`): All endpoints require valid JWT token. User context extracted for organization isolation.

### External Services

- None. Lead Management is self-contained with internal references only.

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| 404 Not Found | Lead ID doesn't exist or belongs to different organization | User sees "Lead not found" | Verify lead ID, ensure you're accessing correct organization |
| 400 Bad Request - Invalid Status Transition | Attempting to change status to invalid state (e.g., new → converted) | Status update is rejected | Follow allowed transitions: new→contacted/qualified/lost, contacted→qualified/lost, qualified→converted/lost |
| 400 Bad Request - Customer Not Found | Attempting to link non-existent customer ID | Lead creation/update fails | Verify customer exists and is in same organization |
| 400 Bad Request - Vehicle Not Found | Attempting to link non-existent vehicle ID | Lead creation/update fails | Verify vehicle exists in same organization |
| 409 Conflict - Already Converted | Attempting to convert lead that was already converted | Conversion is blocked | Lead is already processed; view associated deal instead |
| 400 Bad Request - Lost Lead Cannot Convert | Attempting to convert lead marked "lost" | Conversion is blocked | Lead disqualified; create new lead if customer re-engages |
| 400 Bad Request - No Customer for Conversion | Lead lacks customer when attempting conversion | Conversion is blocked | Link existing customer to lead first, or customer must exist |
| 400 Bad Request - Inactive User Assignment | Attempting to assign to deactivated user | Assignment fails | Select active user; coordinate with admin if user should be reactivated |

### Edge Cases

- **Orphaned Customer Reference**: If a linked customer is deleted (external action), the `customerId` becomes null via `SetNull` cascade. Lead still exists but shows "customer deleted" state.
- **Prospect Lead → Registered Customer**: A lead created with email/name (no customer) can later be linked to a registered customer via update. System allows this pivot.
- **Conversion Without Prior Qualification**: API allows converting "new" or "contacted" leads if vehicle is specified. Business logic not enforced (trust team discipline). Manager should monitor for shortcuts.
- **Concurrent Conversions**: If two requests attempt to convert same lead simultaneously, second request will fail with "Lead has already been converted" (ConflictException).
- **Assignment to Self**: No restriction; system allows a user to reassign lead to themselves (edge case but harmless).

## Testing

### Test Coverage

- ✅ **Unit Tests**: `backend/src/lead/lead.service.spec.ts` (505 lines)
  - Coverage: 100% for core service logic
  - Tests: create, findAll, findOne, update, remove, assign, convert methods
  - Includes validation, status transition, error handling

- Integration Tests: Under `backend/src/lead/lead.controller.integration.spec.ts` (exists, content not reviewed in this context)

- E2E Tests: Lead workflows likely covered in `e2e-tests/tests/` (not yet documented)

### Manual Testing Checklist

- [ ] Create lead with all fields (customer linked + vehicle interest + notes)
- [ ] Create lead with minimal fields (email + name only)
- [ ] Verify lead appears in dashboard list with correct status
- [ ] Filter leads by status and verify results
- [ ] Filter leads by source (website, phone, walk_in)
- [ ] Filter leads by assigned user and verify you see only your assigned leads
- [ ] Search leads by customer name/email/phone and verify results
- [ ] Assign lead to another user and verify assignment updates
- [ ] Progress lead through workflow (new → contacted → qualified)
- [ ] Attempt invalid transition (e.g., qualified → new) and verify rejection
- [ ] Convert lead to deal and verify Deal is created with correct values
- [ ] Verify converted lead shows link to associated deal
- [ ] Mark lead as lost and verify no further edits allowed
- [ ] Attempt to convert lost lead and verify ConflictException
- [ ] Verify deleted lead is no longer visible in list
- [ ] Verify lead data is organization-scoped (no cross-tenant leakage)

## Performance Considerations

- **Expected Load**: Typical dealership: 50-200 leads in active pipeline at any time. Dashboard queries expected 10-50 times daily per user.
- **Optimization**:
  - Composite index `[status, assignedToId, createdAt]` optimizes dashboard queries (most common operation)
  - Composite index `[source, status]` optimizes analytics/funnel queries
  - Pagination enforced (default limit 10, max configurable) prevents full-table scans
  - Transaction batching in `findAll` (single query for items + count via `$transaction`)
- **Limits**:
  - Page limit: 1-100 (configurable per deployment, default 10)
  - Search: Case-insensitive substring match across name, email, phone
  - No hard cap on leads per organization (scales horizontally with database)

## Security Considerations

- **Authentication**: All endpoints require valid JWT token. No public/unauthenticated access.
- **Authorization**:
  - Organization isolation: All queries filtered by `organizationId` from JWT (no cross-tenant access possible)
  - Role-based future: Currently all authenticated users can read/write. Future: restrict write to managers/admins only
- **Data Protection**:
  - Customer email/phone may contain PII. No sensitive encryption (in-transit via HTTPS, at-rest in database assumed secure)
  - Notes field may contain internal observations; access should be role-restricted (future improvement)
- **Vulnerabilities Addressed**:
  - OWASP A01 (Broken Access Control): Organization isolation prevents cross-tenant access
  - OWASP A03 (Injection): All user inputs validated via DTO/class-validator before query execution
  - OWASP A05 (Broken Access Control - misc): Idempotency via idempotency-key prevents duplicate lead creation on retries

## Known Limitations

- **Status Workflow Hardcoded**: Status transitions are hardcoded in service (new → contacted → qualified → converted/lost). No UI configuration. Change requires code deployment.
- **No Lead Scoring**: System doesn't calculate lead quality, temperature, or priority. Relies on manual status updates.
- **No Bulk Operations**: No bulk assign, bulk delete, or bulk status update. Each lead modified individually.
- **No Lead History/Audit Trail**: Status changes and assignments not logged to audit table. Difficult to track "who did what when" after the fact.
- **No Automated Follow-up**: No scheduling or reminder system for leads in "contacted" or "qualified" stages. Relies on external calendar tools.
- **Vehicle Interest Not Validated on Conversion**: Vehicle in convert request doesn't have to match `vehicleInterestId` from lead. No warning if switching vehicles at last moment.
- **No Lead Merge**: If duplicate leads created for same prospect, no system-provided merge. Manual delete + reassign required.

## Future Enhancements

- **Lead Scoring**: Implement lead quality algorithm based on engagement (form completeness, vehicle fit, price alignment). Notify managers of high-potential leads.
- **Automated Workflows**: Trigger timed reminders (e.g., follow-up 24hrs after contact). Send templates via email/SMS.
- **Bulk Operations**: Add bulk assign, bulk delete, bulk status update for faster pipeline management.
- **Audit Trail**: Log all status transitions, assignments, and conversions to `LeadAudit` table for compliance and coaching.
- **Lead Forecasting**: Dashboard KPI showing projected conversion rate, average time-to-close, funnel metrics.
- **Integration with CRM**: Sync leads to external CRM (Salesforce, HubSpot) for teams using dual systems.
- **Lead Templates**: Pre-populated lead forms for common sources (Google Ads, Facebook Ads) with auto-captured source UTM parameters.

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Endpoints Documentation](../../api/endpoints.md#leads)
- [Deal Management Feature](../deal-management/README.md)
- [Customer Management Feature](../customer-management/README.md)
- [Vehicle Management Feature](../vehicle-management/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-28 | Initial documentation created | AI Assistant |
