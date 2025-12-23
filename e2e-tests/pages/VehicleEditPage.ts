import { Page, Locator } from '@playwright/test';

export class VehicleEditPage {
  readonly page: Page;
  readonly uploadButton: Locator;
  readonly fileInput: Locator;
  readonly imageGallery: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly imageCount: Locator;

  constructor(page: Page) {
    this.page = page;
    // Find upload button by text content
    this.uploadButton = page.getByRole('button', { name: /upload images/i });
    // File input is hidden but we can access it
    this.fileInput = page.locator('input[type="file"]');
    // Look for images in the gallery section
    this.imageGallery = page.locator('[data-testid="vehicle-image-gallery"]').or(
      page.locator('section:has-text("Vehicle Images")').locator('img')
    );
    // Success/error messages
    this.successMessage = page.locator('[role="alert"]').filter({ hasText: /success|uploaded/i });
    this.errorMessage = page.locator('[role="alert"]').filter({ hasText: /error|failed/i }).or(
      page.locator('text=/Upload Errors?:/i').locator('..')
    );
    // Image count indicator
    this.imageCount = page.locator('text=/\\d+ of \\d+ images/i');
  }

  async goto(vehicleId: string) {
    await this.page.goto(`/vehicles/${vehicleId}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  async uploadImage(imagePath: string) {
    // Set the file on the hidden input
    await this.fileInput.setInputFiles(imagePath);

    // Wait a bit for upload to process
    await this.page.waitForTimeout(2000);
  }

  async getDisplayedImages(): Promise<Locator[]> {
    // Wait for any images to appear
    await this.page.waitForTimeout(1000);

    // Find all img tags in the Vehicle Images section
    const section = this.page.locator('section:has-text("Vehicle Images")');
    return await section.locator('img').all();
  }

  async hasUploadErrors(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorText(): Promise<string | null> {
    if (await this.hasUploadErrors()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  async saveVehicle() {
    await this.page.getByRole('button', { name: /save changes/i }).click();
    await this.page.waitForURL(/\/vehicles\/[^/]+$/, { timeout: 10000 });
  }
}
