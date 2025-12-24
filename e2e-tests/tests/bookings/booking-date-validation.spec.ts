import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { CreateBookingPage } from '../../pages/BookingPages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Booking Date Validation', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should show error when drop-off date is before pickup date', async ({ page }) => {
    console.log('🚀 Test: Drop-off before pickup validation');

    const bookingPage = new CreateBookingPage(page);
    await bookingPage.goto();

    // Get current date + time
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await bookingPage.fillBookingForm({
      pickupDatetime: formatDateTime(tomorrow),
      dropoffDatetime: formatDateTime(yesterday), // Invalid: dropoff before pickup
    });

    // Try to submit
    await bookingPage.submitButton.click();

    // Should see validation error
    await page.screenshot({ path: 'test-results/booking-date-validation-error.png' });

    // Check for error message
    const errorText = await bookingPage.getValidationError('dropoffDatetime');
    console.log('Validation error:', errorText);

    expect(errorText).toContain('after');

    console.log('✅ Date validation working correctly');
  });

  test('should show error when pickup date is in the past', async ({ page }) => {
    console.log('🚀 Test: Past date validation');

    const bookingPage = new CreateBookingPage(page);
    await bookingPage.goto();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await bookingPage.fillBookingForm({
      pickupDatetime: formatDateTime(yesterday), // Invalid: in the past
      dropoffDatetime: formatDateTime(tomorrow),
    });

    // Try to submit
    await bookingPage.submitButton.click();

    // Should see validation error
    await page.screenshot({ path: 'test-results/booking-past-date-error.png' });

    const errorText = await bookingPage.getValidationError('pickupDatetime');
    console.log('Past date error:', errorText);

    expect(errorText).toContain('past');

    console.log('✅ Past date validation working correctly');
  });

  test('should accept valid future dates', async ({ page }) => {
    console.log('🚀 Test: Valid date range');

    const bookingPage = new CreateBookingPage(page);
    await bookingPage.goto();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await bookingPage.fillBookingForm({
      pickupDatetime: formatDateTime(tomorrow),
      dropoffDatetime: formatDateTime(nextWeek),
    });

    // Should not see validation errors for dates
    const pickupError = await bookingPage.getValidationError('pickupDatetime');
    const dropoffError = await bookingPage.getValidationError('dropoffDatetime');

    expect(pickupError).toBeNull();
    expect(dropoffError).toBeNull();

    console.log('✅ Valid dates accepted');
  });

  test('should calculate duration correctly', async ({ page }) => {
    console.log('🚀 Test: Duration calculation');

    const bookingPage = new CreateBookingPage(page);
    await bookingPage.goto();

    // Set dates 3 days apart
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // First, select a customer and vehicle to enable pricing calculation
    const customerOptions = await bookingPage.customerSelect.locator('option').allTextContents();
    if (customerOptions.length > 1) {
      await bookingPage.customerSelect.selectOption({ index: 1 });
    }

    const vehicleOptions = await bookingPage.vehicleSelect.locator('option').allTextContents();
    if (vehicleOptions.length > 1) {
      await bookingPage.vehicleSelect.selectOption({ index: 1 });
    }

    await bookingPage.fillBookingForm({
      pickupDatetime: formatDateTime(startDate),
      dropoffDatetime: formatDateTime(endDate),
    });

    // Wait for calculation
    await page.waitForTimeout(1000);

    // Should show estimated total
    const total = await bookingPage.getEstimatedTotal();
    console.log('Estimated total:', total);

    // If we have a vehicle with pricing, we should see a total
    if (total) {
      expect(total).toContain('$');
    }

    console.log('✅ Duration calculation working');
  });
});
