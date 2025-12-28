# Vehicle Management

> **Status**: ✅ Production
> **Owner**: Development Team
> **Last Updated**: 2025-12-28

## Overview

Vehicle Management is the core inventory system for FleetPass that enables dealership managers to create, update, and manage their vehicle fleet. This feature provides complete lifecycle management of vehicles including image uploads, pricing, availability tracking, and location-based organization. The system is designed to support multi-location dealerships with comprehensive filtering and search capabilities.

## User Stories

### Primary Use Cases

**As a dealership manager, I want to add new vehicles to the system so that customers can browse and book them.**
- Create vehicle records with detailed specifications (make, model, year, trim)
- Set pricing for daily, weekly, and monthly rental rates
- Assign vehicles to specific dealership locations
- Mark vehicles as available or unavailable for rent

**As a dealership staff member, I want to search and filter vehicles to quickly find specific inventory.**
- Search by vehicle characteristics (make, model, VIN)
- Filter by type (sedan, SUV, truck), fuel type, transmission
- Filter by price range and year range
- Filter by location and availability status
- Sort results by creation date, year, price, or mileage

**As a dealership manager, I want to upload multiple photos of vehicles to showcase them to customers.**
- Upload up to 10 images per vehicle (up to 10MB each)
- Validate image file types (JPG, JPEG, PNG, WebP, AVIF)
- Reorder images to set primary/featured photo
- Delete individual images from a vehicle
- See uploaded images in a gallery interface

**As a booking system user, I want to check vehicle availability for specific date ranges before creating a booking.**
- Query vehicle availability without creating a booking
- Get accurate availability across all existing bookings
- Receive clear availability status and reasons for unavailability

### Supported Workflows

1. **Vehicle Creation Workflow**
   - Step 1: Dealership manager navigates to "Add New Vehicle" page
   - Step 2: Fills out vehicle form (make, model, year, pricing, location)
   - Step 3: System validates all required fields and VIN uniqueness
   - Step 4: Vehicle is created and added to inventory
   - Step 5: Manager can then edit vehicle to add images

2. **Vehicle Image Upload Workflow**
   - Step 1: Manager navigates to edit vehicle page
   - Step 2: Uploads images via drag-and-drop or file browser (up to 10 files)
   - Step 3: System validates each file (MIME type, magic bytes, size)
   - Step 4: Images are stored on disk and URLs saved to database
   - Step 5: Manager can reorder images or delete individual images
   - Step 6: Images appear in vehicle gallery for customer viewing

3. **Vehicle Inventory Search Workflow**
   - Step 1: Dealership staff opens vehicles list page
   - Step 2: Uses filters/search to narrow down vehicles
   - Step 3: Views filtered results with pagination
   - Step 4: Clicks on vehicle to see full details
   - Step 5: Reviews pricing, location, images, and specifications

4. **Availability Checking Workflow**
   - Step 1: Booking system queries vehicle availability
   - Step 2: Submits vehicle ID and date range to check endpoint
   - Step 3: System checks for conflicting bookings
   - Step 4: Returns availability status (available/unavailable with reason)
   - Step 5: Booking system uses availability to prevent double-booking

5. **Vehicle Update Workflow**
   - Step 1: Manager opens vehicle edit page
   - Step 2: Updates any vehicle details (pricing, specs, location)
   - Step 3: System validates all changes
   - Step 4: Updates are saved to database
   - Step 5: Changes reflected immediately in listings

## Business Rules

### Validations

- **VIN Uniqueness**: VIN must be unique across entire system (enforced at database level with unique constraint). Prevents duplicate vehicle entries.
- **VIN Format**: VIN must be exactly 17 characters. Ensures industry-standard vehicle identification.
- **Year Range**: Vehicle year must be between 1900 and current year + 1. Prevents data entry errors for historical or future vehicles.
- **Pricing**: Daily rate is required; weekly and monthly rates are optional. Daily rate in cents (e.g., 10000 = $100.00). Ensures sensible pricing structure.
- **Location Requirement**: Vehicle must be assigned to a location that belongs to the organization. Prevents location ownership violations.
- **Availability Flag**: Boolean flag indicates if vehicle is available for rental. Controls whether vehicle appears in customer-facing listings.
- **Image Formats**: Only JPG, JPEG, PNG, WebP, AVIF formats accepted. Ensures compatibility and performance.
- **Image Size**: Maximum 10MB per image, maximum 10 images per vehicle. Prevents storage overload and upload timeouts.
- **Image Validation**: Magic byte validation ensures files are genuine images (not spoofed files with image extensions).

