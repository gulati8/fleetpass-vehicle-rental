import { z } from 'zod';
import { LeadStatus, LeadSource, type LeadWithRelations, type CreateLeadRequest, type UpdateLeadRequest } from '@shared/types';

/**
 * Lead form validation schema
 * Matches backend lead types and provides comprehensive client-side validation
 */
export const leadSchema = z.object({
  // Customer information
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),

  customerEmail: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        return z.string().email().safeParse(val).success;
      },
      { message: 'Invalid email address' }
    )
    .transform(val => val === '' || !val ? null : val),

  customerPhone: z
    .union([
      z.string()
        .regex(
          /^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
          'Invalid phone number format. Use format: (555) 555-5555'
        ),
      z.literal(''),
    ])
    .optional()
    .nullable()
    .transform(val => {
      if (!val || val === '') return null;
      // Normalize phone to E.164 format for storage
      const cleaned = val.replace(/\D/g, '');
      if (cleaned.length === 10) return `+1${cleaned}`;
      if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
      return val; // Return as-is if it doesn't match expected formats
    }),

  // Lead metadata
  source: z
    .enum([
      LeadSource.WEBSITE,
      LeadSource.PHONE,
      LeadSource.WALK_IN,
      LeadSource.REFERRAL,
      LeadSource.SOCIAL_MEDIA,
      LeadSource.OTHER,
    ] as const, {
      errorMap: () => ({ message: 'Please select a valid lead source' }),
    })
    .optional()
    .nullable(),

  vehicleInterestId: z
    .union([
      z.string().uuid('Invalid vehicle selection'),
      z.literal(''),
    ])
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  assignedToId: z
    .union([
      z.string().uuid('Invalid user selection'),
      z.literal(''),
    ])
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .trim()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Status (for edit mode only)
  status: z
    .enum([
      LeadStatus.NEW,
      LeadStatus.CONTACTED,
      LeadStatus.QUALIFIED,
      LeadStatus.CONVERTED,
      LeadStatus.LOST,
    ] as const, {
      errorMap: () => ({ message: 'Please select a valid status' }),
    })
    .optional()
    .nullable(),
});

/**
 * Type inference from schema
 */
export type LeadFormData = z.infer<typeof leadSchema>;

/**
 * Helper to convert form data to API format for create
 */
export function formDataToCreateRequest(formData: LeadFormData): CreateLeadRequest {
  return {
    customerName: formData.customerName,
    customerEmail: formData.customerEmail ?? undefined,
    customerPhone: formData.customerPhone ?? undefined,
    source: formData.source ?? undefined,
    vehicleInterestId: formData.vehicleInterestId ?? undefined,
    assignedToId: formData.assignedToId ?? undefined,
    notes: formData.notes ?? undefined,
  };
}

/**
 * Helper to convert form data to API format for update
 */
export function formDataToUpdateRequest(formData: LeadFormData): UpdateLeadRequest {
  return {
    customerName: formData.customerName,
    customerEmail: formData.customerEmail ?? undefined,
    customerPhone: formData.customerPhone ?? undefined,
    source: formData.source ?? undefined,
    vehicleInterestId: formData.vehicleInterestId ?? undefined,
    assignedToId: formData.assignedToId ?? undefined,
    notes: formData.notes ?? undefined,
    status: formData.status ?? undefined,
  };
}

/**
 * Helper to convert API format to form data
 */
export function apiFormatToFormData(lead: LeadWithRelations): LeadFormData {
  return {
    customerName: lead.customerName || '',
    customerEmail: lead.customerEmail,
    customerPhone: lead.customerPhone,
    source: lead.source as LeadSource | null,
    vehicleInterestId: lead.vehicleInterestId,
    assignedToId: lead.assignedToId,
    notes: lead.notes,
    status: lead.status as LeadStatus,
  };
}

/**
 * Helper to format phone for display
 * Converts E.164 format (+15551234567) to human-readable format (555) 123-4567
 */
export function formatPhoneDisplay(phone: string | null): string {
  if (!phone) return 'N/A';

  const cleaned = phone.replace(/\D/g, '');

  // Handle E.164 format with country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const lineNumber = cleaned.slice(7);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  // Handle 10-digit US phone
  if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const lineNumber = cleaned.slice(6);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  // Return as-is if format is unexpected
  return phone;
}

/**
 * Helper to capitalize source text for display
 * Examples: "website" → "Website", "walk_in" → "Walk In"
 */
export function formatSourceDisplay(source: string | null): string {
  if (!source) return 'Unknown';

  return source
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Helper to capitalize status text for display
 * Examples: "new" → "New", "contacted" → "Contacted"
 */
export function formatStatusDisplay(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
