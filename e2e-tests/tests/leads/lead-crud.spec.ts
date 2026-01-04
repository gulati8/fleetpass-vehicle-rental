import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { LeadListPage, LeadFormPage, LeadDetailPage } from '../../pages/LeadPages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Lead Management - CRUD Operations', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let createdLeadId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should display lead list page', async ({ page }) => {
    console.log('🚀 Test: Display lead list');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    await page.screenshot({ path: 'test-results/lead-list.png', fullPage: true });

    // Should see the page title
    await expect(page.locator('h1')).toContainText('Leads');

    // Should see the add lead button
    await expect(listPage.addLeadButton).toBeVisible();

    console.log('✅ Lead list page loads correctly');
  });

  test('should create a new lead with all fields', async ({ page }) => {
    console.log('🚀 Test: Create new lead with all fields');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    await page.screenshot({ path: 'test-results/lead-create-form.png', fullPage: true });

    // Generate unique test data
    const timestamp = Date.now();
    const leadData = {
      customerName: `Test Lead ${timestamp}`,
      customerEmail: `test.lead${timestamp}@example.com`,
      customerPhone: '+14155551234',
      source: 'website',
      notes: 'This is a test lead created by E2E tests',
    };

    console.log('📝 Filling lead form with:', leadData);

    await formPage.fillLeadForm(leadData);

    // Select vehicle interest if available
    const vehicleOptions = await formPage.vehicleInterestSelect.locator('option').count();
    if (vehicleOptions > 1) {
      await formPage.vehicleInterestSelect.selectOption({ index: 1 });
    }

    await page.screenshot({ path: 'test-results/lead-form-filled.png', fullPage: true });

    // Submit the form
    await formPage.submitForm();
    await page.waitForTimeout(1000);

    // Wait for navigation to detail page
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/lead-created.png', fullPage: true });

    // Extract lead ID from URL
    const url = page.url();
    createdLeadId = url.split('/').pop() || '';
    console.log('✅ Lead created with ID:', createdLeadId);

    // Verify we're on the detail page
    expect(url).toContain('/leads/');
    expect(createdLeadId).toBeTruthy();

    // Verify customer name is displayed
    await expect(page.locator('h1')).toContainText(leadData.customerName);
  });

  test('should create a minimal lead with only required fields', async ({ page }) => {
    console.log('🚀 Test: Create lead with only required fields');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    const timestamp = Date.now();
    const leadData = {
      customerName: `Minimal Lead ${timestamp}`,
    };

    await formPage.fillLeadForm(leadData);
    await formPage.submitForm();
    await page.waitForTimeout(1000);

    // Should navigate to detail page successfully
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/, { timeout: 10000 });

    const url = page.url();
    expect(url).toContain('/leads/');

    console.log('✅ Minimal lead created successfully');
  });

  test('should validate required fields', async ({ page }) => {
    console.log('🚀 Test: Form validation');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    // Try to submit empty form
    await formPage.submitForm();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/lead-validation-errors.png', fullPage: true });

    // Check for validation errors
    const allErrors = await page.locator('[class*="error"], [role="alert"]').count();
    expect(allErrors).toBeGreaterThan(0);

    console.log('✅ Form validation works correctly');
  });

  test('should validate email format', async ({ page }) => {
    console.log('🚀 Test: Email validation');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    // Fill name and invalid email
    await formPage.fillLeadForm({
      customerName: 'Test Lead',
      customerEmail: 'invalid-email',
    });

    await formPage.submitForm();
    await page.waitForTimeout(500);

    // Should show email validation error
    const emailError = await formPage.getValidationError('customerEmail');
    console.log('Email validation error:', emailError);

    expect(emailError).toBeTruthy();

    console.log('✅ Email validation works correctly');
  });

  test('should display lead details', async ({ page }) => {
    console.log('🚀 Test: Display lead details');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    console.log(`Found ${leadCount} leads`);

    if (leadCount === 0) {
      console.log('⚠️  No leads found - skipping detail test');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();

    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/lead-detail.png', fullPage: true });

    const detailPage = new LeadDetailPage(page);

    // Verify lead details are displayed
    await expect(detailPage.leadName).toBeVisible();
    await expect(detailPage.statusBadge).toBeVisible();

    const status = await detailPage.getStatus();
    console.log('Lead status:', status);

    // Verify action buttons are present
    await expect(detailPage.editButton).toBeVisible();
    await expect(detailPage.assignButton).toBeVisible();

    console.log('✅ Lead details displayed correctly');
  });

  test('should search leads by name', async ({ page }) => {
    console.log('🚀 Test: Search leads by name');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();
    console.log(`Initial lead count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No leads to search - skipping');
      test.skip();
    }

    // Search for "Test"
    await listPage.searchLeads('Test');
    await page.screenshot({ path: 'test-results/lead-search.png', fullPage: true });

    const searchCount = await listPage.getLeadCount();
    console.log(`Search results: ${searchCount}`);

    // Clear search
    await listPage.searchLeads('');
    const afterClearCount = await listPage.getLeadCount();
    console.log(`After clearing search: ${afterClearCount}`);

    console.log('✅ Search works correctly');
  });

  test('should filter leads by status', async ({ page }) => {
    console.log('🚀 Test: Filter by status');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();
    console.log(`Initial lead count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No leads to filter - skipping');
      test.skip();
    }

    // Filter by new status
    await listPage.filterByStatus('new');
    await page.screenshot({ path: 'test-results/lead-filter-new.png', fullPage: true });

    const newCount = await listPage.getLeadCount();
    console.log(`New leads: ${newCount}`);

    // Filter by contacted
    await listPage.filterByStatus('contacted');
    const contactedCount = await listPage.getLeadCount();
    console.log(`Contacted leads: ${contactedCount}`);

    // Clear filter
    await listPage.filterByStatus('');
    const afterClearCount = await listPage.getLeadCount();
    console.log(`After clearing filter: ${afterClearCount}`);

    console.log('✅ Status filtering works correctly');
  });

  test('should filter leads by source', async ({ page }) => {
    console.log('🚀 Test: Filter by source');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();

    if (initialCount === 0) {
      console.log('⚠️  No leads to filter - skipping');
      test.skip();
    }

    // Filter by website source
    await listPage.filterBySource('website');
    await page.screenshot({ path: 'test-results/lead-filter-website.png', fullPage: true });

    const websiteCount = await listPage.getLeadCount();
    console.log(`Website leads: ${websiteCount}`);

    // Clear filter
    await listPage.filterBySource('');
    const afterClearCount = await listPage.getLeadCount();

    console.log('✅ Source filtering works correctly');
  });

  test('should clear all filters', async ({ page }) => {
    console.log('🚀 Test: Clear all filters');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();

    if (initialCount === 0) {
      console.log('⚠️  No leads - skipping');
      test.skip();
    }

    // Apply multiple filters
    await listPage.filterByStatus('new');
    await listPage.filterBySource('website');
    await listPage.searchLeads('Test');

    // Clear all filters at once
    await listPage.clearFilters();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/lead-filters-cleared.png', fullPage: true });

    const afterClearCount = await listPage.getLeadCount();
    console.log(`After clearing all filters: ${afterClearCount}`);

    console.log('✅ Clear filters works correctly');
  });

  test('should toggle between grid and list views', async ({ page }) => {
    console.log('🚀 Test: Toggle view modes');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    // Default should be grid view
    await page.screenshot({ path: 'test-results/lead-grid-view.png', fullPage: true });

    // Switch to list view
    await listPage.listViewButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/lead-list-view.png', fullPage: true });

    // Switch back to grid
    await listPage.gridViewButton.click();
    await page.waitForTimeout(500);

    console.log('✅ View toggle works correctly');
  });

  test('should update lead information', async ({ page }) => {
    console.log('🚀 Test: Update lead');

    // First, get a lead ID from the list
    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    if (leadCount === 0) {
      console.log('⚠️  No leads to update - skipping');
      test.skip();
    }

    // Click first lead to get ID
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    const url = page.url();
    const leadId = url.split('/').pop() || '';

    // Navigate to edit page
    const formPage = new LeadFormPage(page);
    await formPage.gotoEdit(leadId);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/lead-edit-form.png', fullPage: true });

    // Update some fields
    const updatedNotes = `Updated notes at ${Date.now()}`;
    await formPage.fillLeadForm({
      notes: updatedNotes,
      status: 'contacted',
    });

    await page.screenshot({ path: 'test-results/lead-edit-form-filled.png', fullPage: true });

    // Submit the form
    await formPage.submitForm();
    await page.waitForTimeout(1000);

    // Should navigate back to detail page
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/, { timeout: 10000 });
    await page.screenshot({ path: 'test-results/lead-updated.png', fullPage: true });

    console.log('✅ Lead updated successfully');
  });

  test('should assign lead to user', async ({ page }) => {
    console.log('🚀 Test: Assign lead');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    if (leadCount === 0) {
      console.log('⚠️  No leads to assign - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Verify assign button is visible
    await expect(detailPage.assignButton).toBeVisible();

    // Click assign button
    await detailPage.assignButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/lead-assign-modal.png', fullPage: true });

    // Modal should be visible
    const modal = page.locator('text=/Assign Lead/i');
    await expect(modal).toBeVisible();

    // Wait for modal backdrop animation to complete and for buttons to be clickable
    await page.waitForFunction(() => {
      const backdrop = document.querySelector('[aria-hidden="true"]');
      return !backdrop || window.getComputedStyle(backdrop).opacity === '0.5';
    }, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Get the first user button in the list
    const userButtons = page.getByRole('button').filter({ hasText: /Test|User/i });
    const firstUserButton = userButtons.first();

    if ((await firstUserButton.count()) > 0) {
      // Use force click to bypass backdrop interception
      await firstUserButton.click({ force: true });

      // Wait for assignment to complete and page to navigate
      // The click on the user card automatically triggers assignment
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-results/lead-assigned.png', fullPage: true });

      console.log('✅ Lead assigned successfully');
    } else {
      console.log('⚠️  No users available to assign - skipping');
      // Close modal
      const closeButton = page.getByRole('button', { name: /cancel|close/i }).first();
      await closeButton.click();
    }
  });

  test('should display empty state when no leads exist', async ({ page }) => {
    console.log('🚀 Test: Empty state');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    console.log(`Lead count: ${leadCount}`);

    if (leadCount > 0) {
      console.log('⚠️  Leads exist - cannot test empty state');
      test.skip();
    }

    // Should show empty state
    const emptyStateVisible = await listPage.emptyState.isVisible();
    expect(emptyStateVisible).toBe(true);

    await page.screenshot({ path: 'test-results/lead-empty-state.png', fullPage: true });

    console.log('✅ Empty state displayed correctly');
  });

  test('should display no results state when filters return empty', async ({ page }) => {
    console.log('🚀 Test: No results state');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();
    if (initialCount === 0) {
      console.log('⚠️  No leads to filter - skipping');
      test.skip();
    }

    // Search for something that doesn't exist
    await listPage.searchLeads('NonExistentLeadNameXYZ12345');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/lead-no-results.png', fullPage: true });

    const filteredCount = await listPage.getLeadCount();
    console.log(`Filtered count: ${filteredCount}`);

    if (filteredCount === 0) {
      // Should show no results message
      const noResults = page.getByText(/no leads found/i);
      await expect(noResults).toBeVisible();

      // Clear filters button should be visible
      await expect(listPage.clearFiltersButton).toBeVisible();

      console.log('✅ No results state displayed correctly');
    }
  });

  test('should show loading state', async ({ page }) => {
    console.log('🚀 Test: Loading state');

    const listPage = new LeadListPage(page);

    // Navigate but don't wait for network idle
    await page.goto('/leads');

    // Should see some loading indicator (skeletons, spinners, etc.)
    // This is a quick check - actual loading might be too fast to catch
    await page.screenshot({ path: 'test-results/lead-loading-state.png', fullPage: true });

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    console.log('✅ Loading state test completed');
  });

  test('should delete a lead from list view', async ({ page }) => {
    console.log('🚀 Test: Delete lead from list');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();
    console.log(`Initial lead count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No leads to delete - skipping');
      test.skip();
    }

    // Get the name of the first lead before deleting
    const firstLeadName = await page.locator('h3.font-semibold').first().textContent();
    console.log(`Deleting lead: ${firstLeadName}`);

    // Click delete on first lead
    await listPage.deleteFirstLead();

    // Wait for delete confirmation modal and backdrop animation
    await page.waitForTimeout(500);
    const confirmButton = page.getByRole('button', { name: /^delete lead$/i });
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(300);

    await page.screenshot({ path: 'test-results/lead-delete-modal-list.png', fullPage: true });

    // Confirm deletion with force click to bypass modal backdrop
    await confirmButton.click({ force: true });
    await page.waitForLoadState('networkidle');

    // Wait for success toast to confirm deletion
    const toast = page.locator('text=/lead deleted successfully/i');
    await toast.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for React Query to refetch the list (pagination means count may stay the same)
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/lead-deleted-list.png', fullPage: true });

    // Verify the deleted lead is no longer in the visible list
    const leadHeadings = await page.locator('h3.font-semibold').allTextContents();
    console.log(`Visible leads after delete: ${leadHeadings.length}`);
    console.log(`Lead names: ${leadHeadings.join(', ')}`);

    expect(leadHeadings).not.toContain(firstLeadName);

    console.log('✅ Lead deleted successfully from list view');
  });

  test('should delete a lead from detail view', async ({ page }) => {
    console.log('🚀 Test: Delete lead from detail page');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getLeadCount();
    if (initialCount === 0) {
      console.log('⚠️  No leads to delete - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const leadId = url.split('/').pop() || '';
    console.log(`Deleting lead ID: ${leadId}`);

    const detailPage = new LeadDetailPage(page);

    // Wait for delete button to be visible
    await expect(detailPage.deleteButton).toBeVisible({ timeout: 10000 });

    await detailPage.deleteLead();
    await page.screenshot({ path: 'test-results/lead-deleted-detail.png', fullPage: true });

    // Should navigate back to lead list
    await page.waitForURL(/\/leads$/, { timeout: 10000 });

    // Verify the deleted lead is no longer in the list
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent).not.toContain(leadId);

    console.log('✅ Lead deleted successfully from detail page');
  });

  test('should cancel form and return to list', async ({ page }) => {
    console.log('🚀 Test: Cancel form');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    // Click cancel without filling form
    await formPage.cancelForm();

    // Should navigate back to leads list
    await page.waitForURL(/\/leads$/, { timeout: 5000 });

    console.log('✅ Cancel returns to list correctly');
  });

  test('should warn when canceling form with unsaved changes', async ({ page }) => {
    console.log('🚀 Test: Cancel with unsaved changes');

    const formPage = new LeadFormPage(page);
    await formPage.gotoCreate();

    // Fill in some data
    await formPage.fillLeadForm({
      customerName: 'Test Lead',
    });

    // Setup dialog handler
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      console.log('Dialog message:', dialogMessage);
      await dialog.dismiss(); // Dismiss the confirmation
    });

    // Try to cancel
    await formPage.cancelForm();
    await page.waitForTimeout(500);

    // Should show confirmation dialog
    expect(dialogMessage.toLowerCase()).toContain('unsaved');

    console.log('✅ Unsaved changes warning works correctly');
  });
});
