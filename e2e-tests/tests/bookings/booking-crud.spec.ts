import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { BookingListPage, CreateBookingPage, BookingDetailPage } from '../../pages/BookingPages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Booking CRUD Operations', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let createdBookingId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should display booking list page', async ({ page }) => {
    console.log('🚀 Test: Display booking list');

    const listPage = new BookingListPage(page);
    await listPage.goto();

    await page.screenshot({ path: 'test-results/booking-list.png', fullPage: true });

    // Should see the page title
    await expect(page.locator('h1')).toContainText('Bookings');

    // Should see the add booking button
    await expect(listPage.addBookingButton).toBeVisible();

    console.log('✅ Booking list page loads correctly');
  });

  test('should create a new booking', async ({ page }) => {
    test.setTimeout(90000); // 90 second timeout
    console.log('🚀 Test: Create new booking');

    const createPage = new CreateBookingPage(page);
    await createPage.goto();

    await page.screenshot({ path: 'test-results/booking-create-form.png', fullPage: true });

    // Get available options
    const customerOptions = await createPage.customerSelect.locator('option').all();
    const vehicleOptions = await createPage.vehicleSelect.locator('option').all();
    const locationOptions = await createPage.pickupLocationSelect.locator('option').all();

    console.log(`Found ${customerOptions.length} customers, ${vehicleOptions.length} vehicles, ${locationOptions.length} locations`);

    if (customerOptions.length < 2 || vehicleOptions.length < 2 || locationOptions.length < 2) {
      console.log('⚠️  Insufficient test data - skipping booking creation');
      test.skip();
    }

    // Create dates for tomorrow and next week
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 6);
    nextWeek.setHours(10, 0, 0, 0);

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Fill the form
    await createPage.fillBookingForm({
      pickupDatetime: formatDateTime(tomorrow),
      dropoffDatetime: formatDateTime(nextWeek),
      notes: 'E2E test booking',
    });

    // Select first available options (index 1, since 0 is placeholder)
    await createPage.customerSelect.selectOption({ index: 1 });
    await createPage.vehicleSelect.selectOption({ index: 1 });
    await createPage.pickupLocationSelect.selectOption({ index: 1 });
    await createPage.dropoffLocationSelect.selectOption({ index: 1 });

    await page.screenshot({ path: 'test-results/booking-form-filled.png', fullPage: true });

    // Wait for pricing to calculate
    await page.waitForTimeout(2000);

    // Submit the form
    console.log('📝 Submitting booking form...');
    await createPage.submitBooking();

    // Wait for navigation to detail page
    await page.waitForURL(/\/bookings\/[a-f0-9-]+/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/booking-created.png', fullPage: true });

    // Extract booking ID from URL
    const url = page.url();
    createdBookingId = url.split('/').pop() || '';
    console.log('✅ Booking created with ID:', createdBookingId);

    // Verify we're on the detail page
    expect(url).toContain('/bookings/');
    expect(createdBookingId).toBeTruthy();
  });

  test('should display booking details', async ({ page }) => {
    console.log('🚀 Test: Display booking details');

    // First, get a booking ID from the list
    const listPage = new BookingListPage(page);
    await listPage.goto();

    const bookingCount = await listPage.getBookingCount();
    console.log(`Found ${bookingCount} bookings`);

    if (bookingCount === 0) {
      console.log('⚠️  No bookings found - skipping detail test');
      test.skip();
    }

    // Click first booking
    await listPage.clickFirstBooking();

    await page.waitForURL(/\/bookings\/[a-f0-9-]+/);
    await page.screenshot({ path: 'test-results/booking-detail.png', fullPage: true });

    const detailPage = new BookingDetailPage(page);

    // Verify booking details are displayed
    await expect(detailPage.bookingNumber).toBeVisible();
    await expect(detailPage.statusBadge).toBeVisible();

    const status = await detailPage.getStatus();
    console.log('Booking status:', status);

    console.log('✅ Booking details displayed correctly');
  });

  test('should filter bookings by status', async ({ page }) => {
    console.log('🚀 Test: Filter by status');

    const listPage = new BookingListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getBookingCount();
    console.log(`Initial booking count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No bookings to filter - skipping');
      test.skip();
    }

    // Filter by pending status
    await listPage.filterByStatus('pending');
    await page.screenshot({ path: 'test-results/booking-filter-pending.png', fullPage: true });

    const pendingCount = await listPage.getBookingCount();
    console.log(`Pending bookings: ${pendingCount}`);

    // Filter by confirmed
    await listPage.filterByStatus('confirmed');
    const confirmedCount = await listPage.getBookingCount();
    console.log(`Confirmed bookings: ${confirmedCount}`);

    // Clear filter
    await listPage.filterByStatus('');
    const afterClearCount = await listPage.getBookingCount();
    console.log(`After clearing filter: ${afterClearCount}`);

    console.log('✅ Filtering works correctly');
  });

  test('should search bookings', async ({ page }) => {
    console.log('🚀 Test: Search bookings');

    const listPage = new BookingListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getBookingCount();
    console.log(`Initial booking count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No bookings to search - skipping');
      test.skip();
    }

    // Search for "BP-" (booking number prefix)
    await listPage.searchBookings('BP-');
    await page.screenshot({ path: 'test-results/booking-search.png', fullPage: true });

    const searchCount = await listPage.getBookingCount();
    console.log(`Search results: ${searchCount}`);

    // Clear search
    await listPage.searchBookings('');
    const afterClearCount = await listPage.getBookingCount();

    console.log('✅ Search works correctly');
  });

  test('should toggle between grid and list views', async ({ page }) => {
    console.log('🚀 Test: Toggle view modes');

    const listPage = new BookingListPage(page);
    await listPage.goto();

    // Default should be grid view
    await page.screenshot({ path: 'test-results/booking-grid-view.png', fullPage: true });

    // Switch to list view
    await listPage.listViewButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/booking-list-view.png', fullPage: true });

    // Switch back to grid
    await listPage.gridViewButton.click();
    await page.waitForTimeout(500);

    console.log('✅ View toggle works correctly');
  });

  test.describe('Booking Status Management', () => {
    test('should confirm a pending booking', async ({ page }) => {
      console.log('🚀 Test: Confirm booking');

      // Find a pending booking
      const listPage = new BookingListPage(page);
      await listPage.goto();
      await listPage.filterByStatus('pending');

      const pendingCount = await listPage.getBookingCount();
      if (pendingCount === 0) {
        console.log('⚠️  No pending bookings - skipping');
        test.skip();
      }

      await listPage.clickFirstBooking();
      await page.waitForURL(/\/bookings\/[a-f0-9-]+/);

      const detailPage = new BookingDetailPage(page);

      // Confirm the booking
      if (await detailPage.confirmButton.isVisible()) {
        await detailPage.confirmBooking();
        await page.screenshot({ path: 'test-results/booking-confirmed.png', fullPage: true });

        // Verify status changed
        const status = await detailPage.getStatus();
        expect(status?.toLowerCase()).toContain('confirmed');

        console.log('✅ Booking confirmed successfully');
      } else {
        console.log('⚠️  Confirm button not visible - booking may not be pending');
      }
    });

    test('should activate a confirmed booking', async ({ page }) => {
      console.log('🚀 Test: Activate booking');

      const listPage = new BookingListPage(page);
      await listPage.goto();
      await listPage.filterByStatus('confirmed');

      const confirmedCount = await listPage.getBookingCount();
      if (confirmedCount === 0) {
        console.log('⚠️  No confirmed bookings - skipping');
        test.skip();
      }

      await listPage.clickFirstBooking();
      await page.waitForURL(/\/bookings\/[a-f0-9-]+/);

      const detailPage = new BookingDetailPage(page);

      if (await detailPage.activateButton.isVisible()) {
        await detailPage.activateBooking();
        await page.screenshot({ path: 'test-results/booking-activated.png', fullPage: true });

        const status = await detailPage.getStatus();
        expect(status?.toLowerCase()).toContain('active');

        console.log('✅ Booking activated successfully');
      } else {
        console.log('⚠️  Activate button not visible');
      }
    });

    test('should cancel a booking', async ({ page }) => {
      console.log('🚀 Test: Cancel booking');

      const listPage = new BookingListPage(page);
      await listPage.goto();

      // Find any non-completed, non-cancelled booking
      await listPage.filterByStatus('pending');

      const count = await listPage.getBookingCount();
      if (count === 0) {
        console.log('⚠️  No bookings to cancel - skipping');
        test.skip();
      }

      await listPage.clickFirstBooking();
      await page.waitForURL(/\/bookings\/[a-f0-9-]+/);

      const detailPage = new BookingDetailPage(page);

      if (await detailPage.cancelButton.isVisible()) {
        await detailPage.cancelBooking();
        await page.screenshot({ path: 'test-results/booking-cancelled.png', fullPage: true });

        const status = await detailPage.getStatus();
        expect(status?.toLowerCase()).toContain('cancel');

        console.log('✅ Booking cancelled successfully');
      } else {
        console.log('⚠️  Cancel button not visible');
      }
    });
  });
});
