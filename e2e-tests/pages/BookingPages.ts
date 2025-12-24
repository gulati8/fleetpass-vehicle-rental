import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Booking List Page
 */
export class BookingListPage {
  readonly page: Page;
  readonly addBookingButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly bookingCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addBookingButton = page.getByRole('button', { name: /new booking/i });
    this.searchInput = page.getByPlaceholder(/search by booking number/i);
    this.statusFilter = page.locator('select').filter({ hasText: /all statuses/i }).first();
    this.gridViewButton = page.getByLabel('Grid view');
    this.listViewButton = page.getByLabel('List view');
    this.bookingCards = page.locator('[data-testid="booking-card"]').or(page.locator('article, .booking-card')); // Flexible selector
    this.emptyState = page.getByText(/no bookings/i);
  }

  async goto() {
    await this.page.goto('/bookings');
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddBooking() {
    await this.addBookingButton.click();
  }

  async searchBookings(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500);
  }

  async getBookingCount(): Promise<number> {
    // Wait for bookings to load from API
    await this.page.waitForTimeout(2000);
    // Also wait for at least one card to appear or timeout
    try {
      await this.bookingCards.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // No bookings found
    }
    return await this.bookingCards.count();
  }

  async clickFirstBooking() {
    // Click the "View Details" button inside the first booking card
    const firstCard = this.bookingCards.first();
    const viewButton = firstCard.getByRole('button', { name: /view details/i });
    await viewButton.click();
  }
}

/**
 * Page Object for Create Booking Page
 */
export class CreateBookingPage {
  readonly page: Page;
  readonly customerSelect: Locator;
  readonly vehicleSelect: Locator;
  readonly pickupLocationSelect: Locator;
  readonly dropoffLocationSelect: Locator;
  readonly pickupDatetimeInput: Locator;
  readonly dropoffDatetimeInput: Locator;
  readonly notesTextarea: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly estimatedTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerSelect = page.locator('select[name="customerId"]');
    this.vehicleSelect = page.locator('select[name="vehicleId"]');
    this.pickupLocationSelect = page.locator('select[name="pickupLocationId"]');
    this.dropoffLocationSelect = page.locator('select[name="dropoffLocationId"]');
    this.pickupDatetimeInput = page.locator('input[name="pickupDatetime"]');
    this.dropoffDatetimeInput = page.locator('input[name="dropoffDatetime"]');
    this.notesTextarea = page.locator('textarea[name="notes"]');
    this.submitButton = page.getByRole('button', { name: /create booking/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.estimatedTotal = page.getByText(/estimated total/i).locator('..');
  }

  async goto(customerId?: string) {
    const url = customerId ? `/bookings/new?customerId=${customerId}` : '/bookings/new';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async fillBookingForm(data: {
    customerId?: string;
    vehicleId?: string;
    pickupLocationId?: string;
    dropoffLocationId?: string;
    pickupDatetime?: string;
    dropoffDatetime?: string;
    notes?: string;
  }) {
    if (data.customerId) {
      await this.customerSelect.selectOption(data.customerId);
    }
    if (data.vehicleId) {
      await this.vehicleSelect.selectOption(data.vehicleId);
    }
    if (data.pickupLocationId) {
      await this.pickupLocationSelect.selectOption(data.pickupLocationId);
    }
    if (data.dropoffLocationId) {
      await this.dropoffLocationSelect.selectOption(data.dropoffLocationId);
    }
    if (data.pickupDatetime) {
      await this.pickupDatetimeInput.fill(data.pickupDatetime);
    }
    if (data.dropoffDatetime) {
      await this.dropoffDatetimeInput.fill(data.dropoffDatetime);
    }
    if (data.notes) {
      await this.notesTextarea.fill(data.notes);
    }
  }

  async submitBooking() {
    await this.submitButton.click();
  }

  async getEstimatedTotal(): Promise<string | null> {
    try {
      // Look for text containing a dollar sign in the estimated total section
      const priceElement = this.estimatedTotal.getByText(/\$/);
      const text = await priceElement.textContent();
      return text;
    } catch {
      // If no price is shown yet, return null
      return null;
    }
  }

  async hasValidationError(field: string): Promise<boolean> {
    const errorLocator = this.page.locator(`[name="${field}"]`).locator('..').getByText(/required|invalid|must be/i);
    return await errorLocator.isVisible().catch(() => false);
  }

  async getValidationError(field: string): Promise<string | null> {
    // Error message is displayed in a sibling <p> tag with text-error-600 class
    // It can be a sibling of the input directly, or of the input's wrapper div
    const inputLocator = this.page.locator(`[name="${field}"]`);

    // Try to find error as sibling of input
    let errorLocator = inputLocator.locator('~ p.text-error-600');
    let hasError = await errorLocator.count() > 0;

    // If not found, try finding it as a sibling of the parent wrapper
    if (!hasError) {
      errorLocator = inputLocator.locator('.. p.text-error-600');
    }

    try {
      const text = await errorLocator.textContent();
      return text && text.trim().length > 0 ? text.trim() : null;
    } catch {
      return null;
    }
  }
}

/**
 * Page Object for Booking Detail Page
 */
export class BookingDetailPage {
  readonly page: Page;
  readonly bookingNumber: Locator;
  readonly statusBadge: Locator;
  readonly confirmButton: Locator;
  readonly activateButton: Locator;
  readonly completeButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly customerName: Locator;
  readonly vehicleName: Locator;
  readonly totalAmount: Locator;
  readonly pickupDate: Locator;
  readonly dropoffDate: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bookingNumber = page.locator('h1').first();
    // Status is shown in BookingStatusIndicator component, not a badge
    this.statusBadge = page.getByText(/pending|confirmed|active|completed|cancelled/i).first();
    this.confirmButton = page.getByRole('button', { name: /confirm booking/i });
    this.activateButton = page.getByRole('button', { name: /activate rental/i });
    this.completeButton = page.getByRole('button', { name: /complete rental/i });
    this.cancelButton = page.getByRole('button', { name: /cancel booking/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.customerName = page.getByText(/customer/i).locator('..').locator('.font-medium').first();
    this.vehicleName = page.getByText(/vehicle/i).locator('..').locator('.font-medium').first();
    this.totalAmount = page.getByText(/total/i).locator('..').locator('.font-bold, .text-xl').first();
    this.pickupDate = page.getByText(/pickup/i).locator('..').locator('.font-medium').first();
    this.dropoffDate = page.getByText(/drop-off/i).locator('..').locator('.font-medium').first();
  }

  async goto(bookingId: string) {
    await this.page.goto(`/bookings/${bookingId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string | null> {
    return await this.statusBadge.textContent();
  }

  async confirmBooking() {
    await this.confirmButton.click();
    // Wait for confirmation modal
    const confirmModalButton = this.page.getByRole('button', { name: /^confirm$/i });
    await confirmModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async activateBooking() {
    await this.activateButton.click();
    const confirmModalButton = this.page.getByRole('button', { name: /^confirm$/i });
    await confirmModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async completeBooking() {
    await this.completeButton.click();
    const confirmModalButton = this.page.getByRole('button', { name: /^confirm$/i });
    await confirmModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelBooking() {
    await this.cancelButton.click();
    const confirmModalButton = this.page.getByRole('button', { name: /^confirm$/i });
    await confirmModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async deleteBooking() {
    await this.deleteButton.click();
    const deleteModalButton = this.page.getByRole('button', { name: /delete booking/i });
    await deleteModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
