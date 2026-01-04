import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Lead List Page
 */
export class LeadListPage {
  readonly page: Page;
  readonly addLeadButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly sourceFilter: Locator;
  readonly assignedToFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly leadCards: Locator;
  readonly emptyState: Locator;
  readonly resultsCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addLeadButton = page.getByRole('button', { name: /add lead/i });
    this.searchInput = page.getByPlaceholder(/search by name, email/i);
    this.statusFilter = page.locator('select[name="status"]');
    this.sourceFilter = page.locator('select[name="source"]');
    this.assignedToFilter = page.locator('select[name="assignedToId"]');
    this.clearFiltersButton = page.getByRole('button', { name: /clear all/i });
    this.gridViewButton = page.getByLabel('Grid view');
    this.listViewButton = page.getByLabel('List view');
    // Lead cards contain View button
    this.leadCards = page.getByRole('button', { name: /^view$/i }).locator('..');
    this.emptyState = page.getByText(/no leads/i);
    this.resultsCount = page.locator('text=/\\d+ (lead|total)/');
  }

  async goto() {
    await this.page.goto('/leads');
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddLead() {
    await this.addLeadButton.click();
  }

  async searchLeads(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500);
  }

  async filterBySource(source: string) {
    await this.sourceFilter.selectOption(source);
    await this.page.waitForTimeout(500);
  }

  async filterByAssignedTo(userId: string) {
    await this.assignedToFilter.selectOption(userId);
    await this.page.waitForTimeout(500);
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
    await this.page.waitForTimeout(500);
  }

  async getLeadCount(): Promise<number> {
    await this.page.waitForTimeout(2000);
    try {
      await this.leadCards.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // No leads found
    }
    return await this.leadCards.count();
  }

  async clickFirstLead() {
    const firstCard = this.leadCards.first();
    const viewButton = firstCard.getByRole('button', { name: /^view$/i });
    await viewButton.click();
  }

  async deleteFirstLead() {
    const firstCard = this.leadCards.first();
    const deleteButton = firstCard.getByRole('button', { name: /delete/i });
    await deleteButton.click();
  }
}

/**
 * Page Object for Create/Edit Lead Page (using LeadForm)
 */
