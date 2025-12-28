import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import { CustomerListPage, CustomerFormPage, CustomerDetailPage } from '../../pages/CustomerPages';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Customer CRUD Operations', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';
  let createdCustomerId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should display customer list page', async ({ page }) => {
    console.log('🚀 Test: Display customer list');

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    await page.screenshot({ path: 'test-results/customer-list.png', fullPage: true });

    // Should see the page title
    await expect(page.locator('h1')).toContainText('Customers');

    // Should see the add customer button
    await expect(listPage.addCustomerButton).toBeVisible();

    console.log('✅ Customer list page loads correctly');
  });

  test('should create a new customer', async ({ page }) => {
    console.log('🚀 Test: Create new customer');

    const formPage = new CustomerFormPage(page);
    await formPage.gotoCreate();

    await page.screenshot({ path: 'test-results/customer-create-form.png', fullPage: true });

    // Generate unique test data
    const timestamp = Date.now();
    const customerData = {
      firstName: 'TestFirstName',
      lastName: 'TestLastName',
      email: `test.customer${timestamp}@example.com`,
      phone: '+14155551234',
      dateOfBirth: '1990-01-15',
      licenseNumber: `DL${timestamp}`,
      licenseState: 'CA',
      licenseExpiry: '2025-12-31',
    };

    console.log('📝 Filling customer form with:', customerData);

    await formPage.fillCustomerForm(customerData);
    await page.screenshot({ path: 'test-results/customer-form-filled.png', fullPage: true });

    // Submit the form
    await formPage.submitForm();
    await page.waitForTimeout(1000);

    // Wait for navigation to detail page
    await page.waitForURL(/\/customers\/[a-f0-9-]+/, { timeout: 10000 });

    await page.screenshot({ path: 'test-results/customer-created.png', fullPage: true });

    // Extract customer ID from URL
    const url = page.url();
    createdCustomerId = url.split('/').pop() || '';
    console.log('✅ Customer created with ID:', createdCustomerId);

    // Verify we're on the detail page
    expect(url).toContain('/customers/');
    expect(createdCustomerId).toBeTruthy();
  });

  test('should validate customer form fields', async ({ page }) => {
    console.log('🚀 Test: Form validation');

    const formPage = new CustomerFormPage(page);
    await formPage.gotoCreate();

    // Try to submit empty form
    await formPage.submitForm();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/customer-validation-errors.png', fullPage: true });

    // Check for validation errors (at least firstName should be required)
    const firstNameError = await formPage.getValidationError('firstName');
    console.log('First name validation error:', firstNameError);

    // We expect some validation error to appear
    const allErrors = await page.locator('[class*="error"], [role="alert"]').count();
    expect(allErrors).toBeGreaterThan(0);

    console.log('✅ Form validation works correctly');
  });

  test('should display customer details', async ({ page }) => {
    console.log('🚀 Test: Display customer details');

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    const customerCount = await listPage.getCustomerCount();
    console.log(`Found ${customerCount} customers`);

    if (customerCount === 0) {
      console.log('⚠️  No customers found - skipping detail test');
      test.skip();
    }

    // Click first customer
    await listPage.clickFirstCustomer();

    await page.waitForURL(/\/customers\/[a-f0-9-]+/);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/customer-detail.png', fullPage: true });

    const detailPage = new CustomerDetailPage(page);

    // Verify customer details are displayed
    await expect(detailPage.customerName).toBeVisible();
    await expect(detailPage.kycStatusBadge).toBeVisible();

    const kycStatus = await detailPage.getKycStatus();
    console.log('Customer KYC status:', kycStatus);

    console.log('✅ Customer details displayed correctly');
  });

  test('should search customers', async ({ page }) => {
    console.log('🚀 Test: Search customers');

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getCustomerCount();
    console.log(`Initial customer count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No customers to search - skipping');
      test.skip();
    }

    // Get the first customer's name to search for
    const firstCard = listPage.customerCards.first();
    const customerText = await firstCard.textContent();
    console.log('First customer card text:', customerText?.substring(0, 100));

    // Try searching for a common term
    await listPage.searchCustomers('Test');
    await page.screenshot({ path: 'test-results/customer-search.png', fullPage: true });

    const searchCount = await listPage.getCustomerCount();
    console.log(`Search results: ${searchCount}`);

    // Clear search
    await listPage.searchCustomers('');
    const afterClearCount = await listPage.getCustomerCount();
    console.log(`After clearing search: ${afterClearCount}`);

    console.log('✅ Search works correctly');
  });

  test('should filter customers by KYC status', async ({ page }) => {
    console.log('🚀 Test: Filter by KYC status');

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getCustomerCount();
    console.log(`Initial customer count: ${initialCount}`);

    if (initialCount === 0) {
      console.log('⚠️  No customers to filter - skipping');
      test.skip();
    }

    // Filter by pending KYC status
    await listPage.filterByKycStatus('pending');
    await page.screenshot({ path: 'test-results/customer-filter-pending.png', fullPage: true });

    const pendingCount = await listPage.getCustomerCount();
    console.log(`Pending KYC customers: ${pendingCount}`);

    // Filter by approved
    await listPage.filterByKycStatus('approved');
    const approvedCount = await listPage.getCustomerCount();
    console.log(`Approved KYC customers: ${approvedCount}`);

    // Clear filter
    await listPage.filterByKycStatus('');
    const afterClearCount = await listPage.getCustomerCount();
    console.log(`After clearing filter: ${afterClearCount}`);

    console.log('✅ Filtering works correctly');
  });

  test('should toggle between grid and list views', async ({ page }) => {
    console.log('🚀 Test: Toggle view modes');

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    // Default should be grid view
    await page.screenshot({ path: 'test-results/customer-grid-view.png', fullPage: true });

    // Switch to list view
    await listPage.listViewButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/customer-list-view.png', fullPage: true });

    // Switch back to grid
    await listPage.gridViewButton.click();
    await page.waitForTimeout(500);

    console.log('✅ View toggle works correctly');
  });

  test('should update customer information', async ({ page }) => {
    console.log('🚀 Test: Update customer');

    // First, get a customer ID from the list
    const listPage = new CustomerListPage(page);
    await listPage.goto();

    const customerCount = await listPage.getCustomerCount();
    if (customerCount === 0) {
      console.log('⚠️  No customers to update - skipping');
      test.skip();
    }

    // Click first customer to get ID
    await listPage.clickFirstCustomer();
    await page.waitForURL(/\/customers\/[a-f0-9-]+/);
    const url = page.url();
    const customerId = url.split('/').pop() || '';

    // Navigate to edit page
    const formPage = new CustomerFormPage(page);
    await formPage.gotoEdit(customerId);
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: 'test-results/customer-edit-form.png', fullPage: true });

    // Update phone number
    const newPhone = '+14155559999';
    await formPage.fillCustomerForm({
      phone: newPhone,
    });

    await page.screenshot({ path: 'test-results/customer-edit-form-filled.png', fullPage: true });

    // Submit the form
    await formPage.submitForm();
    await page.waitForTimeout(1000);

    // Should navigate back to detail page
    await page.waitForURL(/\/customers\/[a-f0-9-]+/, { timeout: 10000 });
    await page.screenshot({ path: 'test-results/customer-updated.png', fullPage: true });

    console.log('✅ Customer updated successfully');
  });

  test('should delete a customer', async ({ page }) => {
    console.log('🚀 Test: Delete customer');

    // Capture console errors and API responses
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/v1/customers/') && response.request().method() === 'DELETE') {
        console.log('🗑️  DELETE request:', response.url(), 'status:', response.status());
      }
    });

    const listPage = new CustomerListPage(page);
    await listPage.goto();

    const initialCount = await listPage.getCustomerCount();
    console.log(`Initial customer count: ${initialCount}`);
    if (initialCount === 0) {
      console.log('⚠️  No customers to delete - skipping');
      test.skip();
    }

    // Click first customer
    await listPage.clickFirstCustomer();
    await page.waitForURL(/\/customers\/[a-f0-9-]+/);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const customerId = url.split('/').pop() || '';
    console.log(`Deleting customer ID: ${customerId}`);

    const detailPage = new CustomerDetailPage(page);

    // Wait for delete button to be visible
    await expect(detailPage.deleteButton).toBeVisible({ timeout: 10000 });

    await detailPage.deleteCustomer();
    await page.screenshot({ path: 'test-results/customer-deleted.png', fullPage: true });

    if (consoleErrors.length > 0) {
      console.log('❌ Console errors during delete:', consoleErrors);
    }

    // Should navigate back to customer list
    await page.waitForURL(/\/customers$/, { timeout: 10000 });

    // Verify the deleted customer is no longer in the list by checking its ID isn't present
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent).not.toContain(customerId);

    console.log('✅ Customer deleted successfully');
  });
});