### Constraints

- **Soft Delete Only**: Vehicles cannot be hard-deleted if they have active bookings (pending, confirmed, or active status). Prevents loss of booking history and audit trail.
- **Read-Only Base URL**: Vehicle image URLs are generated server-side; clients cannot manually construct image paths.
- **Organization Isolation**: All vehicle queries automatically filtered by organization; vehicles from one dealership are never visible to another.
- **Image Storage**: Images stored on disk in `backend/uploads/vehicles/` directory; served via static asset middleware with `http://localhost:3001/uploads/vehicles/` prefix.
- **Composite Indexing**: Database includes composite index on `(locationId, isAvailableForRent, make)` for performance optimization of common queries.

### Permissions

- **Who can access**: Only authenticated dealership staff (users with valid JWT token for the organization)
- **Access level**: Dealership managers and staff can create, read, update, and delete vehicles within their organization
- **Multi-tenant isolation**: Vehicles are scoped to organization via location relationship; users see only vehicles in locations belonging to their organization
- **Role-based future enhancement**: Currently all authenticated users can perform all operations; future role-based access control can be added via `@Roles()` decorator

## User Interface

### Key Screens/Components

**Vehicle List Page**
- **Location**: `frontend/app/(dealer)/vehicles/page.tsx`
- **Purpose**: Browse and manage entire vehicle inventory with search and filtering
- **Key Actions**:
  - Search vehicles by make, model, or VIN
  - Filter by location, body type, fuel type, transmission, price range, year range, and availability
  - Sort by creation date, year, price, or mileage
  - View vehicles in paginated list
  - Click vehicle to view details or edit

**Vehicle Details Page**
- **Location**: `frontend/app/(dealer)/vehicles/[id]/page.tsx`
- **Purpose**: View complete vehicle information and image gallery
- **Key Actions**:
  - View vehicle specifications and pricing
  - Browse image gallery with thumbnails
  - View which location the vehicle is assigned to
  - Check current availability status
  - Navigate to edit page

**Vehicle Create Form**
- **Location**: `frontend/app/(dealer)/vehicles/new/page.tsx`
- **Purpose**: Add new vehicle to inventory
- **Key Actions**:
  - Enter vehicle details (make, model, year, VIN, pricing)
  - Select body type, fuel type, transmission, colors
  - Enter mileage and features
  - Assign to location
  - Submit to create vehicle

**Vehicle Edit Page**
- **Location**: `frontend/app/(dealer)/vehicles/[id]/edit/page.tsx`
- **Purpose**: Update existing vehicle information and manage images
- **Key Actions**:
  - Modify any vehicle specification
  - Upload, delete, or reorder images
  - Update pricing and availability status
  - Save changes

**VehicleForm Component**
- **Location**: `frontend/components/features/vehicles/VehicleForm.tsx`
- **Purpose**: Shared form component for create and edit operations
- **Key Features**: Form validation, field grouping, required field indicators

**VehicleImageUploader Component**
- **Location**: `frontend/components/features/vehicles/VehicleImageUploader.tsx`
- **Purpose**: Multi-file image upload with drag-and-drop
- **Key Features**: Drag-and-drop support, file validation, upload progress, preview grid, delete actions

**VehicleGallery Component**
- **Location**: `frontend/components/features/vehicles/VehicleGallery.tsx`
- **Purpose**: Display vehicle images with navigation and lightbox view
- **Key Features**: Main image display, thumbnail strip, previous/next navigation, fullscreen lightbox

