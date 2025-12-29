import { z } from 'zod';

/**
 * Validates that a card number has exactly 16 digits (spaces allowed for formatting)
 * Implements optional Luhn algorithm check for card validity
 */
const validateCardNumber = (value: string): boolean => {
  // Remove spaces for validation
  const cleanedNumber = value.replace(/\s/g, '');

  // Check if exactly 16 digits
  if (!/^\d{16}$/.test(cleanedNumber)) {
    return false;
  }

  // Luhn algorithm validation
  let sum = 0;
  let isEven = false;

  for (let i = cleanedNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanedNumber.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validates expiry date is in MM/YY format and represents a future date
 */
const validateExpiry = (value: string): boolean => {
  // Check MM/YY format
  const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
  if (!expiryRegex.test(value)) {
    return false;
  }

  const [month, year] = value.split('/');
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  // Validate month is 01-12
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }

  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Last 2 digits
  const currentMonth = now.getMonth() + 1; // 1-12

  // Card is valid if: year is in future, OR year is current and month is current or future
  if (yearNum > currentYear) {
    return true;
  }

  if (yearNum === currentYear && monthNum >= currentMonth) {
    return true;
  }

  return false;
};

/**
 * Validates cardholder name contains only letters, spaces, and hyphens
 */
const validateCardholderName = (value: string): boolean => {
  return /^[a-zA-Z\s\-]+$/.test(value);
};

export const paymentFormSchema = z.object({
  cardNumber: z
    .string()
    .min(1, 'Card number is required')
    .refine(
      (value) => /^[\d\s]{16,19}$/.test(value),
      'Card number must be 16 digits'
    )
    .refine(
      (value) => validateCardNumber(value),
      'Card number is invalid'
    ),

  expiry: z
    .string()
    .min(1, 'Expiry date is required')
    .refine(
      (value) => /^\d{2}\s*\/\s*\d{2}$/.test(value),
      'Expiry date must be in MM/YY format'
    )
    .refine(
      (value) => validateExpiry(value.replace(/\s/g, '')),
      'Expiry date must be in the future'
    ),

  cvv: z
    .string()
    .min(1, 'CVV is required')
    .refine(
      (value) => /^\d{3,4}$/.test(value),
      'CVV must be 3 or 4 digits'
    ),

  cardholderName: z
    .string()
    .min(1, 'Cardholder name is required')
    .min(2, 'Cardholder name must be at least 2 characters')
    .max(100, 'Cardholder name must not exceed 100 characters')
    .refine(
      (value) => validateCardholderName(value),
      'Cardholder name can only contain letters, spaces, and hyphens'
    ),

  termsAccepted: z
    .boolean()
    .refine(
      (value) => value === true,
      'Terms and conditions must be accepted'
    ),
});

/**
 * Inferred TypeScript type from the Zod schema
 * Use this type for form data and API requests
 */
export type PaymentFormData = z.infer<typeof paymentFormSchema>;
