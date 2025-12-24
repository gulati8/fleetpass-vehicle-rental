import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../utils/auth-helper';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

test.describe('Customer Form Validation', () => {
  let authHelper: AuthHelper;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'password';

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper();
    await authHelper.login(page, testEmail, testPassword);
  });

  test('should accept valid date of birth (47 years old)', async ({ page }) => {
    console.log('🚀 Test: Valid date of birth (1977-10-01)');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    // Fill in required fields
    await page.locator('input[name="firstName"]').fill('Amit');
    await page.locator('input[name="lastName"]').fill('Gulati');
    await page.locator('input[name="email"]').fill(`test-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('7037861031');

    // Fill date of birth - should be accepted (47 years old)
    await page.locator('input[name="dateOfBirth"]').fill('1977-10-01');

    await page.screenshot({ path: 'test-results/customer-dob-filled.png' });

    // Try to submit
    await page.getByRole('button', { name: /save customer/i }).click();

    // Wait a moment for validation
    await page.waitForTimeout(1000);

    // Check if we're still on the form (validation failed) or navigated (success)
    const currentUrl = page.url();

    // Should NOT show age validation error (check for specific error message, not hint)
    const ageError = await page.getByText(/must be between 18 and 120 years old/i).isVisible().catch(() => false);

    console.log('Current URL:', currentUrl);
    console.log('Age error visible:', ageError);

    expect(ageError).toBe(false);
    console.log('✅ Valid DOB accepted (no age error)');
  });

  test('should accept future license expiry date (2030)', async ({ page }) => {
    console.log('🚀 Test: Valid license expiry (2030-11-12)');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    // Fill required fields
    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(`test-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('5551234567');

    // Fill license info
    await page.locator('input[name="driverLicenseNumber"]').fill('D1234567');
    await page.locator('select[name="driverLicenseState"]').selectOption('AL');
    await page.locator('input[name="driverLicenseExpiry"]').fill('2030-11-12');

    await page.screenshot({ path: 'test-results/customer-license-filled.png' });

    // Try to submit
    await page.getByRole('button', { name: /save customer/i }).click();

    await page.waitForTimeout(1000);

    // Should NOT show expiry error
    const expiryError = await page.getByText(/license.*expired/i).isVisible().catch(() => false);

    console.log('Expiry error visible:', expiryError);

    expect(expiryError).toBe(false);
    console.log('✅ Future expiry date accepted');
  });

  test('should reject date of birth for 10 year old', async ({ page }) => {
    console.log('🚀 Test: Reject underage DOB');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const dobString = tenYearsAgo.toISOString().split('T')[0];

    await page.locator('input[name="firstName"]').fill('Child');
    await page.locator('input[name="lastName"]').fill('User');
    await page.locator('input[name="email"]').fill(`child-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('5559876543');
    await page.locator('input[name="dateOfBirth"]').fill(dobString);

    await page.screenshot({ path: 'test-results/customer-underage.png' });

    await page.getByRole('button', { name: /save customer/i }).click();
    await page.waitForTimeout(1000);

    // Should show age validation error (check for specific error message)
    const ageError = await page.getByText(/must be between 18 and 120 years old/i).isVisible().catch(() => false);

    console.log('Age error visible:', ageError);
    expect(ageError).toBe(true);
    console.log('✅ Underage DOB properly rejected');
  });

  test('should reject expired license', async ({ page }) => {
    console.log('🚀 Test: Reject expired license');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="firstName"]').fill('Expired');
    await page.locator('input[name="lastName"]').fill('License');
    await page.locator('input[name="email"]').fill(`expired-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('5551112222');
    await page.locator('input[name="driverLicenseNumber"]').fill('EXP123');
    await page.locator('select[name="driverLicenseState"]').selectOption('CA');
    await page.locator('input[name="driverLicenseExpiry"]').fill('2020-01-01'); // Expired

    await page.screenshot({ path: 'test-results/customer-expired-license.png' });

    await page.getByRole('button', { name: /save customer/i }).click();
    await page.waitForTimeout(1000);

    // Should show expiry error
    const expiryError = await page.getByText(/license.*expired/i).isVisible().catch(() => false);

    console.log('Expiry error visible:', expiryError);
    expect(expiryError).toBe(true);
    console.log('✅ Expired license properly rejected');
  });

  test('should validate phone number format', async ({ page }) => {
    console.log('🚀 Test: Phone number validation');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="firstName"]').fill('Test');
    await page.locator('input[name="lastName"]').fill('Phone');
    await page.locator('input[name="email"]').fill(`phone-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill('invalid'); // Invalid phone

    await page.screenshot({ path: 'test-results/customer-invalid-phone.png' });

    await page.getByRole('button', { name: /save customer/i }).click();
    await page.waitForTimeout(1000);

    // Should show phone error
    const phoneError = await page.getByText(/invalid phone/i).isVisible().catch(() => false);

    console.log('Phone error visible:', phoneError);
    expect(phoneError).toBe(true);
    console.log('✅ Invalid phone number rejected');
  });

  test('REGRESSION: Issue from screenshot - 1977 DOB and 2030 expiry', async ({ page }) => {
    console.log('🚀 Test: REGRESSION - Exact values from user screenshot');

    await page.goto('/customers/new');
    await page.waitForLoadState('networkidle');

    // Exact values from the screenshot the user shared
    await page.locator('input[name="firstName"]').fill('Amit');
    await page.locator('input[name="lastName"]').fill('Gulati');
    await page.locator('input[name="email"]').fill('gulati8@gmail.com');
    await page.locator('input[name="phone"]').fill('7037861031');
    await page.locator('input[name="dateOfBirth"]').fill('1977-10-01');
    await page.locator('input[name="driverLicenseNumber"]').fill('d1234567');
    await page.locator('select[name="driverLicenseState"]').selectOption('AL');
    await page.locator('input[name="driverLicenseExpiry"]').fill('2030-11-12');

    await page.screenshot({ path: 'test-results/customer-regression-exact.png', fullPage: true });

    // Submit the form
    await page.getByRole('button', { name: /save customer/i }).click();

    // Wait for potential navigation or error
    await page.waitForTimeout(2000);

    // Should NOT have validation errors for these valid values (check for specific error messages)
    const ageError = await page.getByText(/must be between 18 and 120 years old/i).isVisible().catch(() => false);
    const expiryError = await page.getByText(/license.*expired/i).isVisible().catch(() => false);

    await page.screenshot({ path: 'test-results/customer-regression-after-submit.png', fullPage: true });

    console.log('Age error:', ageError);
    console.log('Expiry error:', expiryError);

    expect(ageError).toBe(false);
    expect(expiryError).toBe(false);

    console.log('✅ REGRESSION TEST PASSED - User screenshot values now work!');
  });
});
