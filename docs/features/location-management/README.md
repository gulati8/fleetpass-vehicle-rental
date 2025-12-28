# Location Management

> **Status**: ✅ Production
> **Owner**: Backend Team
> **Last Updated**: 2024-12-28

## Overview

Location Management enables dealerships to maintain multiple service locations with complete address, operational hours, and geo-location information. This feature supports multi-location car rental operations by centralizing where vehicles are stationed and bookings are initiated/completed.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to add and manage multiple dealership locations so that I can organize vehicles across different branches and service areas.**

- Create new dealership locations with full address and contact details
- View all locations across the organization
- Update location information (hours, contact, address changes)
- Delete locations when they are no longer operational
- Filter locations by state, city, or search by name/address
- Track vehicle counts at each location

### Supported Workflows

1. **Add New Location**
   - Step 1: Manager navigates to Locations management section
   - Step 2: Clicks "Add Location" and enters name, address, city, state, postal code, and optional phone/hours
   - Step 3: System validates address format and creates location
   - Step 4: Location appears in the locations list and is available for vehicle assignment

2. **Update Location Details**
   - Step 1: Manager selects a location from the list
   - Step 2: Modifies any field (hours of operation, phone number, address change)
   - Step 3: System persists changes with updated timestamp
   - Step 4: Changes are immediately reflected in vehicle and booking interfaces

3. **Search & Filter Locations**
   - Step 1: Manager uses search bar to find locations by name, city, or address
   - Step 2: Optionally filters by state or city dropdown
   - Step 3: System displays matching locations with pagination (10 per page)
   - Step 4: Manager can drill down into a specific location for details

4. **Manage Location Lifecycle**
   - Step 1: Manager views location with vehicle count
   - Step 2: System prevents deletion if location has assigned vehicles
   - Step 3: Manager must reassign or delete vehicles first
   - Step 4: Once empty, location can be safely deleted

## Business Rules

### Validations

- **Location Name**: Required, non-empty string
- **Address Line 1**: Required, non-empty string
- **City**: Required, non-empty string
- **State Code**: Required, exactly 2 characters (e.g., "CA", "NY") - validates against US state abbreviations
- **Postal Code**: Required, validates US ZIP code format (XXXXX or XXXXX-XXXX)
- **Country**: Required, defaults to "US"
- **Phone Number**: Optional, validates international format (+1XXXXXXXXXX or 1XXXXXXXXXX)
- **Geo-Coordinates**: Optional latitude/longitude (float values) for map integration
- **Hours of Operation**: Optional JSON object with day-based schedules (e.g., `{"monday": {"open": "09:00", "close": "18:00"}}`)

### Constraints

- **Vehicle Association**: A location cannot be deleted if it has vehicles assigned to it
- **Booking Reference**: A location cannot be deleted if it is referenced by active bookings (pickup or dropoff locations)
- **Multi-Tenant Isolation**: Each organization sees only its own locations
- **Pagination**: List endpoints return 10 items per page by default (configurable)
- **Organization Ownership**: All locations are tied to the creating organization via `organizationId`

### Permissions

- **Who can access**: All authenticated users within an organization
- **Access level**: Full read/write/delete access for all organization members
- **Multi-tenant isolation**: Data is strictly isolated by `organizationId`; users cannot access locations from other organizations
- **Future Enhancement**: Role-based access control (admin vs. manager) could be added for more granular permissions

## User Interface

### Key Screens/Components

**Locations List View**
- **Location**: `/dealer/locations` or `/dashboard/locations`
- **Purpose**: Display all organization locations with search, filter, and pagination
- **Key Actions**:
  - Search by name, address, or city
  - Filter by state or city
  - View vehicle count per location
  - Click to view location details
  - Inline edit or delete buttons

**Location Detail / Edit Modal**
- **Location**: Modal overlay or detail page
- **Purpose**: View complete location information and edit details
- **Key Actions**:
  - View all address fields, phone, hours of operation
  - Edit any field and save
  - View associated vehicles (count and list)
  - Delete location (if no vehicles)

