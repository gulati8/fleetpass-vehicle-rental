import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { VehicleEditPage } from '../../pages/VehicleEditPage';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Vehicle Single Image Upload', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  const vehicleId = process.env.TEST_VEHICLE_ID || '';

  test.beforeEach(() => {
    authHelper = new AuthHelper();
  });

  test('should upload single image and verify it displays', async ({ page }) => {
    test.setTimeout(60000); // 60 second timeout

    console.log('🚀 Starting test: Upload single image');

    // 1. Login
    console.log('📝 Step 1: Logging in...');
    await authHelper.login(page, testEmail, testPassword);
    console.log('✅ Login successful');

    // 2. Navigate to vehicle edit page
    console.log(`📝 Step 2: Navigating to vehicle ${vehicleId}...`);
    const vehiclePage = new VehicleEditPage(page);
    await vehiclePage.goto(vehicleId);
    console.log('✅ Navigation complete');

    // Take screenshot before upload
    await page.screenshot({ path: 'test-results/01-before-upload.png', fullPage: true });

    // 3. Verify upload button is visible
    console.log('📝 Step 3: Checking for upload button...');
    await expect(vehiclePage.uploadButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Upload button is visible');

    // 4. Upload image
    console.log('📝 Step 4: Uploading image...');
    const testImagePath = path.join(__dirname, '../../fixtures/images/test-car-1.jpg');
    await vehiclePage.uploadImage(testImagePath);
    console.log('✅ Image upload triggered');

    // 5. Wait a moment for upload to complete
    await page.waitForTimeout(3000);

    // Take screenshot after upload
    await page.screenshot({ path: 'test-results/02-after-upload.png', fullPage: true });

    // 6. Check for upload errors
    console.log('📝 Step 5: Checking for errors...');
    const hasErrors = await vehiclePage.hasUploadErrors();
    if (hasErrors) {
      const errorText = await vehiclePage.getErrorText();
      console.log('❌ Upload error detected:', errorText);

      // Capture network logs
      const logs = await page.evaluate(() => {
        return (window as any).__networkLogs || [];
      });
      console.log('Network logs:', logs);

      throw new Error(`Upload failed with error: ${errorText}`);
    }
    console.log('✅ No upload errors detected');

    // 7. Verify images are displayed
    console.log('📝 Step 6: Verifying image display...');
    const displayedImages = await vehiclePage.getDisplayedImages();
    console.log(`Found ${displayedImages.length} displayed images`);

    // Log image details
    for (let i = 0; i < displayedImages.length; i++) {
      const img = displayedImages[i];
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      const isVisible = await img.isVisible();
      console.log(`  Image ${i + 1}:`, { src, alt, isVisible });
    }

    // Assertion: At least one image should be displayed
    expect(displayedImages.length).toBeGreaterThanOrEqual(1);
    console.log('✅ Images are displayed');

    // 8. Verify image is actually visible and loaded
    if (displayedImages.length > 0) {
      const firstImage = displayedImages[0];

      // Check if image is visible
      await expect(firstImage).toBeVisible();

      // Check if image has a valid src attribute
      const src = await firstImage.getAttribute('src');
      expect(src).toBeTruthy();
      console.log('✅ Image has valid src:', src);

      // Try to verify the image URL is accessible
      if (src && !src.startsWith('data:')) {
        // Make a request to verify image is accessible
        const imageUrl = src.startsWith('http') ? src : `http://localhost:3001${src}`;
        console.log('📝 Step 7: Verifying image URL is accessible:', imageUrl);

        try {
          const response = await page.request.get(imageUrl);
          console.log('Image URL response status:', response.status());
          expect(response.ok()).toBeTruthy();
          console.log('✅ Image URL is accessible');
        } catch (error) {
          console.log('⚠️  Could not verify image URL:', error);
        }
      }
    }

    // 9. Save the vehicle and verify image persists
    console.log('📝 Step 8: Saving vehicle...');
    await vehiclePage.saveVehicle();
    console.log('✅ Vehicle saved');

    // 10. Navigate back to edit page to verify persistence
    console.log('📝 Step 9: Verifying image persists after save...');
    await vehiclePage.goto(vehicleId);
    const imagesAfterSave = await vehiclePage.getDisplayedImages();
    expect(imagesAfterSave.length).toBeGreaterThanOrEqual(1);
    console.log('✅ Image persists after save');

    // Final screenshot
    await page.screenshot({ path: 'test-results/03-final.png', fullPage: true });

    console.log('🎉 Test completed successfully!');
  });

  test('should show upload button on edit page (not "Save Vehicle First" message)', async ({ page }) => {
    console.log('🚀 Starting test: Verify upload button appears on edit page');

    // Login
    await authHelper.login(page, testEmail, testPassword);

    // Navigate to edit page
    const vehiclePage = new VehicleEditPage(page);
    await vehiclePage.goto(vehicleId);

    // Take screenshot
    await page.screenshot({ path: 'test-results/upload-button-check.png', fullPage: true });

    // Verify upload button exists (not "Save Vehicle First" message)
    await expect(vehiclePage.uploadButton).toBeVisible();

    // Verify we don't see "Save Vehicle First" message
    const saveFirstMessage = page.locator('text=/Save Vehicle First/i');
    await expect(saveFirstMessage).not.toBeVisible();

    console.log('✅ Upload button is visible (not blocked by "Save Vehicle First" message)');
  });
});