export class LeadFormPage {
  readonly page: Page;
  readonly customerNameInput: Locator;
  readonly customerEmailInput: Locator;
  readonly customerPhoneInput: Locator;
  readonly sourceSelect: Locator;
  readonly vehicleInterestSelect: Locator;
  readonly assignedToSelect: Locator;
  readonly statusSelect: Locator;
  readonly notesTextarea: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerNameInput = page.locator('input[id="customerName"]');
    this.customerEmailInput = page.locator('input[id="customerEmail"]');
    this.customerPhoneInput = page.locator('input[id="customerPhone"]');
    this.sourceSelect = page.locator('select[id="source"]');
    this.vehicleInterestSelect = page.locator('select[id="vehicleInterestId"]');
    this.assignedToSelect = page.locator('select[id="assignedToId"]');
    this.statusSelect = page.locator('select[id="status"]');
    this.notesTextarea = page.locator('textarea[id="notes"]');
    this.submitButton = page.getByRole('button', { name: /(create|update) lead/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
  }

  async gotoCreate() {
    await this.page.goto('/leads/new');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoEdit(leadId: string) {
    await this.page.goto(`/leads/${leadId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async fillLeadForm(data: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    source?: string;
    vehicleInterestId?: string;
    assignedToId?: string;
    status?: string;
    notes?: string;
  }) {
    if (data.customerName !== undefined) {
      await this.customerNameInput.fill(data.customerName);
    }
    if (data.customerEmail !== undefined) {
      await this.customerEmailInput.fill(data.customerEmail);
    }
    if (data.customerPhone !== undefined) {
      await this.customerPhoneInput.fill(data.customerPhone);
    }
    if (data.source !== undefined) {
      await this.sourceSelect.selectOption(data.source);
    }
    if (data.vehicleInterestId !== undefined) {
      await this.vehicleInterestSelect.selectOption(data.vehicleInterestId);
    }
    if (data.assignedToId !== undefined) {
      await this.assignedToSelect.selectOption(data.assignedToId);
    }
    if (data.status !== undefined) {
      await this.statusSelect.selectOption(data.status);
    }
    if (data.notes !== undefined) {
      await this.notesTextarea.fill(data.notes);
    }
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async cancelForm() {
    await this.cancelButton.click();
  }

  async getValidationError(field: string): Promise<string | null> {
    const inputLocator = this.page.locator(`[id="${field}"]`);
    // Look for error in parent div (Input component wraps input and error in a div)
    const parentDiv = inputLocator.locator('..');
    const errorLocator = parentDiv.locator('p.text-error-600');

    try {
      const text = await errorLocator.textContent({ timeout: 2000 });
      return text && text.trim().length > 0 ? text.trim() : null;
    } catch {
      return null;
    }
  }
}

/**
 * Page Object for Lead Detail Page
 */
export class LeadDetailPage {
  readonly page: Page;
  readonly leadName: Locator;
  readonly statusBadge: Locator;
  readonly sourceBadge: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly assignButton: Locator;
  readonly convertButton: Locator;
  readonly markAsLostButton: Locator;
  readonly customerName: Locator;
  readonly customerEmail: Locator;
  readonly customerPhone: Locator;
  readonly assignedToText: Locator;
  readonly notesText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.leadName = page.locator('h1').first();
    this.statusBadge = page.getByText(/new|contacted|qualified|converted|lost/i).first();
    this.sourceBadge = page.getByText(/website|phone|walk-in|referral|social media|other/i).first();
    this.editButton = page.getByRole('button', { name: /edit/i });
    this.deleteButton = page.getByRole('button', { name: /delete/i }).first();
    this.assignButton = page.getByRole('button', { name: /assign to user/i });
    this.convertButton = page.getByRole('button', { name: /convert to deal/i });
    this.markAsLostButton = page.getByRole('button', { name: /mark as lost/i });
    this.customerName = page.locator('text=/Name/').locator('..').locator('p.font-medium');
    this.customerEmail = page.getByText(/@/).first();
    this.customerPhone = page.getByText(/\+1|\(\d{3}\)/).first();
    this.assignedToText = page.locator('text=/Assigned To/').locator('..').locator('p.font-medium');
    this.notesText = page.locator('text=/Notes/').locator('..').locator('p.text-neutral-700');
  }

  async goto(leadId: string) {
    await this.page.goto(`/leads/${leadId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async getStatus(): Promise<string | null> {
    return await this.statusBadge.textContent();
  }

  async deleteLead() {
    await this.deleteButton.click();
    // Wait for modal and confirm
    await this.page.waitForTimeout(500);
    const confirmButton = this.page.getByRole('button', { name: /^delete lead$/i });
    await confirmButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async assignLead(userName: string) {
    await this.assignButton.click();
    await this.page.waitForTimeout(500);

    // Select user in the modal
    const userButton = this.page.getByRole('button', { name: new RegExp(userName, 'i') });
    await userButton.click();

    // Confirm assignment
    const assignModalButton = this.page.getByRole('button', { name: /^assign$/i });
    await assignModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async convertLead(data: { dealValue: string; vehicleId?: string; notes?: string }) {
    await this.convertButton.click();
    await this.page.waitForTimeout(500);

    // Fill convert form
    const dealValueInput = this.page.locator('input[name="dealValue"]');
    await dealValueInput.fill(data.dealValue);

    if (data.vehicleId) {
      const vehicleSelect = this.page.locator('select[name="vehicleId"]');
      await vehicleSelect.selectOption(data.vehicleId);
    }

    if (data.notes) {
      const notesTextarea = this.page.locator('textarea[name="notes"]');
      await notesTextarea.fill(data.notes);
    }

    // Submit conversion
    const convertModalButton = this.page.getByRole('button', { name: /^convert$/i });
    await convertModalButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
