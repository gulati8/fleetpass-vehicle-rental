import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { LeadListPage, LeadDetailPage } from '../../pages/LeadPages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// TODO: Re-enable these tests after Deal Management backend is implemented
test.describe.skip('Lead Management - Conversion & Status Management', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should convert lead to deal', async ({ page }) => {
    test.setTimeout(60000); // 60 second timeout
    console.log('🚀 Test: Convert lead to deal');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    if (leadCount === 0) {
      console.log('⚠️  No leads to convert - skipping');
      test.skip();
    }

    // Filter for new or qualified leads (convertible statuses)
    await listPage.filterByStatus('new');
    const newLeadCount = await listPage.getLeadCount();

    if (newLeadCount === 0) {
      // Try qualified
      await listPage.filterByStatus('qualified');
      const qualifiedCount = await listPage.getLeadCount();

      if (qualifiedCount === 0) {
        console.log('⚠️  No convertible leads found - skipping');
        test.skip();
      }
    }

    // Click first convertible lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Verify convert button is visible and enabled
    const convertButton = detailPage.convertButton;
    await expect(convertButton).toBeVisible();
    const isDisabled = await convertButton.isDisabled();

    if (isDisabled) {
      console.log('⚠️  Convert button is disabled - lead may already be converted');
      test.skip();
    }

    // Click convert button
    await convertButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/lead-convert-modal.png', fullPage: true });

    // Modal should be visible
    const modal = page.locator('text=/Convert Lead/i');
    await expect(modal).toBeVisible();

    // Fill conversion form
    const dealValueInput = page.locator('input[name="dealValue"]');
    await dealValueInput.fill('25000');

    // Select vehicle if available
    const vehicleSelect = page.locator('select[name="vehicleId"]');
    const vehicleOptions = await vehicleSelect.locator('option').count();
    if (vehicleOptions > 1) {
      await vehicleSelect.selectOption({ index: 1 });
    }

    // Add notes
    const notesTextarea = page.locator('textarea[name="notes"]');
    await notesTextarea.fill('Converted from E2E test lead');

    await page.screenshot({ path: 'test-results/lead-convert-form-filled.png', fullPage: true });

    // Submit conversion
    const convertModalButton = page.getByRole('button', { name: /^convert$/i });
    await convertModalButton.click();

    // Should navigate to deals page
    await page.waitForURL(/\/deals\/[a-f0-9-]+$/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/lead-converted-deal.png', fullPage: true });

    const url = page.url();
    console.log('Redirected to deal:', url);

    expect(url).toContain('/deals/');

    console.log('✅ Lead converted to deal successfully');
  });

  test('should mark lead as lost', async ({ page }) => {
    console.log('🚀 Test: Mark lead as lost');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    if (leadCount === 0) {
      console.log('⚠️  No leads to mark as lost - skipping');
      test.skip();
    }

    // Filter for new leads (to ensure we can mark as lost)
    await listPage.filterByStatus('new');
    const newLeadCount = await listPage.getLeadCount();

    if (newLeadCount === 0) {
      console.log('⚠️  No new leads found - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Setup confirmation dialog handler
    page.on('dialog', async (dialog) => {
      console.log('Confirmation dialog:', dialog.message());
      await dialog.accept(); // Accept the confirmation
    });

    // Click mark as lost button
    await expect(detailPage.markAsLostButton).toBeVisible();
    await detailPage.markAsLostButton.click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/lead-marked-lost.png', fullPage: true });

    // Verify status changed to lost
    const status = await detailPage.getStatus();
    expect(status?.toLowerCase()).toContain('lost');

    // Verify convert button is now disabled
    const convertButton = detailPage.convertButton;
    const isDisabled = await convertButton.isDisabled();
    expect(isDisabled).toBe(true);

    console.log('✅ Lead marked as lost successfully');
  });

  test('should not allow converting already converted lead', async ({ page }) => {
    console.log('🚀 Test: Prevent converting converted lead');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    // Filter for converted leads
    await listPage.filterByStatus('converted');
    const convertedCount = await listPage.getLeadCount();

    if (convertedCount === 0) {
      console.log('⚠️  No converted leads found - skipping');
      test.skip();
    }

    // Click first converted lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    await page.screenshot({ path: 'test-results/lead-converted-disabled.png', fullPage: true });

    // Convert button should be disabled
    const convertButton = detailPage.convertButton;
    const isDisabled = await convertButton.isDisabled();
    expect(isDisabled).toBe(true);

    console.log('✅ Converted lead cannot be converted again');
  });

  test('should not allow marking converted lead as lost', async ({ page }) => {
    console.log('🚀 Test: Prevent marking converted lead as lost');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    // Filter for converted leads
    await listPage.filterByStatus('converted');
    const convertedCount = await listPage.getLeadCount();

    if (convertedCount === 0) {
      console.log('⚠️  No converted leads found - skipping');
      test.skip();
    }

    // Click first converted lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Mark as lost button should be disabled
    const markAsLostButton = detailPage.markAsLostButton;
    const isDisabled = await markAsLostButton.isDisabled();
    expect(isDisabled).toBe(true);

    console.log('✅ Converted lead cannot be marked as lost');
  });

  test('should validate conversion form', async ({ page }) => {
    console.log('🚀 Test: Conversion form validation');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    // Filter for new leads
    await listPage.filterByStatus('new');
    const newLeadCount = await listPage.getLeadCount();

    if (newLeadCount === 0) {
      console.log('⚠️  No new leads found - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Click convert button
    await detailPage.convertButton.click();
    await page.waitForTimeout(500);

    // Try to submit without filling required fields
    const convertModalButton = page.getByRole('button', { name: /^convert$/i });
    await convertModalButton.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/lead-convert-validation.png', fullPage: true });

    // Should show validation errors
    const errors = await page.locator('[class*="error"], [role="alert"]').count();
    expect(errors).toBeGreaterThan(0);

    console.log('✅ Conversion form validation works correctly');
  });

  test('should update lead status via edit form', async ({ page }) => {
    console.log('🚀 Test: Update lead status');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    // Filter for new leads
    await listPage.filterByStatus('new');
    const newLeadCount = await listPage.getLeadCount();

    if (newLeadCount === 0) {
      console.log('⚠️  No new leads found - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    const url = page.url();
    const leadId = url.split('/').pop() || '';

    // Click edit button
    const detailPage = new LeadDetailPage(page);
    await detailPage.editButton.click();

    // Wait for edit page
    await page.waitForURL(/\/leads\/[a-f0-9-]+\/edit$/);
    await page.waitForLoadState('networkidle');

    // Change status to contacted
    const statusSelect = page.locator('select[id="status"]');
    await statusSelect.selectOption('contacted');

    await page.screenshot({ path: 'test-results/lead-status-update.png', fullPage: true });

    // Submit form
    const submitButton = page.getByRole('button', { name: /update lead/i });
    await submitButton.click();

    // Wait for navigation back to detail page
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/lead-status-updated.png', fullPage: true });

    // Verify status changed
    const status = await detailPage.getStatus();
    expect(status?.toLowerCase()).toContain('contacted');

    console.log('✅ Lead status updated successfully');
  });

  test('should close conversion modal on cancel', async ({ page }) => {
    console.log('🚀 Test: Cancel conversion');

    const listPage = new LeadListPage(page);
    await listPage.goto();

    const leadCount = await listPage.getLeadCount();
    if (leadCount === 0) {
      console.log('⚠️  No leads found - skipping');
      test.skip();
    }

    // Click first lead
    await listPage.clickFirstLead();
    await page.waitForURL(/\/leads\/[a-f0-9-]+$/);
    await page.waitForLoadState('networkidle');

    const detailPage = new LeadDetailPage(page);

    // Click convert button
    await detailPage.convertButton.click();
    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.locator('text=/Convert Lead/i');
    await expect(modal).toBeVisible();

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    await cancelButton.click();
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(modal).not.toBeVisible();

    console.log('✅ Conversion modal closes on cancel');
  });
});