**Create Location Form**
- **Location**: `/dealer/locations/new`
- **Purpose**: Add a new location to the organization
- **Key Actions**:
  - Enter required fields (name, address, city, state, postal code)
  - Optionally set phone, coordinates, hours
  - Save to create location
  - Form validation feedback for invalid inputs (e.g., state code length, ZIP format)

### User Flow Diagram

```
[Manager Dashboard]
         → [Locations]
              → [List View with Search/Filter]
                   ├─→ [View Details Modal]
                   │    ├─→ [Edit Form]
                   │    └─→ [Delete (if no vehicles)]
                   └─→ [Create New Location Form]
                        └─→ [Confirmation → Success Message]
```

## Data Model

### Key Entities

**Location** (Prisma model)
- **Fields**:
  - `id` (UUID): Unique identifier
  - `organizationId` (UUID): Foreign key to Organization
  - `name` (String): Display name (e.g., "Downtown LA", "Airport Branch")
  - `addressLine1` (String): Street address
  - `addressLine2` (String, optional): Apartment, suite, etc.
  - `city` (String): City name
  - `state` (String): Two-letter state code
  - `postalCode` (String): ZIP code
  - `country` (String): Country code, defaults to "US"
  - `latitude` (Float, optional): Decimal degrees for mapping
  - `longitude` (Float, optional): Decimal degrees for mapping
  - `phone` (String, optional): Contact phone number
  - `hoursOfOperation` (JSON, optional): Day-keyed schedule `{day: {open, close}, ...}`
  - `createdAt` (DateTime): Record creation timestamp
  - `updatedAt` (DateTime): Record last update timestamp

- **Relationships**:
  - Belongs to `Organization` (cascade delete)
  - Has many `Vehicle` (vehicles stationed at this location)
  - Has many `Booking` as pickup location (`pickupBookings`)
  - Has many `Booking` as dropoff location (`dropoffBookings`)

## Integration Points

### Internal Dependencies

- **Vehicle Module**: Locations are referenced as the primary location where vehicles are stationed. Vehicles cannot be deleted if their location is deleted.
- **Booking Module**: Locations serve as pickup and dropoff points for bookings. Bookings reference locations but locations are not deleted during active bookings.
- **Organization Module**: All locations belong to an organization and are deleted in cascade when the organization is deleted.

### External Services

- **No external services** currently used (e.g., geocoding, mapping)
- Future enhancement: Google Maps API for address validation or reverse geocoding

## Error Scenarios & Edge Cases

### Common Errors

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| `VALIDATION_ERROR` (state code) | User entered "California" instead of "CA" | Form shows error: "State code must be 2 characters" | Correct to two-letter abbreviation |
| `VALIDATION_ERROR` (postal code) | User entered "90210X" instead of valid ZIP | Form shows error: "Invalid ZIP code format" | Use XXXXX or XXXXX-XXXX format |
| `VALIDATION_ERROR` (phone) | User entered "(123) 456-7890" instead of +11234567890 | Form shows error: "Invalid phone number format" | Use international format or US 10-digit |
| `LOCATION_NOT_FOUND` | User attempts to access a deleted location | API returns 404 with "Location not found" | Check location ID; location may have been deleted |
| `CANNOT_DELETE_LOCATION` | User tries to delete location with vehicles | API returns 400 with vehicle count | Reassign vehicles to another location first |
| `UNAUTHORIZED` | User from Organization A tries to access Organization B location | API returns 401/403 | Ensure user is logged into correct organization |

### Edge Cases

- **Empty hours of operation**: If not provided, the field is null and UI should display "Hours not specified" or "Open 24/7"
- **Partial address**: `addressLine2` is optional; system handles locations with only one address line
- **Deleted vehicles**: If all vehicles at a location are deleted, location deletion becomes available immediately
- **Concurrent updates**: If two users edit a location simultaneously, last-write-wins (normal database behavior); consider adding optimistic locking in future
- **Pagination boundary**: If filtering results in fewer items than page size, pagination still works correctly

