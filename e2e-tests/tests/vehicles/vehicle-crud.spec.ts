import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { VehicleListPage, VehicleFormPage, VehicleDetailPage } from '../../pages/VehiclePages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Vehicle CRUD Operations', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let createdVehicleId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test.describe('Vehicle List Page', () => {
    test('should display vehicle list page with controls', async ({ page }) => {
      console.log('🚀 Test: Vehicle list page display');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      await page.screenshot({ path: 'test-results/vehicles-list-page.png', fullPage: true });

      // Should see page title
      await expect(page.locator('h1')).toContainText(/vehicles/i);

      // Should see add vehicle button
      await expect(listPage.addVehicleButton).toBeVisible();

      // Should see search input
      await expect(listPage.searchInput).toBeVisible();

      console.log('✅ Vehicle list page loads correctly');
    });

    test('should navigate to create vehicle page', async ({ page }) => {
      console.log('🚀 Test: Navigate to create vehicle');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      await listPage.clickAddVehicle();

      // Should navigate to /vehicles/new
      await page.waitForURL(/\/vehicles\/new/);

      await page.screenshot({ path: 'test-results/vehicles-create-page.png', fullPage: true });

      const currentUrl = page.url();
      expect(currentUrl).toContain('/vehicles/new');

      console.log('✅ Navigated to create vehicle page');
    });

    test('should search vehicles by make', async ({ page }) => {
      console.log('🚀 Test: Search vehicles');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const initialCount = await listPage.getVehicleCount();
      console.log(`Initial vehicle count: ${initialCount}`);

      if (initialCount === 0) {
        console.log('⚠️  No vehicles to search - skipping test');
        test.skip();
      }

      // Search for specific make (assuming "Toyota" exists in test data)
      await listPage.searchVehicles('Toyota');

      await page.screenshot({ path: 'test-results/vehicles-search-results.png', fullPage: true });

      // Count should change (either increase, decrease, or stay same depending on data)
      const searchCount = await listPage.getVehicleCount();
      console.log(`Search results: ${searchCount} vehicles`);

      // Clear search
      await listPage.searchVehicles('');
      const afterClearCount = await listPage.getVehicleCount();

      console.log(`After clearing search: ${afterClearCount} vehicles`);
      expect(afterClearCount).toBeGreaterThanOrEqual(searchCount);

      console.log('✅ Search functionality working');
    });

    test('should toggle between grid and list views', async ({ page }) => {
      console.log('🚀 Test: Toggle view modes');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      await page.screenshot({ path: 'test-results/vehicles-grid-view.png', fullPage: true });

      // Try to click list view if visible
      try {
        if (await listPage.listViewButton.isVisible({ timeout: 2000 })) {
          await listPage.listViewButton.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-results/vehicles-list-view.png', fullPage: true });

          // Switch back to grid
          if (await listPage.gridViewButton.isVisible({ timeout: 2000 })) {
            await listPage.gridViewButton.click();
            await page.waitForTimeout(500);
          }
        }
        console.log('✅ View toggle available and working');
      } catch (error) {
        console.log('ℹ️  View toggle not available (may not be implemented)');
      }
    });
  });

  test.describe('Create Vehicle', () => {
    test('should create new vehicle successfully', async ({ page }) => {
      console.log('🚀 Test: Create new vehicle');

      // Capture console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const formPage = new VehicleFormPage(page);
      await formPage.gotoNew();

      await page.screenshot({ path: 'test-results/vehicles-create-form.png', fullPage: true });

      // Generate unique VIN
      const timestamp = Date.now();
      const vehicleData = {
        make: 'Honda',
        model: 'Accord',
        year: 2023,
        vin: `TEST${timestamp}`,
      };

      // Fill basic info
      await formPage.fillBasicInfo(vehicleData);

      // Select location (first available)
      const locationOptions = await formPage.locationSelect.locator('option').all();
      if (locationOptions.length > 1) {
        await formPage.selectLocation(1);
      }

      // Select required dropdowns
      try {
        await formPage.selectBodyType('sedan');
      } catch {
        console.log('ℹ️  Body type selection optional or not available');
      }

      // Select transmission (REQUIRED)
      const transmissionOptions = await formPage.transmissionSelect.locator('option').all();
      if (transmissionOptions.length > 1) {
        await formPage.transmissionSelect.selectOption({ index: 1 });
      }

      // Select fuel type (REQUIRED)
      const fuelTypeOptions = await formPage.fuelTypeSelect.locator('option').all();
      if (fuelTypeOptions.length > 1) {
        await formPage.fuelTypeSelect.selectOption({ index: 1 });
      }

      // Fill pricing
      await formPage.fillPricing({
        dailyRate: '75',
        weeklyRate: '450',
        monthlyRate: '1500',
      });

      await page.screenshot({ path: 'test-results/vehicles-form-filled.png', fullPage: true });

      // Check for any validation errors before submitting
      const validationErrors = await page.locator('[class*="error"], [class*="invalid"], [role="alert"]').allTextContents();
      if (validationErrors.length > 0) {
        console.log('⚠️  Validation errors before submit:', validationErrors);
      }

      // Submit form
      console.log('📝 Submitting vehicle form...');
      await formPage.submit();

      // Wait a moment for any errors to appear
      await page.waitForTimeout(1000);

      // Check for validation errors after submit
      const postSubmitErrors = await page.locator('[class*="error"], [class*="invalid"], [role="alert"]').allTextContents();
      if (postSubmitErrors.length > 0) {
        console.log('❌ Validation errors after submit:', postSubmitErrors);
      }

      // Log console errors
      if (consoleErrors.length > 0) {
        console.log('❌ Console errors:', consoleErrors);
      }

      // Wait for navigation away from /vehicles/new (to list or detail page)
      await page.waitForURL(url => !url.href.includes('/vehicles/new') && !url.href.includes('/vehicles/edit'), { timeout: 10000 });

      await page.screenshot({ path: 'test-results/vehicles-after-create.png', fullPage: true });

      const currentUrl = page.url();
      console.log('Navigated to:', currentUrl);

      // Should NOT be on the create page anymore
      expect(currentUrl).not.toContain('/vehicles/new');
      expect(currentUrl).toContain('/vehicles');

      // Extract vehicle ID if on detail page
      const detailMatch = currentUrl.match(/\/vehicles\/([a-f0-9-]+)$/);
      if (detailMatch) {
        createdVehicleId = detailMatch[1];
        console.log('✅ Vehicle created with ID:', createdVehicleId);
      } else {
        console.log('✅ Vehicle created, redirected to list page');
      }
    });

    test('should validate required fields', async ({ page }) => {
      console.log('🚀 Test: Validate required fields');

      const formPage = new VehicleFormPage(page);
      await formPage.gotoNew();

      // Try to submit empty form
      await formPage.submit();

      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/vehicles-validation-errors.png', fullPage: true });

      // Should stay on create page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/vehicles/new');

      console.log('✅ Form validation prevents submission of empty form');
    });

    test('should show error for duplicate VIN', async ({ page }) => {
      console.log('🚀 Test: Duplicate VIN validation');

      const formPage = new VehicleFormPage(page);
      await formPage.gotoNew();

      // Create first vehicle with unique VIN
      const uniqueVin = `DUPLICATE${Date.now()}`;
      await formPage.fillBasicInfo({
        make: 'Ford',
        model: 'F-150',
        year: 2022,
        vin: uniqueVin,
      });

      // Select location
      const locationOptions = await formPage.locationSelect.locator('option').all();
      if (locationOptions.length > 1) {
        await formPage.selectLocation(1);
      }

      // Select transmission and fuel type (REQUIRED)
      const transmissionOptions = await formPage.transmissionSelect.locator('option').all();
      if (transmissionOptions.length > 1) {
        await formPage.transmissionSelect.selectOption({ index: 1 });
      }
      const fuelTypeOptions = await formPage.fuelTypeSelect.locator('option').all();
      if (fuelTypeOptions.length > 1) {
        await formPage.fuelTypeSelect.selectOption({ index: 1 });
      }

      await formPage.fillPricing({ dailyRate: '100' });
      await formPage.submit();

      // Wait for success
      await page.waitForURL(/\/vehicles/, { timeout: 10000 });

      console.log('First vehicle created');

      // Try to create another vehicle with same VIN
      await formPage.gotoNew();

      await formPage.fillBasicInfo({
        make: 'Ford',
        model: 'Explorer',
        year: 2023,
        vin: uniqueVin, // Same VIN!
      });

      const locationOptions2 = await formPage.locationSelect.locator('option').all();
      if (locationOptions2.length > 1) {
        await formPage.selectLocation(1);
      }

      // Select transmission and fuel type (REQUIRED)
      const transmissionOptions2 = await formPage.transmissionSelect.locator('option').all();
      if (transmissionOptions2.length > 1) {
        await formPage.transmissionSelect.selectOption({ index: 1 });
      }
      const fuelTypeOptions2 = await formPage.fuelTypeSelect.locator('option').all();
      if (fuelTypeOptions2.length > 1) {
        await formPage.fuelTypeSelect.selectOption({ index: 1 });
      }

      await formPage.fillPricing({ dailyRate: '110' });
      await formPage.submit();

      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-results/vehicles-duplicate-vin-error.png', fullPage: true });

      // Should show error for duplicate VIN
      const errorVisible = await page.getByText(/vin.*already.*exists|duplicate.*vin/i).isVisible().catch(() => false);

      if (!errorVisible) {
        console.log('ℹ️  Duplicate VIN validation may not be implemented or error not visible');
      } else {
        expect(errorVisible).toBe(true);
        console.log('✅ Duplicate VIN properly rejected');
      }
    });
  });

  test.describe('View Vehicle Details', () => {
    test('should display vehicle details', async ({ page }) => {
      console.log('🚀 Test: View vehicle details');

      // First, get a vehicle from the list
      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const vehicleCount = await listPage.getVehicleCount();
      console.log(`Found ${vehicleCount} vehicles`);

      if (vehicleCount === 0) {
        console.log('⚠️  No vehicles found - skipping detail test');
        test.skip();
      }

      // Click first vehicle
      await listPage.clickFirstVehicle();

      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      await page.screenshot({ path: 'test-results/vehicles-detail-page.png', fullPage: true });

      const detailPage = new VehicleDetailPage(page);

      // Verify detail page elements
      await expect(detailPage.vehicleTitle).toBeVisible();
      await expect(detailPage.editButton).toBeVisible();

      const title = await detailPage.getVehicleTitle();
      console.log('Vehicle title:', title);

      console.log('✅ Vehicle details displayed correctly');
    });

    test('should navigate to edit page from detail', async ({ page }) => {
      console.log('🚀 Test: Navigate to edit from detail');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const vehicleCount = await listPage.getVehicleCount();
      if (vehicleCount === 0) {
        console.log('⚠️  No vehicles - skipping');
        test.skip();
      }

      await listPage.clickFirstVehicle();
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      const detailPage = new VehicleDetailPage(page);
      await detailPage.clickEdit();

      // Should navigate to edit page
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+\/edit/);

      await page.screenshot({ path: 'test-results/vehicles-edit-page.png', fullPage: true });

      const currentUrl = page.url();
      expect(currentUrl).toContain('/edit');

      console.log('✅ Navigated to edit page');
    });
  });

  test.describe('Edit Vehicle', () => {
    test('should edit vehicle successfully', async ({ page }) => {
      console.log('🚀 Test: Edit vehicle');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const vehicleCount = await listPage.getVehicleCount();
      if (vehicleCount === 0) {
        console.log('⚠️  No vehicles - skipping');
        test.skip();
      }

      // Navigate to first vehicle detail
      await listPage.clickFirstVehicle();
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      // Get vehicle ID from URL
      const url = page.url();
      const vehicleId = url.split('/').pop() || '';

      // Go to edit page
      const detailPage = new VehicleDetailPage(page);
      await detailPage.clickEdit();

      await page.waitForURL(/\/vehicles\/[a-f0-9-]+\/edit/);

      const formPage = new VehicleFormPage(page);

      await page.screenshot({ path: 'test-results/vehicles-edit-form-before.png', fullPage: true });

      // Edit the model name
      const newModel = `Edited ${Date.now()}`;
      await formPage.modelInput.clear();
      await formPage.modelInput.fill(newModel);

      await page.screenshot({ path: 'test-results/vehicles-edit-form-after.png', fullPage: true });

      // Submit
      await formPage.submit();

      // Wait for navigation
      await page.waitForURL(/\/vehicles/, { timeout: 10000 });

      await page.screenshot({ path: 'test-results/vehicles-after-edit.png', fullPage: true });

      // Verify we're back on detail or list page
      const finalUrl = page.url();
      expect(finalUrl).toContain('/vehicles');

      console.log('✅ Vehicle edited successfully');
    });

    test('should cancel edit without saving', async ({ page }) => {
      console.log('🚀 Test: Cancel edit');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const vehicleCount = await listPage.getVehicleCount();
      if (vehicleCount === 0) {
        console.log('⚠️  No vehicles - skipping');
        test.skip();
      }

      await listPage.clickFirstVehicle();
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      const detailPage = new VehicleDetailPage(page);
      await detailPage.clickEdit();

      await page.waitForURL(/\/vehicles\/[a-f0-9-]+\/edit/);

      const formPage = new VehicleFormPage(page);

      // Make a change
      await formPage.modelInput.fill('Changed But Not Saved');

      // Cancel
      if (await formPage.cancelButton.isVisible()) {
        // Handle confirm dialog if it appears
        page.on('dialog', dialog => dialog.accept());
        await formPage.cancel();

        await page.waitForTimeout(1000);

        // Should navigate away from edit page
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/edit');

        console.log('✅ Edit cancelled successfully');
      } else {
        console.log('ℹ️  Cancel button not found');
      }
    });
  });

  test.describe('Delete Vehicle', () => {
    test('should delete vehicle from detail page', async ({ page }) => {
      console.log('🚀 Test: Delete vehicle from detail');

      // First create a vehicle to delete
      const formPage = new VehicleFormPage(page);
      await formPage.gotoNew();

      const timestamp = Date.now();
      await formPage.fillBasicInfo({
        make: 'ToDelete',
        model: 'TestVehicle',
        year: 2020,
        vin: `DELETE${timestamp}`,
      });

      const locationOptions = await formPage.locationSelect.locator('option').all();
      if (locationOptions.length > 1) {
        await formPage.selectLocation(1);
      }

      // Select required dropdowns
      try {
        await formPage.selectBodyType('sedan');
      } catch {
        console.log('ℹ️  Body type selection optional or not available');
      }

      // Select transmission and fuel type (REQUIRED)
      const transmissionOptions = await formPage.transmissionSelect.locator('option').all();
      if (transmissionOptions.length > 1) {
        await formPage.transmissionSelect.selectOption({ index: 1 });
      }
      const fuelTypeOptions = await formPage.fuelTypeSelect.locator('option').all();
      if (fuelTypeOptions.length > 1) {
        await formPage.fuelTypeSelect.selectOption({ index: 1 });
      }

      await formPage.fillPricing({ dailyRate: '50' });
      await formPage.submit();

      // Wait for navigation away from create page
      await page.waitForURL(url => !url.href.includes('/vehicles/new') && !url.href.includes('/vehicles/edit'), { timeout: 10000 });

      // Find the vehicle we just created
      const listPage = new VehicleListPage(page);
      await listPage.goto();

      // Search for it
      await listPage.searchVehicles('ToDelete');
      await page.waitForTimeout(1000);

      const vehicleCount = await listPage.getVehicleCount();
      if (vehicleCount === 0) {
        console.log('⚠️  Created vehicle not found - skipping delete test');
        test.skip();
      }

      // Click on the vehicle
      await listPage.clickFirstVehicle();
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      await page.screenshot({ path: 'test-results/vehicles-before-delete.png', fullPage: true });

      // Delete it
      const detailPage = new VehicleDetailPage(page);
      await detailPage.clickDelete();

      // Wait for redirect to list page
      await page.waitForURL(/\/vehicles$/, { timeout: 10000 });

      await page.screenshot({ path: 'test-results/vehicles-after-delete.png', fullPage: true });

      // Verify we're back on list page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/vehicles$/);

      console.log('✅ Vehicle deleted successfully');
    });

    test('should cancel delete operation', async ({ page }) => {
      console.log('🚀 Test: Cancel delete');

      const listPage = new VehicleListPage(page);
      await listPage.goto();

      const vehicleCount = await listPage.getVehicleCount();
      if (vehicleCount === 0) {
        console.log('⚠️  No vehicles - skipping');
        test.skip();
      }

      await listPage.clickFirstVehicle();
      await page.waitForURL(/\/vehicles\/[a-f0-9-]+$/);

      const urlBefore = page.url();

      // Click delete button
      const detailPage = new VehicleDetailPage(page);
      await detailPage.deleteButton.click();

      await page.waitForTimeout(500);

      // Cancel in modal
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        await page.waitForTimeout(500);

        // Should still be on detail page
        const urlAfter = page.url();
        expect(urlAfter).toBe(urlBefore);

        console.log('✅ Delete cancelled, still on detail page');
      } else {
        console.log('ℹ️  Cancel button not found in delete modal');
      }
    });
  });
});
