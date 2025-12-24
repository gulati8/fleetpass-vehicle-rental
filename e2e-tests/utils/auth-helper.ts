import { Page } from '@playwright/test';
import { LoginPage, SignupPage } from '../pages/AuthPages';

export class AuthHelper {
  /**
   * Login with existing credentials
   */
  async login(page: Page, email: string, password: string) {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    // Wait for navigation to complete
    await page.waitForURL(/\/(dealer|dashboard|vehicles)/, { timeout: 10000 });
  }

  /**
   * Signup new user (creates new organization)
   */
  async signup(
    page: Page,
    data: {
      organizationName: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }
  ) {
    const signupPage = new SignupPage(page);
    await signupPage.goto();
    await signupPage.signup(data);

    // Wait for navigation to dealer dashboard after successful signup
    await page.waitForURL(/\/(dealer|dashboard)/, { timeout: 10000 });
  }

  /**
   * Logout current user by clearing session
   * Note: Since we use HttpOnly cookies, we simulate logout by clearing storage and navigating to login
   */
  async logout(page: Page) {
    // Clear all cookies and storage
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to login page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(page: Page): Promise<boolean> {
    const url = page.url();
    return url.includes('/dealer') || url.includes('/dashboard') || url.includes('/vehicles') || url.includes('/customers') || url.includes('/bookings');
  }

  /**
   * Attempt to access protected route and verify redirect to login
   */
  async expectUnauthenticatedRedirect(page: Page, protectedUrl: string) {
    await page.goto(protectedUrl);
    // Should redirect to login page
    await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
  }

  /**
   * Generate unique test user credentials
   */
  generateTestUser() {
    const timestamp = Date.now();
    return {
      organizationName: `Test Org ${timestamp}`,
      firstName: 'Test',
      lastName: 'User',
      email: `test-${timestamp}@example.com`,
      // Strong password that meets all requirements and isn't common
      password: `TestUser${timestamp}!@#`,
    };
  }
}
