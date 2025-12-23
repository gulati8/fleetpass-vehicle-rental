# FleetPass E2E Tests

Quick-win Playwright tests for vehicle image upload flow.

## Setup

1. **Update test credentials** in `.env.test`:
   ```bash
   TEST_USER_EMAIL=your-actual-email@example.com
   TEST_USER_PASSWORD=your-actual-password
   TEST_VEHICLE_ID=your-vehicle-id  # Use the Porsche 911 ID or any test vehicle
   ```

2. **Make sure Docker services are running**:
   ```bash
   cd /Users/amitgulati/Projects/FleetPass
   docker-compose up -d
   ```

3. **Create test-results directory**:
   ```bash
   cd /Users/amitgulati/Projects/FleetPass/e2e-tests
   mkdir -p test-results
   ```

## Running Tests

### Run all tests (headless):
```bash
cd /Users/amitgulati/Projects/FleetPass/e2e-tests
npm test
```

### Run tests in headed mode (see browser):
```bash
npm run test:headed
```

### Run specific test:
```bash
npx playwright test tests/vehicles/upload-single-image.spec.ts
```

### Debug mode (step through test):
```bash
npm run test:debug
```

## What Tests Do

**Test 1: Upload Single Image**
- ✅ Logs in with your credentials
- ✅ Navigates to vehicle edit page
- ✅ Uploads a test car image
- ✅ Verifies no upload errors
- ✅ **CRITICAL**: Verifies images display on page
- ✅ Verifies image URL is accessible
- ✅ Saves vehicle and verifies image persists

**Test 2: Verify Upload Button Appears**
- ✅ Checks that upload button shows (not "Save Vehicle First" message)
- ✅ Confirms the vehicleId prop fix worked

## Test Results

After running tests:
- **Screenshots**: Check `test-results/` directory
  - `01-before-upload.png` - Page before upload
  - `02-after-upload.png` - Page after upload attempt
  - `03-final.png` - Final state
- **Videos**: Automatically recorded on failure
- **Console logs**: Detailed step-by-step output

## Troubleshooting

**Test fails with "Upload button not visible"**:
- Frontend might not be running
- Check: `docker-compose logs frontend`

**Test fails with "Unexpected field" error**:
- Backend field name mismatch
- Check backend logs: `docker-compose logs backend`

**Images don't display (current issue)**:
- This is what we're testing for!
- Check screenshots in test-results/
- Look for image src URLs in console output
- Verify image URLs are accessible

## Current Issue Being Diagnosed

The test will help us identify why images upload successfully but don't display on the page. Look for:
- Are image URLs being returned from the API?
- Are images rendering in the DOM?
- Are image URLs accessible (404 vs 200)?
- Is it a frontend display issue or backend URL issue?
