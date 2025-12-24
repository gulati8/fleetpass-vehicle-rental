import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Vehicle List Page
 */
export class VehicleListPage {
  readonly page: Page;
  readonly addVehicleButton: Locator;
  readonly searchInput: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly vehicleCards: Locator;
  readonly emptyState: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  // Filter elements
  readonly locationFilter: Locator;
  readonly bodyTypeFilter: Locator;
  readonly transmissionFilter: Locator;
  readonly fuelTypeFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addVehicleButton = page.getByRole('button', { name: /new vehicle|add vehicle/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.gridViewButton = page.getByLabel(/grid view/i);
    this.listViewButton = page.getByLabel(/list view/i);
    this.vehicleCards = page.locator('[data-testid="vehicle-card"]').or(page.locator('article, .vehicle-card'));
    this.emptyState = page.getByText(/no vehicles/i);

    // Delete modal buttons
    this.deleteConfirmButton = page.getByRole('button', { name: /^delete$/i }).or(page.getByRole('button', { name: /confirm/i }));
    this.deleteCancelButton = page.getByRole('button', { name: /cancel/i });

    // Filters
    this.locationFilter = page.locator('select[name="locationId"]').or(page.getByLabel(/location/i));
    this.bodyTypeFilter = page.locator('select[name="bodyType"]').or(page.getByLabel(/body type/i));
    this.transmissionFilter = page.locator('select[name="transmission"]').or(page.getByLabel(/transmission/i));
    this.fuelTypeFilter = page.locator('select[name="fuelType"]').or(page.getByLabel(/fuel type/i));
  }

  async goto() {
    await this.page.goto('/vehicles');
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddVehicle() {
    await this.addVehicleButton.click();
  }

  async searchVehicles(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByLocation(locationName: string) {
    await this.locationFilter.selectOption({ label: locationName });
    await this.page.waitForTimeout(500);
  }

  async getVehicleCount(): Promise<number> {
    await this.page.waitForTimeout(1000);
    return await this.vehicleCards.count();
  }

  async clickFirstVehicle() {
    // Click the "View" button inside the first vehicle card
    const firstCard = this.vehicleCards.first();
    const viewButton = firstCard.getByRole('button', { name: /view/i });
    await viewButton.click();
  }

  async clickVehicleByMake(make: string) {
    const vehicle = this.page.getByText(make).first();
    await vehicle.click();
  }

  async deleteFirstVehicle() {
    // Hover over first vehicle card to show delete button
    const firstCard = this.vehicleCards.first();
    await firstCard.hover();

    // Click delete button (usually appears on hover or in dropdown)
    const deleteButton = firstCard.getByRole('button', { name: /delete/i }).or(firstCard.locator('[data-testid="delete-button"]'));
    await deleteButton.click();

    // Confirm deletion in modal
    await this.deleteConfirmButton.click();
    await this.page.waitForTimeout(1000);
  }
}

/**
 * Page Object for Create/Edit Vehicle Page
 */
export class VehicleFormPage {
  readonly page: Page;

  // Form inputs
  readonly makeInput: Locator;
  readonly modelInput: Locator;
  readonly yearInput: Locator;
  readonly vinInput: Locator;
  readonly trimInput: Locator;
  readonly bodyTypeSelect: Locator;
  readonly transmissionSelect: Locator;
  readonly fuelTypeSelect: Locator;
  readonly exteriorColorInput: Locator;
  readonly interiorColorInput: Locator;
  readonly mileageInput: Locator;
  readonly locationSelect: Locator;
  readonly dailyRateInput: Locator;
  readonly weeklyRateInput: Locator;
  readonly monthlyRateInput: Locator;
  readonly featuresTextarea: Locator;
  readonly notesTextarea: Locator;
  readonly isAvailableCheckbox: Locator;

  // Action buttons
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Basic info
    this.makeInput = page.locator('input[name="make"]').or(page.getByLabel(/make/i));
    this.modelInput = page.locator('input[name="model"]').or(page.getByLabel(/model/i));
    this.yearInput = page.locator('input[name="year"]').or(page.getByLabel(/year/i));
    this.vinInput = page.locator('input[name="vin"]').or(page.getByLabel(/vin/i));
    this.trimInput = page.locator('input[name="trim"]').or(page.getByLabel(/trim/i));

    // Selects
    this.bodyTypeSelect = page.locator('select[name="bodyType"]').or(page.getByLabel(/body type/i));
    this.transmissionSelect = page.locator('select[name="transmission"]').or(page.getByLabel(/transmission/i));
    this.fuelTypeSelect = page.locator('select[name="fuelType"]').or(page.getByLabel(/fuel type/i));
    this.locationSelect = page.locator('select[name="locationId"]').or(page.getByLabel(/location/i));

    // Details
    this.exteriorColorInput = page.locator('input[name="exteriorColor"]').or(page.getByLabel(/exterior color/i));
    this.interiorColorInput = page.locator('input[name="interiorColor"]').or(page.getByLabel(/interior color/i));
    this.mileageInput = page.locator('input[name="mileage"]').or(page.getByLabel(/mileage/i));

    // Pricing
    this.dailyRateInput = page.locator('input[name="dailyRateCents"]').or(page.getByLabel(/daily rate/i));
    this.weeklyRateInput = page.locator('input[name="weeklyRateCents"]').or(page.getByLabel(/weekly rate/i));
    this.monthlyRateInput = page.locator('input[name="monthlyRateCents"]').or(page.getByLabel(/monthly rate/i));

    // Additional
    this.featuresTextarea = page.locator('textarea[name="features"]').or(page.getByLabel(/features/i));
    this.notesTextarea = page.locator('textarea[name="notes"]').or(page.getByLabel(/notes/i));
    this.isAvailableCheckbox = page.locator('input[name="isAvailableForRent"]').or(page.getByLabel(/available for rent/i));

    // Buttons
    this.submitButton = page.getByRole('button', { name: /save vehicle|create vehicle|add vehicle|update vehicle|save changes/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.backButton = page.getByRole('button', { name: /back/i }).or(page.getByRole('link', { name: /back/i }));
  }

  async gotoNew() {
    await this.page.goto('/vehicles/new');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEdit(vehicleId: string) {
    await this.page.goto(`/vehicles/${vehicleId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillBasicInfo(data: {
    make: string;
    model: string;
    year: number;
    vin: string;
  }) {
    await this.makeInput.fill(data.make);
    await this.modelInput.fill(data.model);
    await this.yearInput.fill(data.year.toString());
    await this.vinInput.fill(data.vin);
  }

  async fillPricing(data: {
    dailyRate: string;
    weeklyRate?: string;
    monthlyRate?: string;
  }) {
    await this.dailyRateInput.fill(data.dailyRate);
    if (data.weeklyRate) {
      await this.weeklyRateInput.fill(data.weeklyRate);
    }
    if (data.monthlyRate) {
      await this.monthlyRateInput.fill(data.monthlyRate);
    }
  }

  async selectLocation(index: number) {
    await this.locationSelect.selectOption({ index });
  }

  async selectBodyType(value: string) {
    await this.bodyTypeSelect.selectOption(value);
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async hasValidationError(fieldName: string): Promise<boolean> {
    const errorText = await this.page.getByText(new RegExp(`${fieldName}.*required|invalid`, 'i')).isVisible().catch(() => false);
    return errorText;
  }
}

/**
 * Page Object for Vehicle Detail Page
 */
export class VehicleDetailPage {
  readonly page: Page;
  readonly vehicleTitle: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly backButton: Locator;
  readonly statusBadge: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.vehicleTitle = page.locator('h1').first();
    this.editButton = page.getByRole('button', { name: /edit/i }).or(page.getByRole('link', { name: /edit/i }));
    // Delete button is icon-only with error-600 text color (trash icon)
    this.deleteButton = page.locator('button.text-error-600, button[class*="text-error"]').first();
    this.backButton = page.getByRole('button', { name: /back/i }).or(page.getByRole('link', { name: /back/i }));
    this.statusBadge = page.locator('[class*="badge"]').first();
    this.deleteConfirmButton = page.getByRole('button', { name: /delete vehicle/i }).or(page.getByRole('button', { name: /^delete$/i }));
  }

  async goto(vehicleId: string) {
    await this.page.goto(`/vehicles/${vehicleId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clickEdit() {
    await this.editButton.click();
  }

  async clickDelete() {
    await this.deleteButton.click();
    // Confirm in modal
    await this.page.waitForTimeout(500);
    await this.deleteConfirmButton.click();
  }

  async getVehicleTitle(): Promise<string | null> {
    return await this.vehicleTitle.textContent();
  }

  async hasVehicleInfo(info: string): Promise<boolean> {
    return await this.page.getByText(info).isVisible().catch(() => false);
  }
}
