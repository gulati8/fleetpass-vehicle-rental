import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { VehicleHelper, TestVehicle } from '../../utils/vehicle-helper';
import { BookingHelper, TestBooking } from '../../utils/booking-helper';
import { VehicleDetailPage } from '../../pages/VehiclePages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

/**
 * E2E Tests for Vehicle Bookings Display
 *
 * Tests cover:
 * 1. Recent Bookings Section Display
 * 2. Availability Calendar
 * 3. Data Integration
 */
test.describe('Vehicle Bookings Display', () => {
  let authHelper: AuthHelper;
  let vehicleHelper: VehicleHelper;
  let bookingHelper: BookingHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let testVehicle: TestVehicle;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    vehicleHelper = new VehicleHelper();
    bookingHelper = new BookingHelper();

    // Login first
    await authHelper.login(page, testEmail, testPassword);

    // Create a test vehicle for bookings
    testVehicle = await vehicleHelper.createTestVehicle(page, {
      make: 'BookingDisplay',
      model: 'TestVehicle',
      year: 2024,
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data in correct order
    await bookingHelper.cleanup(page);
    await vehicleHelper.cleanup(page);
  });

  test.describe('Recent Bookings Section Display', () => {
    test('should display Recent Bookings section with proper heading', async ({ page }) => {
      console.log('🚀 Test: Display Recent Bookings section heading');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-section.png',
        fullPage: true,
      });

      // Verify section heading is visible
      await expect(detailPage.recentBookingsTitle).toBeVisible();

      console.log('✅ Recent Bookings section heading displayed');
    });

    test('should display empty state when no bookings exist', async ({ page }) => {
      console.log('🚀 Test: Display empty state for no bookings');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-empty-state.png',
        fullPage: true,
      });

      // Should show empty state
      const hasEmptyState = await detailPage.hasEmptyBookingsState();
      expect(hasEmptyState).toBeTruthy();

      // Should show "No bookings yet" message
      await expect(detailPage.emptyBookingsState).toBeVisible();

      // Should have no booking items
      const bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(0);

      console.log('✅ Empty state displayed correctly');
    });

    test('should display booking information correctly', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Display booking information');

      // Create a test booking
      const booking = await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        daysFromNow: 7,
        rentalDays: 3,
      });

      console.log(`Created booking: ${booking.bookingNumber}`);

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-with-data.png',
        fullPage: true,
      });

      // Wait for bookings to load
      await page.waitForTimeout(2000);

      // Should have 1 booking
      const bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(1);

      // Get booking info
      const bookingInfo = await detailPage.getBookingInfo(0);

      // Verify booking number is displayed
      expect(bookingInfo.bookingNumber).toBeTruthy();
      expect(bookingInfo.bookingNumber).toContain(booking.bookingNumber);

      // Verify customer name is displayed
      expect(bookingInfo.customerName).toBeTruthy();

      // Verify dates are displayed
      expect(bookingInfo.dates).toBeTruthy();

      // Verify status badge is displayed
      expect(bookingInfo.status).toBeTruthy();

      console.log('✅ Booking information displayed correctly');
    });

    test('should navigate to booking detail page when clicking on a booking', async ({
      page,
    }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Navigate to booking detail on click');

      // Create a test booking
      const booking = await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        daysFromNow: 7,
        rentalDays: 3,
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Wait for bookings to load
      await page.waitForTimeout(2000);

      // Click on the booking
      await detailPage.clickFirstBooking();

      // Should navigate to booking detail page
      await page.waitForURL(/\/bookings\/[a-f0-9-]+/, { timeout: 10000 });

      await page.screenshot({
        path: 'test-results/vehicle-booking-navigation.png',
        fullPage: true,
      });

      // Verify we're on the booking detail page
      const url = page.url();
      expect(url).toContain('/bookings/');
      expect(url).toContain(booking.id);

      console.log('✅ Navigation to booking detail works correctly');
    });

    test('should display only 5 most recent bookings', async ({ page }) => {
      test.setTimeout(120000);
      console.log('🚀 Test: Display only 5 most recent bookings');

      // Create 7 bookings
      const bookings = await bookingHelper.createMultipleBookings(page, testVehicle.id, 7, {
        startDaysFromNow: 7,
        daysBetweenBookings: 7,
        rentalDays: 2,
      });

      console.log(`Created ${bookings.length} bookings`);

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-limit-5.png',
        fullPage: true,
      });

      // Wait for bookings to load
      await page.waitForTimeout(3000);

      // Should only display 5 bookings
      const bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(5);

      console.log('✅ Only 5 most recent bookings displayed');
    });

    test('should support keyboard navigation for bookings', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Keyboard navigation for bookings');

      // Create a test booking
      const booking = await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        daysFromNow: 7,
        rentalDays: 3,
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Wait for bookings to load
      await page.waitForTimeout(2000);

      // Navigate using keyboard
      await detailPage.navigateBookingsWithKeyboard(0);

      // Should navigate to booking detail page
      await page.waitForURL(/\/bookings\/[a-f0-9-]+/, { timeout: 10000 });

      // Verify navigation worked
      const url = page.url();
      expect(url).toContain(booking.id);

      console.log('✅ Keyboard navigation works correctly');
    });
  });

  test.describe('Availability Calendar', () => {
    test('should display Availability Calendar section', async ({ page }) => {
      console.log('🚀 Test: Display Availability Calendar section');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-section.png',
        fullPage: true,
      });

      // Verify calendar heading is visible
      await expect(detailPage.availabilityCalendarTitle).toBeVisible();

      // Verify calendar grid is visible
      await expect(detailPage.calendarGrid).toBeVisible();

      // Verify calendar legend is visible
      const legendVisible = await detailPage.isCalendarLegendVisible();
      expect(legendVisible).toBeTruthy();

      console.log('✅ Availability Calendar section displayed');
    });

    test('should show booked dates in red/pink color', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Display booked dates in red/pink');

      // Create a booking that starts in the current month
      const today = new Date();
      const pickupDate = new Date(today.getFullYear(), today.getMonth(), 15);
      pickupDate.setHours(10, 0, 0, 0);

      const dropoffDate = new Date(pickupDate);
      dropoffDate.setDate(pickupDate.getDate() + 2); // 3-day rental
      dropoffDate.setHours(14, 0, 0, 0);

      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        pickupDate,
        dropoffDate,
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Navigate to current month
      await detailPage.clickCalendarToday();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-booked-dates.png',
        fullPage: true,
      });

      // Get booked dates from calendar
      const bookedDates = await detailPage.getBookedDatesInCalendar();

      console.log(`Booked dates in calendar: ${bookedDates}`);

      // Should have at least 3 days marked as booked (pickup, in-between, dropoff)
      expect(bookedDates.length).toBeGreaterThanOrEqual(3);

      // Verify the specific dates are marked as booked
      const isDay15Booked = await detailPage.isDateBooked(15);
      expect(isDay15Booked).toBeTruthy();

      console.log('✅ Booked dates displayed in red/pink color');
    });

    test('should show available dates in green color', async ({ page }) => {
      console.log('🚀 Test: Display available dates in green');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-available-dates.png',
        fullPage: true,
      });

      // Get available dates from calendar
      const availableDates = await detailPage.getAvailableDatesInCalendar();

      console.log(`Available dates count: ${availableDates.length}`);

      // Should have available dates (most days should be available)
      expect(availableDates.length).toBeGreaterThan(0);

      // Check a future date is marked as available
      const today = new Date();
      const futureDay = today.getDate() + 5;
      if (futureDay <= 28) {
        // Ensure it's within the month
        const isAvailable = await detailPage.isDateAvailable(futureDay);
        expect(isAvailable).toBeTruthy();
      }

      console.log('✅ Available dates displayed in green color');
    });

    test('should mark complete booking date range as booked', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Mark complete date range as booked');

      // Create a booking spanning multiple days
      const today = new Date();
      const pickupDate = new Date(today.getFullYear(), today.getMonth(), 10);
      pickupDate.setHours(10, 0, 0, 0);

      const dropoffDate = new Date(pickupDate);
      dropoffDate.setDate(pickupDate.getDate() + 4); // 5-day rental
      dropoffDate.setHours(14, 0, 0, 0);

      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        pickupDate,
        dropoffDate,
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Navigate to current month
      await detailPage.clickCalendarToday();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-date-range.png',
        fullPage: true,
      });

      // Verify all days in the range are marked as booked
      const expectedBookedDays = [10, 11, 12, 13, 14];
      for (const day of expectedBookedDays) {
        const isBooked = await detailPage.isDateBooked(day);
        expect(isBooked).toBeTruthy();
      }

      console.log('✅ Complete date range marked as booked');
    });

    test('should display calendar legend with correct color coding', async ({ page }) => {
      console.log('🚀 Test: Display calendar legend');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-legend.png',
        fullPage: true,
      });

      // Verify legend is visible
      const legendVisible = await detailPage.isCalendarLegendVisible();
      expect(legendVisible).toBeTruthy();

      // Verify legend contains color indicators for each status
      await expect(page.getByText(/available/i).last()).toBeVisible();
      await expect(page.getByText(/booked/i).last()).toBeVisible();
      await expect(page.getByText(/today/i).last()).toBeVisible();

      console.log('✅ Calendar legend displayed correctly');
    });

    test('should navigate between months using navigation buttons', async ({ page }) => {
      console.log('🚀 Test: Navigate between months');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Get current month
      const currentMonth = await detailPage.getCalendarMonthYear();
      console.log(`Current month: ${currentMonth}`);

      // Navigate to next month
      await detailPage.clickCalendarNextMonth();
      const nextMonth = await detailPage.getCalendarMonthYear();
      console.log(`Next month: ${nextMonth}`);

      // Should be different
      expect(nextMonth).not.toBe(currentMonth);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-next-month.png',
        fullPage: true,
      });

      // Navigate to previous month
      await detailPage.clickCalendarPrevMonth();
      const prevMonth = await detailPage.getCalendarMonthYear();
      console.log(`Previous month: ${prevMonth}`);

      // Should be back to current month
      expect(prevMonth).toBe(currentMonth);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-prev-month.png',
        fullPage: true,
      });

      console.log('✅ Month navigation works correctly');
    });

    test('should return to current month when clicking Today button', async ({ page }) => {
      console.log('🚀 Test: Return to current month with Today button');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Navigate to next month
      await detailPage.clickCalendarNextMonth();
      await detailPage.clickCalendarNextMonth();

      // Click Today button
      await detailPage.clickCalendarToday();

      await page.screenshot({
        path: 'test-results/vehicle-calendar-today-button.png',
        fullPage: true,
      });

      // Should be back to current month
      const currentMonth = await detailPage.getCalendarMonthYear();
      const today = new Date();
      const expectedMonth = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      expect(currentMonth).toContain(expectedMonth.split(' ')[0]); // Month name

      console.log('✅ Today button returns to current month');
    });
  });

  test.describe('Data Integration', () => {
    test('should update Recent Bookings when new booking is created', async ({ page }) => {
      test.setTimeout(120000);
      console.log('🚀 Test: Update Recent Bookings on creation');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Verify initially no bookings
      let bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(0);

      // Create a booking
      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        daysFromNow: 7,
        rentalDays: 3,
      });

      // Reload the page to see updated data
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-after-creation.png',
        fullPage: true,
      });

      // Wait for bookings to load
      await page.waitForTimeout(2000);

      // Should now have 1 booking
      bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(1);

      console.log('✅ Recent Bookings updated after creation');
    });

    test('should update Availability Calendar when new booking is created', async ({
      page,
    }) => {
      test.setTimeout(120000);
      console.log('🚀 Test: Update Availability Calendar on booking creation');

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Get initial booked dates count
      const initialBookedDates = await detailPage.getBookedDatesInCalendar();
      console.log(`Initial booked dates: ${initialBookedDates.length}`);

      // Create a booking in current month
      const today = new Date();
      const pickupDate = new Date(today.getFullYear(), today.getMonth(), 20);
      pickupDate.setHours(10, 0, 0, 0);

      const dropoffDate = new Date(pickupDate);
      dropoffDate.setDate(pickupDate.getDate() + 2);
      dropoffDate.setHours(14, 0, 0, 0);

      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        pickupDate,
        dropoffDate,
      });

      // Reload the page
      await detailPage.goto(testVehicle.id);

      // Navigate to current month
      await detailPage.clickCalendarToday();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-after-booking.png',
        fullPage: true,
      });

      // Get updated booked dates
      const updatedBookedDates = await detailPage.getBookedDatesInCalendar();
      console.log(`Updated booked dates: ${updatedBookedDates.length}`);

      // Should have more booked dates now
      expect(updatedBookedDates.length).toBeGreaterThan(initialBookedDates.length);

      // Verify the specific date is marked as booked
      const isDay20Booked = await detailPage.isDateBooked(20);
      expect(isDay20Booked).toBeTruthy();

      console.log('✅ Availability Calendar updated after booking creation');
    });

    test('should correctly handle multiple overlapping bookings', async ({ page }) => {
      test.setTimeout(120000);
      console.log('🚀 Test: Handle multiple overlapping bookings');

      // Create multiple bookings with overlapping dates
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 5);

      // Booking 1: Days 5-8
      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        pickupDate: new Date(startDate),
        dropoffDate: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      });

      // Booking 2: Days 12-15
      const secondStart = new Date(today.getFullYear(), today.getMonth(), 12);
      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        pickupDate: new Date(secondStart),
        dropoffDate: new Date(secondStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      // Navigate to current month
      await detailPage.clickCalendarToday();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/vehicle-calendar-multiple-bookings.png',
        fullPage: true,
      });

      // Should show 2 bookings in Recent Bookings
      const bookingCount = await detailPage.getRecentBookingsCount();
      expect(bookingCount).toBe(2);

      // Should have both date ranges marked as booked
      const bookedDates = await detailPage.getBookedDatesInCalendar();
      expect(bookedDates.length).toBeGreaterThanOrEqual(6); // At least 6 days booked

      console.log('✅ Multiple bookings handled correctly');
    });

    test('should show correct booking status in Recent Bookings', async ({ page }) => {
      test.setTimeout(90000);
      console.log('🚀 Test: Display correct booking status');

      // Create a booking (default status is 'pending')
      await bookingHelper.createTestBooking(page, {
        vehicleId: testVehicle.id,
        daysFromNow: 7,
        rentalDays: 3,
      });

      const detailPage = new VehicleDetailPage(page);
      await detailPage.goto(testVehicle.id);

      await page.screenshot({
        path: 'test-results/vehicle-bookings-status.png',
        fullPage: true,
      });

      // Wait for bookings to load
      await page.waitForTimeout(2000);

      // Get booking info
      const bookingInfo = await detailPage.getBookingInfo(0);

      // Verify status is displayed
      expect(bookingInfo.status).toBeTruthy();

      console.log(`Booking status: ${bookingInfo.status}`);
      console.log('✅ Booking status displayed correctly');
    });
  });
});
