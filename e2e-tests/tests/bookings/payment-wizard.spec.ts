import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { VehicleHelper, TestVehicle } from '../../utils/vehicle-helper';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

/**
 * Payment Wizard E2E Tests
 *
 * Tests the complete 4-step booking wizard with payment integration:
 * Step 1: Booking Details (customer, vehicle, dates, locations)
 * Step 2: Review Booking
 * Step 3: Payment Processing
 * Step 4: Confirmation
 */
test.describe('Payment Wizard Integration', () => {
  let authHelper: AuthHelper;
  let vehicleHelper: VehicleHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let testVehicle: TestVehicle;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    vehicleHelper = new VehicleHelper();

    // Login first
    await authHelper.login(page, testEmail, testPassword);

    // Create a test vehicle for bookings
    testVehicle = await vehicleHelper.createTestVehicle(page, {
      make: 'PaymentTest',
      model: 'Wizard',
      year: 2024,
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test vehicle
    await vehicleHelper.cleanup(page);
  });

  test('should complete full payment wizard workflow (happy path)', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout for full workflow
    console.log('🚀 Test: Complete payment wizard workflow');

    // Navigate to new booking page
    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // ===================================================================
    // STEP 1: Booking Details
    // ===================================================================
    console.log('📝 Step 1: Filling booking details');

    // Wait for wizard header and form to load
    await expect(page.locator('h1:has-text("Create New Booking")')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/wizard-step1-start.png', fullPage: true });

    // Get available options
    const customerSelect = page.locator('select[name="customerId"]');
    const vehicleSelect = page.locator('select[name="vehicleId"]');
    const pickupLocationSelect = page.locator('select[name="pickupLocationId"]');
    const dropoffLocationSelect = page.locator('select[name="dropoffLocationId"]');

    await customerSelect.waitFor({ state: 'visible', timeout: 10000 });
    const customerOptions = await customerSelect.locator('option:not([value=""])').all();
    const locationOptions = await pickupLocationSelect.locator('option:not([value=""])').all();

    console.log(`Found ${customerOptions.length} customers, ${locationOptions.length} locations`);

    if (customerOptions.length < 1 || locationOptions.length < 1) {
      console.log('⚠️  Insufficient test data - skipping wizard test');
      test.skip();
    }

    // Create dates in the future
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 7); // 7 days from now
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setDate(dropoffDate.getDate() + 3); // 3-day rental
    dropoffDate.setHours(14, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Fill Step 1 form
    const firstCustomerId = await customerOptions[0].getAttribute('value');
    const firstLocationId = await locationOptions[0].getAttribute('value');

    await customerSelect.selectOption(firstCustomerId!);
    await vehicleSelect.selectOption(testVehicle.id);
    await pickupLocationSelect.selectOption(firstLocationId!);
    await dropoffLocationSelect.selectOption(firstLocationId!);

    await page.locator('input[name="pickupDatetime"]').fill(formatDateTime(pickupDate));
    await page.locator('input[name="dropoffDatetime"]').fill(formatDateTime(dropoffDate));

    await page.screenshot({ path: 'test-results/wizard-step1-filled.png', fullPage: true });

    // Click Next button
    await page.locator('button:has-text("Next: Review Details")').click();
    await page.waitForLoadState('networkidle');

    // ===================================================================
    // STEP 2: Review Booking
    // ===================================================================
    console.log('📋 Step 2: Reviewing booking details');

    // Wait for review page content to load
    await expect(page.locator('text=Review Your Booking')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/wizard-step2-review.png', fullPage: true });

    // Verify booking details are displayed
    await expect(page.locator('text=Review Your Booking')).toBeVisible();
    await expect(page.locator('text=Vehicle Details')).toBeVisible();
    await expect(page.locator('text=Rental Period')).toBeVisible();
    await expect(page.locator('text=Pricing Summary')).toBeVisible();

    // Verify test vehicle appears
    await expect(page.locator(`text=${testVehicle.make} ${testVehicle.model}`)).toBeVisible();

    // Click Next to proceed to payment
    await page.locator('button:has-text("Continue to Payment")').click();
    await page.waitForLoadState('networkidle');

    // ===================================================================
    // STEP 3: Payment
    // ===================================================================
    console.log('💳 Step 3: Processing payment');

    // Wait for payment form to load
    await expect(page.locator('text=Payment Information')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/wizard-step3-payment.png', fullPage: true });

    // Verify payment form is visible
    await expect(page.locator('text=Payment Information')).toBeVisible();

    // Fill mock payment card details
    const cardNumberInput = page.locator('input[name="cardNumber"]');
    const expiryInput = page.locator('input[name="expiry"]');
    const cvvInput = page.locator('input[name="cvv"]');
    const cardholderInput = page.locator('input[name="cardholderName"]');
    const termsCheckbox = page.locator('input[name="termsAccepted"]');

    await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 });

    // Use mock Stripe test card number
    await cardNumberInput.fill('4242424242424242');
    await expiryInput.fill('1225'); // Dec 2025
    await cvvInput.fill('123');
    await cardholderInput.fill('Test User');
    await termsCheckbox.check();

    await page.screenshot({ path: 'test-results/wizard-step3-filled.png', fullPage: true });

    // Submit payment
    console.log('💰 Submitting payment...');
    await page.locator('button:has-text("Pay Deposit")').click();

    // Wait for payment processing (with longer timeout)
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // ===================================================================
    // STEP 4: Confirmation
    // ===================================================================
    console.log('✅ Step 4: Verifying confirmation');

    // Should reach confirmation step
    await expect(page.locator('text=Booking Confirmed')).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/wizard-step4-confirmation.png', fullPage: true });

    // Verify confirmation details
    await expect(page.locator('text=Booking Number:')).toBeVisible();
    await expect(page.locator('text=Payment Confirmed')).toBeVisible();

    // Verify action buttons are present
    await expect(page.locator('button:has-text("View Booking Details")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Another Booking")')).toBeVisible();
    await expect(page.locator('button:has-text("Return to Dashboard")')).toBeVisible();

    console.log('✅ Complete payment wizard workflow succeeded!');
  });

  test('should allow editing from review step', async ({ page }) => {
    test.setTimeout(90000);
    console.log('🚀 Test: Edit booking from review step');

    // Navigate to new booking page
    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // Fill Step 1 (simplified)
    const customerSelect = page.locator('select[name="customerId"]');
    const vehicleSelect = page.locator('select[name="vehicleId"]');
    const pickupLocationSelect = page.locator('select[name="pickupLocationId"]');
    const dropoffLocationSelect = page.locator('select[name="dropoffLocationId"]');

    await customerSelect.waitFor({ state: 'visible', timeout: 10000 });
    const customerOptions = await customerSelect.locator('option:not([value=""])').all();
    const locationOptions = await pickupLocationSelect.locator('option:not([value=""])').all();

    if (customerOptions.length < 1 || locationOptions.length < 1) {
      test.skip();
    }

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setDate(dropoffDate.getDate() + 3);
    dropoffDate.setHours(14, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const firstCustomerId = await customerOptions[0].getAttribute('value');
    const firstLocationId = await locationOptions[0].getAttribute('value');

    await customerSelect.selectOption(firstCustomerId!);
    await vehicleSelect.selectOption(testVehicle.id);
    await pickupLocationSelect.selectOption(firstLocationId!);
    await dropoffLocationSelect.selectOption(firstLocationId!);

    await page.locator('input[name="pickupDatetime"]').fill(formatDateTime(pickupDate));
    await page.locator('input[name="dropoffDatetime"]').fill(formatDateTime(dropoffDate));

    // Go to Step 2
    await page.locator('button:has-text("Next: Review Details")').click();
    await page.waitForLoadState('networkidle');

    // Wait for review content
    await expect(page.locator('text=Review Your Booking')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/wizard-edit-before.png', fullPage: true });

    // Click Edit button to go back to Step 1
    console.log('🔙 Clicking Edit to return to Step 1');
    await page.locator('button:has-text("Edit")').click();
    await page.waitForLoadState('networkidle');

    // Should be back at Step 1 (verify form is visible)
    await expect(customerSelect).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/wizard-edit-returned.png', fullPage: true });

    // Verify form fields are still populated
    const selectedVehicle = await vehicleSelect.inputValue();
    expect(selectedVehicle).toBe(testVehicle.id);

    console.log('✅ Edit navigation works correctly!');
  });

  test('should display validation errors on Step 1', async ({ page }) => {
    test.setTimeout(60000);
    console.log('🚀 Test: Step 1 validation errors');

    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // Wait for form to load
    await expect(page.locator('h1:has-text("Create New Booking")')).toBeVisible({ timeout: 10000 });

    // Try to submit without filling required fields
    console.log('🔴 Attempting to submit empty form');
    await page.locator('button:has-text("Next: Review Details")').click();
    await page.waitForTimeout(1000);

    // Should see validation errors
    const errorMessages = page.locator('[role="alert"], .text-error-600, .text-red-600');
    const errorCount = await errorMessages.count();

    console.log(`Found ${errorCount} validation errors`);
    expect(errorCount).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/wizard-step1-validation.png', fullPage: true });

    console.log('✅ Validation errors displayed correctly!');
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    test.setTimeout(120000);
    console.log('🚀 Test: Payment failure handling');

    // Navigate to new booking page
    await page.goto('/bookings/new');
    await page.waitForLoadState('networkidle');

    // Fill Step 1 (simplified - reuse logic from happy path)
    const customerSelect = page.locator('select[name="customerId"]');
    const vehicleSelect = page.locator('select[name="vehicleId"]');
    const pickupLocationSelect = page.locator('select[name="pickupLocationId"]');
    const dropoffLocationSelect = page.locator('select[name="dropoffLocationId"]');

    await customerSelect.waitFor({ state: 'visible', timeout: 10000 });
    const customerOptions = await customerSelect.locator('option:not([value=""])').all();
    const locationOptions = await pickupLocationSelect.locator('option:not([value=""])').all();

    if (customerOptions.length < 1 || locationOptions.length < 1) {
      test.skip();
    }

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 7);
    pickupDate.setHours(10, 0, 0, 0);

    const dropoffDate = new Date(pickupDate);
    dropoffDate.setDate(dropoffDate.getDate() + 3);
    dropoffDate.setHours(14, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const firstCustomerId = await customerOptions[0].getAttribute('value');
    const firstLocationId = await locationOptions[0].getAttribute('value');

    await customerSelect.selectOption(firstCustomerId!);
    await vehicleSelect.selectOption(testVehicle.id);
    await pickupLocationSelect.selectOption(firstLocationId!);
    await dropoffLocationSelect.selectOption(firstLocationId!);

    await page.locator('input[name="pickupDatetime"]').fill(formatDateTime(pickupDate));
    await page.locator('input[name="dropoffDatetime"]').fill(formatDateTime(dropoffDate));

    // Go to Step 2
    await page.locator('button:has-text("Next: Review Details")').click();
    await page.waitForLoadState('networkidle');

    // Go to Step 3
    await page.locator('button:has-text("Continue to Payment")').click();
    await page.waitForLoadState('networkidle');

    // Wait for payment form
    await expect(page.locator('text=Payment Information')).toBeVisible({ timeout: 10000 });

    // Fill with invalid card number (test card that triggers decline)
    const cardNumberInput = page.locator('input[name="cardNumber"]');
    const expiryInput = page.locator('input[name="expiry"]');
    const cvvInput = page.locator('input[name="cvv"]');
    const cardholderInput = page.locator('input[name="cardholderName"]');
    const termsCheckbox = page.locator('input[name="termsAccepted"]');

    await cardNumberInput.waitFor({ state: 'visible', timeout: 10000 });

    // Use mock Stripe decline card
    await cardNumberInput.fill('4000000000000002'); // Card decline test number
    await expiryInput.fill('1225');
    await cvvInput.fill('123');
    await cardholderInput.fill('Test User');
    await termsCheckbox.check();

    await page.screenshot({ path: 'test-results/wizard-payment-before-fail.png', fullPage: true });

    // Submit payment (expect failure)
    console.log('💥 Submitting payment with decline card...');
    await page.locator('button:has-text("Pay Deposit")').click();

    // Wait for error message
    await page.waitForTimeout(3000);

    // Note: Mock payment processor might not support decline cards
    // This test verifies the UI can handle errors, but actual error may vary
    const errorVisible = await page.locator('text=payment failed, text=error, [role="alert"]').first().isVisible().catch(() => false);

    if (errorVisible) {
      console.log('✅ Payment error displayed correctly!');
      await page.screenshot({ path: 'test-results/wizard-payment-error.png', fullPage: true });
    } else {
      console.log('⚠️  Mock payment might not support decline cards - checking if still on Step 3');
      // Should still be on Step 3 if payment failed
      const stillOnStep3 = await page.locator('text=Step 3 of 4').isVisible();
      expect(stillOnStep3).toBeTruthy();
    }
  });
});