## Testing

### Test Coverage

- ✅ Unit Tests: `backend/src/location/location.service.spec.ts` (432 lines, ~90% coverage)
  - Service method logic, validation, error handling
  - CRUD operations with mocked Prisma
  - Edge cases: location not found, vehicle cascade protection

- ✅ Integration Tests: `backend/src/location/location.controller.integration.spec.ts` (495 lines, ~85% coverage)
  - Full HTTP request/response cycle
  - Database interactions with test data
  - Authentication guard validation
  - Error responses (400, 404, etc.)
  - Multi-tenant isolation verification

- ⏳ E2E Tests: Planned for Phase 2
  - User workflow testing via Playwright
  - UI interaction testing

### Manual Testing Checklist

- [ ] Create location with all required fields; verify success response and location appears in list
- [ ] Create location with state code > 2 characters; verify validation error
- [ ] Create location with invalid ZIP code format; verify validation error
- [ ] Search locations by name; verify results filter correctly
- [ ] Filter locations by state; verify only matching state locations shown
- [ ] Update location phone number; verify change persists and appears in detail view
- [ ] Update hours of operation (e.g., add Monday 9:00-18:00); verify JSON structure persists
- [ ] Assign vehicle to location; attempt to delete location; verify error about vehicles
- [ ] Delete vehicle assigned to location; attempt to delete location; verify success
- [ ] Paginate locations list (create >10 locations); verify page navigation works
- [ ] Verify user from Organization A cannot view Organization B locations

## Performance Considerations

- **Expected Load**: Dealerships typically have 2-20 locations; queries are O(n) with light filtering
- **Optimization**:
  - Index on `organizationId` for fast multi-tenant filtering
  - Pagination (default 10/page) prevents large result sets
  - `include: { _count: { select: { vehicles: true } } }` adds vehicle count without separate query
  - Vehicle count cached during single query via Prisma `$transaction`
- **Limits**:
  - No hard limit on location count per organization
  - Search across name, city, and address (no full-text index yet)
  - Rate limiting: global 100 req/min applies to all endpoints

## Security Considerations

- **Authentication**: All endpoints require JWT via `JwtAuthGuard`
- **Authorization**:
  - Organization isolation enforced at service layer; `organizationId` from JWT user always filters queries
  - Users cannot query or modify locations from other organizations
  - No role-based access control yet (all org members have full access)
- **Data Protection**:
  - No sensitive data in Location (addresses are public information)
  - Phone numbers masked in list view (optional enhancement)
- **Vulnerabilities Addressed**:
  - SQL injection: Prisma parameterized queries prevent injection
  - XSS: Inputs validated via `class-validator` and sanitized in request handling
  - OWASP A05 (Authorization): Multi-tenant isolation tested in integration tests

## Known Limitations

- **Role-Based Permissions**: Currently all organization members have equal access; no admin-only deletions or edits
- **Geocoding**: Coordinates are manual entry only; no automatic geocoding from address
- **Booking Cascade**: Locations referenced by bookings cannot be soft-deleted; would require migration to soft-delete strategy
- **Hours Validation**: JSON format is not strictly validated; any day-key and time format accepted (could be malformed)
- **Concurrent Edits**: No optimistic locking; simultaneous updates can lose intermediate changes

## Future Enhancements

- **Geo-Location Features**: Integrate Google Maps API for address validation, reverse geocoding, and map display
- **Role-Based Permissions**: Restrict location management to dealers/admins only; read-only access for support staff
- **Soft Deletes**: Implement soft-delete strategy to preserve booking history for locations
- **Hours Validation**: Add JSON schema validation for `hoursOfOperation` format
- **Batch Operations**: Add bulk location import (CSV) for quick multi-location setup
- **Operational Metrics**: Track vehicle turnaround time and booking volume per location

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Endpoints](../../api/endpoints.md#location-management)
- [Vehicle Management](../vehicle-management/README.md)
- [Booking System](../booking-system/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-28 | Initial documentation for Location Management feature | Backend Team |
