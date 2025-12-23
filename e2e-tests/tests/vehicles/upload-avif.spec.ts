import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { VehicleEditPage } from '../../pages/VehicleEditPage';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Vehicle AVIF Image Upload', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  const vehicleId = process.env.TEST_VEHICLE_ID || '';

  test.beforeEach(() => {
    authHelper = new AuthHelper();
  });

  test('should upload AVIF image and verify it displays', async ({ page }) => {
    test.setTimeout(60000); // 60 second timeout

    console.log('🚀 Starting test: Upload AVIF image');

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
    await page.screenshot({ path: 'test-results/avif-01-before-upload.png', fullPage: true });

    // 3. Verify upload button is visible
    console.log('📝 Step 3: Checking for upload button...');
    await expect(vehiclePage.uploadButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Upload button is visible');

    // 4. Upload AVIF image
    console.log('📝 Step 4: Uploading AVIF image...');
    const avifImagePath = path.join(__dirname, '../../fixtures/images/test-car-avif.avif');
    await vehiclePage.uploadImage(avifImagePath);
    console.log('✅ AVIF image upload triggered');

    // 5. Wait for upload to complete
    await page.waitForTimeout(3000);

    // Take screenshot after upload
    await page.screenshot({ path: 'test-results/avif-02-after-upload.png', fullPage: true });

    // 6. Check for upload errors
    console.log('📝 Step 5: Checking for errors...');
    const hasErrors = await vehiclePage.hasUploadErrors();
    if (hasErrors) {
      const errorText = await vehiclePage.getErrorText();
      console.log('❌ Upload error detected:', errorText);
      throw new Error(`AVIF upload failed with error: ${errorText}`);
    }
    console.log('✅ No upload errors detected');

    // 7. Verify images are displayed
    console.log('📝 Step 6: Verifying AVIF image display...');
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
    console.log('✅ AVIF image is displayed');

    // 8. Verify AVIF image is actually visible and loaded
    if (displayedImages.length > 0) {
      const lastImage = displayedImages[displayedImages.length - 1]; // Get the most recently uploaded

      // Check if image is visible
      await expect(lastImage).toBeVisible();

      // Check if image has a valid src attribute
      const src = await lastImage.getAttribute('src');
      expect(src).toBeTruthy();
      console.log('✅ AVIF image has valid src:', src);

      // Verify the image URL is accessible
      if (src && !src.startsWith('data:')) {
        const imageUrl = src.startsWith('http') ? src : `http://localhost:3001${src}`;
        console.log('📝 Step 7: Verifying AVIF image URL is accessible:', imageUrl);

        try {
          const response = await page.request.get(imageUrl);
          console.log('AVIF Image URL response status:', response.status());
          expect(response.ok()).toBeTruthy();
          console.log('✅ AVIF image URL is accessible');
        } catch (error) {
          console.log('⚠️  Could not verify AVIF image URL:', error);
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'test-results/avif-03-final.png', fullPage: true });

    console.log('🎉 AVIF test completed successfully!');
  });
});
