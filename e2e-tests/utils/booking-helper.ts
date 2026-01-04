import { Page } from '@playwright/test';
import { randomUUID } from 'crypto';

export interface TestBooking {
  id: string;
  bookingNumber: string;
  customerId: string;
  vehicleId: string;
  pickupDatetime: string;
  dropoffDatetime: string;
  status: string;
}

/**
 * Helper class for managing test bookings
 * Creates and cleans up bookings to ensure test isolation
 */
export class BookingHelper {
  private apiUrl: string;
  private createdBookings: string[] = [];

  constructor() {
    this.apiUrl = process.env.API_URL || 'http://localhost:3001';
  }

  /**
   * Get the first customer ID from the organization
   */
  async getFirstCustomerId(page: Page): Promise<string> {
    const response = await page.request.get(`${this.apiUrl}/api/v1/customers`);

    if (!response.ok()) {
      throw new Error('Failed to fetch customers');
    }

    const result = await response.json();
    const customers = result.data;

    if (!customers || customers.length === 0) {
      throw new Error('No customers available - cannot create test booking');
    }

    return customers[0].id;
  }

  /**
   * Get the first location ID from the organization
   */
  async getFirstLocationId(page: Page): Promise<string> {
    const response = await page.request.get(`${this.apiUrl}/api/v1/locations`);

    if (!response.ok()) {
      throw new Error('Failed to fetch locations');
    }

    const result = await response.json();
    const locations = result.data;

    if (!locations || locations.length === 0) {
      throw new Error('No locations available - cannot create test booking');
    }

    return locations[0].id;
  }

  /**
   * Create a test booking with specific date range
   */
  async createTestBooking(
    page: Page,
    options: {
      vehicleId: string;
      customerId?: string;
      pickupDate?: Date;
      dropoffDate?: Date;
      daysFromNow?: number;
      rentalDays?: number;
      status?: string;
    }
  ): Promise<TestBooking> {
    // Get customer and location IDs
    const customerId = options.customerId || (await this.getFirstCustomerId(page));
    const locationId = await this.getFirstLocationId(page);

    // Calculate dates
    const pickupDate = options.pickupDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() + (options.daysFromNow || 7));
      date.setHours(10, 0, 0, 0);
      return date;
    })();

    const dropoffDate = options.dropoffDate || (() => {
      const date = new Date(pickupDate);
      date.setDate(date.getDate() + (options.rentalDays || 3));
      date.setHours(14, 0, 0, 0);
      return date;
    })();

    const bookingData = {
      customerId,
      vehicleId: options.vehicleId,
      pickupLocationId: locationId,
      dropoffLocationId: locationId,
      pickupDatetime: pickupDate.toISOString(),
      dropoffDatetime: dropoffDate.toISOString(),
      notes: 'E2E test booking',
    };

    const response = await page.request.post(`${this.apiUrl}/api/v1/bookings`, {
      data: bookingData,
      headers: {
        'Idempotency-Key': randomUUID(),
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create test booking: ${response.status()} ${error}`);
    }

    const result = await response.json();
    const booking = result.data as TestBooking;

    // Track for cleanup
    this.createdBookings.push(booking.id);

    console.log(`✅ Created test booking: ${booking.bookingNumber} (${booking.id})`);

    return booking;
  }

  /**
   * Create multiple test bookings with different date ranges
   */
  async createMultipleBookings(
    page: Page,
    vehicleId: string,
    count: number,
    options?: {
      startDaysFromNow?: number;
      daysBetweenBookings?: number;
      rentalDays?: number;
    }
  ): Promise<TestBooking[]> {
    const bookings: TestBooking[] = [];
    const startDaysFromNow = options?.startDaysFromNow || 7;
    const daysBetweenBookings = options?.daysBetweenBookings || 7;
    const rentalDays = options?.rentalDays || 3;

    for (let i = 0; i < count; i++) {
      const booking = await this.createTestBooking(page, {
        vehicleId,
        daysFromNow: startDaysFromNow + i * daysBetweenBookings,
        rentalDays,
      });
      bookings.push(booking);
    }

    return bookings;
  }

  /**
   * Clean up all created test bookings
   */
  async cleanup(page: Page): Promise<void> {
    for (const bookingId of this.createdBookings) {
      try {
        const response = await page.request.delete(
          `${this.apiUrl}/api/v1/bookings/${bookingId}`,
          {
            headers: {
              'Idempotency-Key': randomUUID(),
            },
          }
        );

        if (response.ok()) {
          console.log(`🧹 Cleaned up test booking: ${bookingId}`);
        } else {
          console.warn(`⚠️  Failed to delete booking ${bookingId}: ${response.status()}`);
        }
      } catch (error) {
        console.warn(`⚠️  Error deleting booking ${bookingId}:`, error);
      }
    }

    this.createdBookings = [];
  }

  /**
   * Get count of bookings created in this session
   */
  getCreatedCount(): number {
    return this.createdBookings.length;
  }

  /**
   * Generate an array of dates between two dates (inclusive)
   */
  static generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Format date for display comparison
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
