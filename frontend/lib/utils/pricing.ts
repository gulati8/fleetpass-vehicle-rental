/**
 * Pricing Utilities
 *
 * Shared pricing calculation logic for the booking wizard.
 * Used across Step 2 (Review), Step 3 (Payment), and Step 4 (Confirmation).
 */

/** Tax rate applied to rental subtotal (8%) */
export const TAX_RATE = 0.08;

/** Deposit percentage of total rental cost (20%) */
export const DEPOSIT_PERCENTAGE = 0.2;

/**
 * Pricing breakdown result
 */
export interface PricingBreakdown {
  /** Rental subtotal before tax (daily rate × days) in cents */
  subtotalCents: number;
  /** Tax amount in cents */
  taxCents: number;
  /** Total rental cost including tax in cents */
  totalCents: number;
  /** Required deposit amount (20% of total) in cents */
  depositCents: number;
}

/**
 * Calculate number of rental days from pickup/dropoff datetimes
 *
 * @param pickupDatetime - ISO 8601 pickup datetime string
 * @param dropoffDatetime - ISO 8601 dropoff datetime string
 * @returns Number of rental days (minimum 1)
 *
 * @example
 * ```ts
 * const days = calculateRentalDays('2024-01-01T10:00:00Z', '2024-01-03T14:00:00Z');
 * // Returns: 3
 * ```
 */
export function calculateRentalDays(pickupDatetime: string, dropoffDatetime: string): number {
  const pickup = new Date(pickupDatetime);
  const dropoff = new Date(dropoffDatetime);
  const days = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, days); // Minimum 1 day
}

/**
 * Calculate pricing breakdown based on daily rate and number of days
 *
 * All amounts are calculated in cents to avoid floating-point errors.
 *
 * @param dailyRateCents - Vehicle daily rental rate in cents
 * @param numDays - Number of rental days
 * @returns Pricing breakdown with subtotal, tax, total, and deposit
 *
 * @example
 * ```ts
 * const pricing = calculatePricing(10000, 3); // $100/day × 3 days
 * // Returns: {
 * //   subtotalCents: 30000,  // $300.00
 * //   taxCents: 2400,         // $24.00 (8%)
 * //   totalCents: 32400,      // $324.00
 * //   depositCents: 6480      // $64.80 (20%)
 * // }
 * ```
 */
export function calculatePricing(dailyRateCents: number, numDays: number): PricingBreakdown {
  const subtotalCents = dailyRateCents * numDays;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;
  const depositCents = Math.round(totalCents * DEPOSIT_PERCENTAGE);

  return {
    subtotalCents,
    taxCents,
    totalCents,
    depositCents,
  };
}