**VehicleCard Component**
- **Location**: `frontend/components/features/vehicles/VehicleCard.tsx`
- **Purpose**: Compact vehicle representation in list views
- **Key Features**: Primary image, basic specs, price display, quick actions

**VehicleFilters Component**
- **Location**: `frontend/components/features/vehicles/VehicleFilters.tsx`
- **Purpose**: Search and filtering interface
- **Key Features**: Multiple filter criteria, search box, clear filters button

**VehicleAvailabilityCalendar Component**
- **Location**: `frontend/components/features/vehicles/VehicleAvailabilityCalendar.tsx`
- **Purpose**: Visual calendar showing vehicle availability for date range selection
- **Key Features**: Date range picker, visual availability indicators

### User Flow Diagram

```
START
  |
  v
[Vehicle List Page]
  |
  +---> [Search/Filter] --> [Filtered Results]
  |           |
  |           v
  |      [View Details Page]
  |           |
  |           +---> [View Images in Gallery]
  |           |
  |           +---> [Go to Edit Page]
  |                      |
  |                      v
  |                [Edit Form]
  |                      |
  |                      +---> [Upload Images] --> [Reorder/Delete Images]
  |                      |
  |                      v
  |                [Save Changes]
  |
  +---> [Add New Vehicle] --> [Create Form]
               |
               v
          [Submit]
               |
               v
        [Vehicle Created]
               |
               v
        [Redirect to Edit to Add Images]

END
```

## Data Model

### Key Entities

**Vehicle**
- **Fields**:
  - `id` (String, UUID): Unique identifier
  - `vin` (String, unique): Vehicle Identification Number (17 characters)
  - `make` (String): Vehicle manufacturer (e.g., "Toyota", "Ford")
  - `model` (String): Vehicle model name (e.g., "Camry", "Mustang")
  - `year` (Integer): Model year (1900 - current+1)
  - `trim` (String, optional): Trim level (e.g., "LE", "Sport")
  - `bodyType` (String, optional): Vehicle category (sedan, suv, truck, coupe, van, convertible, wagon)
  - `exteriorColor` (String, optional): Exterior color
  - `interiorColor` (String, optional): Interior color
  - `transmission` (String, optional): automatic or manual
  - `fuelType` (String, optional): gas, diesel, electric, or hybrid
  - `mileage` (Integer, optional): Current odometer reading
  - `dailyRateCents` (Integer): Daily rental rate in cents (required)
  - `weeklyRateCents` (Integer, optional): Weekly rental rate in cents
  - `monthlyRateCents` (Integer, optional): Monthly rental rate in cents
  - `features` (JSON, optional): Vehicle features (e.g., {bluetooth: true, backup_camera: true})
  - `imageUrls` (String[]): Array of image URLs (up to 10)
  - `isAvailableForRent` (Boolean): Availability flag (default: true)
  - `notes` (String, optional): Internal notes about the vehicle
  - `createdAt` (DateTime): Record creation timestamp
  - `updatedAt` (DateTime): Last update timestamp
  - `locationId` (String): Foreign key to Location

- **Relationships**:
  - Belongs to `Location` (many vehicles per location)
  - Has many `Booking` entries (one vehicle has many bookings)

**Location** (Related Entity)
- **Fields**:
  - `id`, `name`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `phone`
  - `organizationId`: Parent organization
- **Relationship**: One location has many vehicles

## Integration Points

### Internal Dependencies

- **Location Management**: Each vehicle must be assigned to a valid location within the organization. The create and update operations verify location ownership.
- **Booking System**: The `checkAvailability` endpoint queries the Booking table to determine if a vehicle is booked for requested dates. Bookings with status 'pending', 'confirmed', or 'active' block availability.
- **Organization Context**: All queries are automatically scoped by `organizationId` through the location relationship, ensuring multi-tenant isolation.

### External Services

- **File Storage (Backend)**: Images stored in `backend/uploads/vehicles/` directory on disk; served via static asset middleware
- **Magic Bytes Validation**: Uses `FileValidator.validateImageFile()` utility to verify genuine image files (prevents spoofed files with image extensions)

## Error Scenarios & Edge Cases

| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| `409 Conflict: Vehicle with VIN {vin} already exists` | VIN is not unique in the system | User sees error message; form is not submitted | Check existing vehicles; use different VIN |
| `400 Bad Request: Location not found or does not belong to your organization` | Selected location doesn't exist or belongs to different organization | User sees error message; vehicle not created | Select valid location from dropdown |
| `400 Bad Request: Cannot delete vehicle with {n} active booking(s)` | Vehicle has pending/confirmed/active bookings | Delete operation fails; vehicle remains available | Complete or cancel all bookings first; then delete |
| `404 Not Found: Vehicle with ID {id} not found` | Vehicle ID doesn't exist or belongs to different organization | User sees error page | Verify correct vehicle ID; check URL |
| `400 Bad Request: No files provided for upload` | User clicks upload without selecting files | Upload fails silently or shows error | Select at least one image file |
| `400 Bad Request: File {name} failed security validation` | File is not a genuine image (magic bytes don't match MIME type) | Upload fails; file is deleted from disk | Use actual image files; no spoofed file extensions |
| `413 Payload Too Large: File size exceeds 10MB` | Image file exceeds size limit | Upload fails; file is deleted | Compress image or resize before upload |
| `400 Bad Request: Only image files allowed` | Non-image MIME type uploaded | Upload fails; file is not stored | Upload only JPG, PNG, WebP, AVIF files |

### Edge Cases

- **Empty VIN Field**: Validation prevents submission; user must enter 17-character VIN
- **Concurrent Image Uploads**: Multer processes up to 10 files concurrently; excess files are rejected
- **Image Upload During Vehicle Update**: Service validates vehicle exists before appending new image URLs; old URLs are preserved
- **Image Reordering with Missing URLs**: Reorder endpoint accepts array of URLs; only URLs present in current imageUrls array are reordered (no-op for non-existent URLs)
- **Delete Vehicle with Associated Bookings**: Soft delete (sets isAvailableForRent=false) prevents loss of booking history
- **Duplicate VIN Update**: When updating vehicle, system allows same VIN to remain; rejects different vehicle with same VIN
- **Multi-Organization Vehicle Queries**: All queries filtered by organization through location relationship; cross-organization access is impossible
- **Image File Overwrite**: Timestamps in filenames ensure no overwrites; old images remain until explicitly deleted

## Testing

### Test Coverage

- ✅ Unit Tests: `backend/src/vehicle/vehicle.service.spec.ts` (571 lines - comprehensive service layer testing)
- ✅ Integration Tests:
  - `backend/src/vehicle/vehicle.controller.integration.spec.ts` (696 lines - full request/response cycles)
  - `backend/src/vehicle/vehicle-image-upload.integration.spec.ts` (788 lines - image upload validation)
- ✅ E2E Tests:
  - `e2e-tests/tests/vehicle-crud.spec.ts` (615 lines - create, read, update, delete workflows)
  - `e2e-tests/tests/vehicle-images.spec.ts` (453 lines - image upload and management)
  - `e2e-tests/tests/upload-single-image.spec.ts` (160 lines - single image upload)
  - `e2e-tests/tests/upload-avif.spec.ts` (117 lines - AVIF format support)

### Manual Testing Checklist

- [ ] Create vehicle with all required fields
- [ ] Attempt to create vehicle with duplicate VIN (expect 409)
- [ ] Attempt to create vehicle with invalid location (expect 400)
- [ ] Search vehicles by make, model, and VIN
- [ ] Filter vehicles by location, body type, fuel type, transmission
- [ ] Filter vehicles by price range and year range
- [ ] Filter vehicles by availability status
- [ ] Sort results by different fields (creation date, year, price, mileage)
- [ ] Paginate through vehicle list
- [ ] View vehicle details page
- [ ] Upload single image to vehicle
- [ ] Upload multiple images at once (up to 10)
- [ ] Attempt to upload non-image file (expect error)
- [ ] Attempt to upload image >10MB (expect error)
- [ ] Delete single image from vehicle
- [ ] Reorder images and verify order persists
- [ ] View images in gallery with thumbnails
- [ ] Test gallery lightbox fullscreen view
- [ ] Navigate between gallery images
- [ ] Update vehicle pricing
- [ ] Update vehicle location
- [ ] Attempt to delete vehicle with active booking (expect error)
- [ ] Check availability for available date range (expect true)
- [ ] Check availability for booked date range (expect false)

## Performance Considerations

- **Expected Load**: Typical dealership with 50-500 vehicles per location; queries filtered to single organization reduce result set significantly
- **Optimization**:
  - Composite index on `(locationId, isAvailableForRent, make)` optimizes common filter queries
  - Pagination (default 10 per page) prevents loading entire inventory
  - Sorting applied at database level, not in application
  - Location validation cached via Prisma query
- **Limits**:
  - Maximum 10 images per vehicle (enforced by Multer `FilesInterceptor`)
  - Maximum 10MB per image (enforced by Multer `limits`)
  - Pagination limit maximum 100 (configurable but defaults to 10)
  - Global rate limit: 100 req/min; auth endpoints: 5 req/15min

## Security Considerations

- **Authentication**: All endpoints require valid JWT token via `JwtAuthGuard`. Token extracted from Authorization header or cookie.
- **Authorization**: Organization isolation enforced through location relationship; users access only vehicles in locations owned by their organization
- **Data Protection**:
  - VIN (sensitive vehicle identifier) is indexed but only queryable within organization scope
  - Pricing information only visible to authenticated dealership staff
  - Images stored on disk with timestamps in filenames to prevent enumeration
- **Vulnerabilities Addressed**:
  - VIN Injection: Validated as string with length check; case-insensitive search with parameterized queries
  - File Upload Attacks: Magic byte validation prevents spoofed files; file size limits prevent DoS; MIME type checking enforces image files only
  - Multi-tenant Bypass: All queries filtered by organizationId; cannot query vehicles from other organizations
  - Race Conditions: VIN uniqueness enforced at database level; concurrent requests cannot create duplicates

## Known Limitations

- **No Hard Delete**: Vehicles can only be soft-deleted (marked unavailable); hard deletion is prevented if any bookings exist. Future enhancement could add "archive" functionality.
- **Single Location Assignment**: Vehicle must belong to exactly one location; multi-location vehicle pools not currently supported. Could be added with pivot table.
- **No Image Resizing**: Images stored at original resolution; no automatic thumbnail generation. Could be added with image processing service.
- **No Image Metadata**: EXIF data and other image metadata not extracted or displayed. Could be added for future vehicle condition documentation.
- **Basic Features JSON**: Features stored as flat JSON object; no structured feature catalog. Could be enhanced with feature templates by organization.
- **No Availability Calendar UI**: Availability checking available via API but no UI for non-technical users. Could add calendar component.

## Future Enhancements

- **Image Optimization**: Automatic resizing, WebP conversion, thumbnail generation, lazy loading for better performance
- **Advanced Filtering**: Save filter presets, vehicle comparisons, bulk operations (price updates, availability toggling)
- **Availability Calendar**: Visual calendar view showing booked vs available dates for each vehicle
- **Vehicle Templates**: Pre-defined feature sets by vehicle type for faster vehicle creation
- **Integration with Inventory Management**: Track vehicle maintenance, inspections, service schedules
- **Bulk Operations**: Import vehicles via CSV, bulk price updates, bulk image uploads
- **Advanced Search**: Full-text search, autocomplete suggestions, saved searches
- **Vehicle Comparison**: Side-by-side vehicle comparison interface for staff and customers
- **Custom Fields**: Organization-specific custom vehicle attributes beyond standard fields
- **Document Storage**: Attach registration, insurance, inspection documents to vehicle records

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [Vehicle Images Implementation](../vehicle-images.md)
- [Booking System](../booking-management/README.md)
- [Location Management](../location-management/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-12-28 | Initial comprehensive documentation created | Development Team |
| 2024-12-22 | Vehicle image management system implemented | Development Team |
| 2024-12-01 | Core vehicle CRUD and availability checking implemented | Development Team |
