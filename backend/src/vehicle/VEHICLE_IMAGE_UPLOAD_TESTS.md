# Vehicle Image Upload Test Suite

## Overview

Comprehensive integration test suite for the vehicle image upload functionality, covering AVIF support, bulk uploads, and rate limiting removal.

## Test File

- **Location**: `/src/vehicle/vehicle-image-upload.integration.spec.ts`
- **Framework**: Jest with NestJS Testing utilities
- **Test Type**: Integration tests with mocked services

## Test Coverage

### Test 1: Upload AVIF Image

Tests the newly added AVIF image format support.

**Tests:**
- ✅ Should successfully upload a single AVIF image
- ✅ Should verify AVIF image URL is accessible

**What it validates:**
- AVIF files are accepted by the file filter
- AVIF mimetype (`image/avif`) is correctly processed
- Image URLs are generated correctly for AVIF files

---

### Test 2: Upload Multiple Images (Bulk Upload)

Tests the removal of rate limiting to allow bulk uploads.

**Tests:**
- ✅ Should upload 4 images at once (2 JPEG, 1 PNG, 1 AVIF) without rate limiting
- ✅ Should verify all 4 images display correctly with proper count

**What it validates:**
- Multiple files can be uploaded in a single request
- No rate limiting errors occur
- All files are processed and stored correctly
- Image count is accurate (4 of 10 images)
- Mixed file formats work together

---

### Test 3: Upload Different Formats

Tests all supported image formats individually and together.

**Tests:**
- ✅ Should upload and accept JPEG format
- ✅ Should upload and accept PNG format
- ✅ Should upload and accept WebP format
- ✅ Should upload and accept AVIF format
- ✅ Should reject unsupported format (GIF)
- ✅ Should upload all supported formats together

**What it validates:**
- Each format (JPEG, PNG, WebP, AVIF) is accepted
- Unsupported formats (e.g., GIF) are rejected
- All formats can be uploaded together in one request

---

### Test 4: Upload Near Maximum (10 images)

Tests the maximum upload limit.

**Tests:**
- ✅ Should upload 10 images at once without rate limiting
- ✅ Should verify all 10 images display correctly
- ✅ Should reject upload exceeding 10 images limit

**What it validates:**
- 10 images can be uploaded simultaneously
- No rate limiting occurs on bulk uploads
- Attempting to upload more than 10 images is rejected
- Image count shows "10 of 10 images"

---

### Edge Cases and Validation

**Tests:**
- ✅ Should reject upload if vehicle does not exist
- ✅ Should reject upload if vehicle belongs to different organization
- ✅ Should reject upload if file size exceeds limit (10MB)
- ✅ Should handle upload with no files gracefully
- ✅ Should verify @SkipThrottle decorator is applied (no rate limiting)

**What it validates:**
- Vehicle ownership verification
- Organization-level access control
- File size limits (10MB per file)
- Empty upload handling
- Rate limiting is disabled via `@SkipThrottle()` decorator

---

### Image URL Generation

**Tests:**
- ✅ Should generate correct image URLs with unique filenames

**What it validates:**
- Image URLs follow the correct format
- Filenames are unique (timestamp-based)
- URLs include the correct base path

---

### Additional Endpoints

**Tests:**
- ✅ DELETE /vehicles/:id/images - Should successfully delete an image
- ✅ PATCH /vehicles/:id/images/reorder - Should successfully reorder images

**What it validates:**
- Image deletion works correctly
- Image reordering maintains the correct order

---

## Running the Tests

### Run All Image Upload Tests

```bash
npm test -- vehicle-image-upload.integration.spec.ts
```

### Run Specific Test Suite

```bash
npm test -- vehicle-image-upload.integration.spec.ts -t "Upload AVIF Image"
```

### Run with Coverage

```bash
npm test -- vehicle-image-upload.integration.spec.ts --coverage
```

### Watch Mode

```bash
npm test -- vehicle-image-upload.integration.spec.ts --watch
```

---

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

All tests passing! ✅

---

## What These Tests Prevent

These tests will catch regressions if:

1. **AVIF support is broken** - Tests will fail if AVIF files are rejected
2. **Rate limiting is re-enabled** - Bulk upload tests will fail
3. **File format validation changes** - Format-specific tests will catch issues
4. **Max upload limit changes** - 10-image tests will fail
5. **Authentication/Authorization breaks** - Ownership tests will fail
6. **File size limits change** - Size validation tests will fail
7. **Image URL generation changes** - URL format tests will catch it

---

## Implementation Details

### Test Image Buffers

The tests create minimal valid image buffers with correct magic bytes:

- **JPEG**: `FF D8 FF`
- **PNG**: `89 50 4E 47 0D 0A 1A 0A`
- **WebP**: `RIFF....WEBP`
- **AVIF**: `....ftypavif`

### Mock Strategy

- **VehicleService** is fully mocked
- **JwtAuthGuard** is mocked to simulate authenticated requests
- **File uploads** use in-memory buffers (no actual files)
- **Organization ID** is set to `org-123` for all tests

### File Filter Testing

The file filter in `vehicle.controller.ts` is tested to ensure:
- Only supported formats are accepted: `jpg`, `jpeg`, `png`, `webp`, `avif`
- Unsupported formats (e.g., `gif`) are rejected
- MIME type validation works correctly

---

## Related Files

- **Controller**: `/src/vehicle/vehicle.controller.ts`
- **Service**: `/src/vehicle/vehicle.service.ts`
- **Fixtures**: `/src/test/fixtures/vehicle.fixtures.ts`

---

## Bug Fixes Validated

These tests validate the fixes for:

1. **AVIF Support** - Added `avif` to the file filter regex
2. **Bulk Upload** - Added `@SkipThrottle()` decorator to the upload endpoint

If these regressions occur, the tests will immediately fail, preventing the bugs from reaching production.
