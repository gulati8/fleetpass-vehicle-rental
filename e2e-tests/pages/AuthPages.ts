import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Login Page
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly sessionExpiredAlert: Locator;
  readonly errorMessage: Locator;
  readonly signupLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.sessionExpiredAlert = page.getByText(/your session has expired/i);
    this.errorMessage = page.locator('.text-red-800');
    this.signupLink = page.getByRole('link', { name: /sign up/i });
  }

  async goto() {
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async hasSessionExpiredAlert(): Promise<boolean> {
    return await this.sessionExpiredAlert.isVisible().catch(() => false);
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }
}

/**
 * Page Object for Signup Page
 */
export class SignupPage {
  readonly page: Page;
  readonly organizationNameInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.organizationNameInput = page.locator('input[name="organizationName"]');
    this.firstNameInput = page.locator('input[name="firstName"]');
    this.lastNameInput = page.locator('input[name="lastName"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.getByRole('button', { name: /sign up|create account/i });
    this.errorMessage = page.locator('.text-red-800');
    this.loginLink = page.getByRole('link', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto('/auth/signup');
    await this.page.waitForLoadState('networkidle');
  }

  async signup(data: {
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.organizationNameInput.fill(data.organizationName);
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    try {
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }
}

/**
 * Page Object for common navigation and auth state checks
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1').first();
  }

  async goto() {
    await this.page.goto('/dealer');
    await this.page.waitForLoadState('networkidle');
  }

  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    // If we're on dealer dashboard, we're logged in
    // If redirected to login, we're not
    return url.includes('/dealer') || url.includes('/dashboard');
  }
}
