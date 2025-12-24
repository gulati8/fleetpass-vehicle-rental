import { z } from 'zod';

/**
 * US State codes for validation
 */
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
] as const;

/**
 * Customer form validation schema
 */
export const customerSchema = z.object({
  // Required fields
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(100, 'Email must be 100 characters or less')
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^\+?1?\s*\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      'Invalid phone number format. Use format: (555) 555-5555'
    )
    .transform((val) => {
      // Normalize phone to E.164 format for storage
      const cleaned = val.replace(/\D/g, '');
      if (cleaned.length === 10) return `+1${cleaned}`;
      if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
      return val; // Let backend handle if still invalid
    }),

  // Optional personal info
  dateOfBirth: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
        (date) => {
          const dob = new Date(date);
          if (isNaN(dob.getTime())) return false;
          const age = (new Date().getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          return age >= 18 && age <= 120;
        },
        { message: 'Customer must be between 18 and 120 years old' }
      ),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable(),

  // Driver's license
  driverLicenseNumber: z
    .string()
    .max(20, 'License number must be 20 characters or less')
    .trim()
    .optional()
    .nullable(),

  driverLicenseState: z
    .enum(US_STATES as any, {
      errorMap: () => ({ message: 'Please select a valid US state' }),
    })
    .optional()
    .nullable(),

  driverLicenseExpiry: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
        (date) => {
          const expiry = new Date(date);
          if (isNaN(expiry.getTime())) return false;
          // License must not be expired (compare dates only, not time)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today;
        },
        { message: 'Driver\'s license must not be expired' }
      ),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .nullable(),
});

/**
 * KYC document submission schema
 */
export const kycDocumentSchema = z.object({
  idType: z.enum(['dl', 'passport', 'state_id'], {
    errorMap: () => ({ message: 'Please select a valid ID type' }),
  }),

  country: z
    .string()
    .length(2, 'Country code must be 2 characters')
    .default('US'),

  frontPhoto: z
    .instanceof(File, { message: 'Front photo is required' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type),
      'File must be JPG, PNG, or PDF'
    ),

  backPhoto: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type),
      'File must be JPG, PNG, or PDF'
    )
    .optional()
    .nullable(),
});

/**
 * KYC selfie submission schema
 */
export const kycSelfieSchema = z.object({
  imageData: z
    .instanceof(File, { message: 'Selfie photo is required' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type),
      'Selfie must be JPG or PNG'
    ),
});

/**
 * Type inference from schemas
 */
export type CustomerFormData = z.infer<typeof customerSchema>;
export type KYCDocumentFormData = z.infer<typeof kycDocumentSchema>;
export type KYCSelfieFormData = z.infer<typeof kycSelfieSchema>;

/**
 * Helper to format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.slice(1, 4);
    const prefix = cleaned.slice(4, 7);
    const lineNumber = cleaned.slice(7);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }
  if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 3);
    const prefix = cleaned.slice(3, 6);
    const lineNumber = cleaned.slice(6);
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }
  return phone;
}

/**
 * Helper to format date for display
 */
export function formatDateDisplay(dateString: string | null): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Helper to calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const ageDiff = Date.now() - dob.getTime();
  const ageDate = new Date(ageDiff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
