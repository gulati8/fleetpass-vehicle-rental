import { Page } from '@playwright/test';
import { randomUUID } from 'crypto';

export interface TestVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
}

/**
 * Helper class for managing test vehicles
 * Creates and cleans up vehicles to ensure test isolation
 */
export class VehicleHelper {
  private apiUrl: string;
  private createdVehicles: string[] = [];

  constructor() {
    this.apiUrl = process.env.API_URL || 'http://localhost:3001';
  }

  /**
   * Create a test vehicle that's guaranteed to be available
   */
  async createTestVehicle(page: Page, options?: {
    make?: string;
    model?: string;
    year?: number;
  }): Promise<TestVehicle> {
    const timestamp = Date.now();
    const vehicleData = {
      make: options?.make || 'TestMake',
      model: options?.model || 'TestModel',
      year: options?.year || 2024,
      vin: `TEST${timestamp}`.substring(0, 17),
      dailyRateCents: 10000, // $100/day
      fuelType: 'gas',
      transmission: 'automatic',
      mileage: 1000,
      isAvailableForRent: true,
      // Use the first location by default
      locationId: await this.getFirstLocationId(page),
    };

    const response = await page.request.post(`${this.apiUrl}/api/v1/vehicles`, {
      data: vehicleData,
      headers: {
        'Idempotency-Key': randomUUID(),
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create test vehicle: ${response.status()} ${error}`);
    }

    const result = await response.json();
    const vehicle = result.data as TestVehicle;

    // Track for cleanup
    this.createdVehicles.push(vehicle.id);

    console.log(`✅ Created test vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.id})`);

    return vehicle;
  }

  /**
   * Get the first location ID from the organization
   */
  private async getFirstLocationId(page: Page): Promise<string> {
    const response = await page.request.get(`${this.apiUrl}/api/v1/locations`);

    if (!response.ok()) {
      throw new Error('Failed to fetch locations');
    }

    const result = await response.json();
    const locations = result.data;

    if (!locations || locations.length === 0) {
      throw new Error('No locations available - cannot create test vehicle');
    }

    return locations[0].id;
  }

  /**
   * Clean up all created test vehicles
   */
  async cleanup(page: Page): Promise<void> {
    for (const vehicleId of this.createdVehicles) {
      try {
        const response = await page.request.delete(
          `${this.apiUrl}/api/v1/vehicles/${vehicleId}`,
          {
            headers: {
              'Idempotency-Key': randomUUID(),
            },
          }
        );

        if (response.ok()) {
          console.log(`🧹 Cleaned up test vehicle: ${vehicleId}`);
        } else {
          console.warn(`⚠️  Failed to delete vehicle ${vehicleId}: ${response.status()}`);
        }
      } catch (error) {
        console.warn(`⚠️  Error deleting vehicle ${vehicleId}:`, error);
      }
    }

    this.createdVehicles = [];
  }

  /**
   * Get count of vehicles created in this session
   */
  getCreatedCount(): number {
    return this.createdVehicles.length;
  }
}
