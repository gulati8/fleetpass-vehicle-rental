import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Customer List Page
 */
export class CustomerListPage {
  readonly page: Page;
  readonly addCustomerButton: Locator;
  readonly searchInput: Locator;
  readonly kycStatusFilter: Locator;
  readonly bookingStatusFilter: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly customerCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addCustomerButton = page.getByRole('button', { name: /add customer/i });
    this.searchInput = page.getByPlaceholder(/search by name, email/i);
    this.kycStatusFilter = page.locator('select').filter({ hasText: /kyc status/i }).or(page.locator('select[name*="kyc"]')).first();
    this.bookingStatusFilter = page.locator('select').filter({ hasText: /customers/i }).first();
    this.gridViewButton = page.getByLabel('Grid view');
    this.listViewButton = page.getByLabel('List view');
    // Each customer card contains a View button - use that as the identifier
    this.customerCards = page.getByRole('button', { name: /^view$/i }).locator('..');
    this.emptyState = page.getByText(/no customers/i);
  }

  async goto() {
    await this.page.goto('/customers');
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddCustomer() {
    await this.addCustomerButton.click();
  }

  async searchCustomers(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByKycStatus(status: string) {
    await this.kycStatusFilter.selectOption(status);
    await this.page.waitForTimeout(500);
  }

  async getCustomerCount(): Promise<number> {
    await this.page.waitForTimeout(2000);
    try {
      await this.customerCards.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // No customers found
    }
    return await this.customerCards.count();
  }

  async clickFirstCustomer() {
    const firstCard = this.customerCards.first();
    const viewButton = firstCard.getByRole('button', { name: /^view$/i });
    await viewButton.click();
  }
}

/**
 * Page Object for Create/Edit Customer Page
 */
export class CustomerFormPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly licenseNumberInput: Locator;
  readonly licenseStateSelect: Locator;
  readonly licenseExpiryInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly saveAndStartKycButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.emailInput = page.locator('input[name="email"]');
    this.phoneInput = page.locator('input[name="phone"]');
    this.dateOfBirthInput = page.locator('input[name="dateOfBirth"]');
    this.licenseNumberInput = page.locator('input[name="driverLicenseNumber"]');
    this.licenseStateSelect = page.locator('select[name="driverLicenseState"]');
    this.licenseExpiryInput = page.locator('input[name="driverLicenseExpiry"]');
    this.submitButton = page.getByRole('button', { name: /save (customer|changes)/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.saveAndStartKycButton = page.getByRole('button', { name: /save.*kyc/i });
  }

  async gotoCreate() {
    await this.page.goto('/customers/new');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEdit(customerId: string) {
    await this.page.goto(`/customers/${customerId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillCustomerForm(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseExpiry?: string;
  }) {
    if (data.firstName) {
      await this.firstNameInput.fill(data.firstName);
    }
    if (data.lastName) {
      await this.lastNameInput.fill(data.lastName);
    }
    if (data.email) {
      await this.emailInput.fill(data.email);
    }
    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
    if (data.dateOfBirth) {
      await this.dateOfBirthInput.fill(data.dateOfBirth);
    }
    if (data.licenseNumber) {
      await this.licenseNumberInput.fill(data.licenseNumber);
    }
    if (data.licenseState) {
      await this.licenseStateSelect.selectOption(data.licenseState);
    }
    if (data.licenseExpiry) {
      await this.licenseExpiryInput.fill(data.licenseExpiry);
    }
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async saveAndStartKyc() {
    await this.saveAndStartKycButton.click();
  }

  async getValidationError(field: string): Promise<string | null> {
    const inputLocator = this.page.locator(`[name="${field}"]`);
    const errorLocator = inputLocator.locator('~ p.text-error-600').or(
      inputLocator.locator('.. p.text-error-600')
    );

    try {
      const text = await errorLocator.textContent();
      return text && text.trim().length > 0 ? text.trim() : null;
    } catch {
      return null;
    }
  }
}

/**
 * Page Object for Customer Detail Page
 */
export class CustomerDetailPage {
  readonly page: Page;
  readonly customerName: Locator;
  readonly kycStatusBadge: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly startKycButton: Locator;
  readonly createBookingButton: Locator;
  readonly emailText: Locator;
  readonly phoneText: Locator;
  readonly bookingHistory: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerName = page.locator('h1').first();
    this.kycStatusBadge = page.getByText(/pending|in.progress|approved|rejected/i).first();
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i });
    this.startKycButton = page.getByRole('button', { name: /start.*kyc|verify/i });
    this.createBookingButton = page.getByRole('button', { name: /create booking/i });
    this.emailText = page.getByText(/@/).first();
    this.phoneText = page.getByText(/\+1|\(\d{3}\)/).first();
    this.bookingHistory = page.getByText(/booking history|recent bookings/i);
  }

  async goto(customerId: string) {
    await this.page.goto(`/customers/${customerId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getKycStatus(): Promise<string | null> {
    return await this.kycStatusBadge.textContent();
  }

  async deleteCustomer() {
    await this.deleteButton.click();
    // Wait for modal to appear and confirm deletion
    await this.page.waitForTimeout(500);
    const confirmButton = this.page.getByRole('button', { name: /^delete customer$/i });
    await confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async startKyc() {
    await this.startKycButton.click();
  }
}

/**
 * Page Object for KYC Wizard
 */
export class KYCWizardPage {
  readonly page: Page;
  readonly startButton: Locator;
  readonly documentFrontInput: Locator;
  readonly documentBackInput: Locator;
  readonly selfieInput: Locator;
  readonly continueButton: Locator;
  readonly retryButton: Locator;
  readonly viewCustomerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startButton = page.getByRole('button', { name: /start|begin/i });
    this.documentFrontInput = page.locator('input[type="file"]').first();
    this.documentBackInput = page.locator('input[type="file"]').nth(1);
    this.selfieInput = page.locator('input[type="file"]').last();
    this.continueButton = page.getByRole('button', { name: /continue|next|submit/i });
    this.retryButton = page.getByRole('button', { name: /try again|retry/i });
    this.viewCustomerButton = page.getByRole('button', { name: /view customer/i });
  }

  async goto(customerId: string) {
    await this.page.goto(`/customers/${customerId}/kyc`);
    await this.page.waitForLoadState('networkidle');
  }

  async uploadDocumentFront(filePath: string) {
    await this.documentFrontInput.setInputFiles(filePath);
  }

  async uploadDocumentBack(filePath: string) {
    await this.documentBackInput.setInputFiles(filePath);
  }

  async uploadSelfie(filePath: string) {
    await this.selfieInput.setInputFiles(filePath);
  }

  async clickContinue() {
    await this.continueButton.click();
  }

  async clickStart() {
    await this.startButton.click();
  }
}
