import { z } from 'zod';

/**
 * Vehicle form validation schema
 * Matches backend vehicle types and provides comprehensive client-side validation
 */
export const vehicleSchema = z.object({
  // Core identifiers
  vin: z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format (no I, O, or Q)'),

  // Basic information
  make: z
    .string()
    .min(1, 'Make is required')
    .max(50, 'Make must be 50 characters or less')
    .trim(),

  model: z
    .string()
    .min(1, 'Model is required')
    .max(50, 'Model must be 50 characters or less')
    .trim(),

  year: z.coerce
    .number({ invalid_type_error: 'Year must be a number' })
    .int('Year must be a whole number')
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, `Year cannot be more than ${new Date().getFullYear() + 1}`),

  trim: z
    .string()
    .max(50, 'Trim must be 50 characters or less')
    .trim()
    .optional()
    .nullable(),

  // Vehicle details
  bodyType: z
    .enum(['sedan', 'suv', 'truck', 'van', 'luxury', 'coupe', 'convertible', 'wagon', 'hatchback'], {
      errorMap: () => ({ message: 'Please select a valid body type' }),
    })
    .optional()
    .nullable(),

  exteriorColor: z
    .string()
    .max(30, 'Color must be 30 characters or less')
    .trim()
    .optional()
    .nullable(),

  interiorColor: z
    .string()
    .max(30, 'Color must be 30 characters or less')
    .trim()
    .optional()
    .nullable(),

  transmission: z
    .enum(['automatic', 'manual', 'cvt'], {
      errorMap: () => ({ message: 'Please select a valid transmission type' }),
    })
    .optional()
    .nullable(),

  fuelType: z
    .enum(['gas', 'diesel', 'electric', 'hybrid'], {
      errorMap: () => ({ message: 'Please select a valid fuel type' }),
    })
    .optional()
    .nullable(),

  mileage: z.coerce
    .number({ invalid_type_error: 'Mileage must be a number' })
    .int('Mileage must be a whole number')
    .min(0, 'Mileage cannot be negative')
    .optional()
    .nullable(),

  // Pricing (form input in dollars, stored in cents)
  dailyRateCents: z.coerce
    .number({ invalid_type_error: 'Daily rate must be a number' })
    .positive('Daily rate must be greater than 0')
    .min(1, 'Daily rate must be at least $1.00')
    .max(9999, 'Daily rate cannot exceed $9,999.00'),

  weeklyRateCents: z
    .union([
      z.string().transform((val) => (val === '' ? null : parseFloat(val))),
      z.number(),
    ])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || val > 0, {
      message: 'Weekly rate must be greater than 0 if provided',
    }),

  monthlyRateCents: z
    .union([
      z.string().transform((val) => (val === '' ? null : parseFloat(val))),
      z.number(),
    ])
    .optional()
    .nullable()
    .refine((val) => val === null || val === undefined || val > 0, {
      message: 'Monthly rate must be greater than 0 if provided',
    }),

  // Location and availability
  locationId: z
    .string()
    .uuid('Invalid location')
    .min(1, 'Location is required'),

  isAvailableForRent: z
    .boolean()
    .default(true),

  // Optional details
  features: z
    .record(z.any())
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .trim()
    .optional()
    .nullable(),

  imageUrls: z
    .array(z.string().url('Invalid image URL'))
    .optional()
    .default([]),
});

/**
 * Type inference from schema
 */
export type VehicleFormData = z.infer<typeof vehicleSchema>;

/**
 * Helper to convert form data (dollars) to API format (cents)
 */
export function formDataToApiFormat(data: VehicleFormData) {
  return {
    ...data,
    // Ensure cents values are integers
    dailyRateCents: Math.round(data.dailyRateCents),
    weeklyRateCents: data.weeklyRateCents ? Math.round(data.weeklyRateCents) : null,
    monthlyRateCents: data.monthlyRateCents ? Math.round(data.monthlyRateCents) : null,
  };
}

/**
 * Helper to convert API format (cents) to form data (dollars for display)
 */
export function apiFormatToFormData(vehicle: any): Partial<VehicleFormData> {
  return {
    ...vehicle,
    // Convert cents to dollars for form input
    dailyRateCents: vehicle.dailyRateCents / 100,
    weeklyRateCents: vehicle.weeklyRateCents ? vehicle.weeklyRateCents / 100 : null,
    monthlyRateCents: vehicle.monthlyRateCents ? vehicle.monthlyRateCents / 100 : null,
  };
}

/**
 * Helper to format cents to dollar display
 */
export function formatCentsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Helper to convert dollar input to cents
 */
export function dollarsToCents(dollars: string | number): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return Math.round(num * 100);
}
