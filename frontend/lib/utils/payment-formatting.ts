/**
 * Payment Formatting Utilities
 *
 * Helper functions for formatting payment-related input fields.
 * These utilities provide consistent formatting for credit card numbers and expiry dates.
 */

/**
 * Formats a card number with spaces (XXXX XXXX XXXX XXXX)
 *
 * Removes all non-digit characters and groups digits into blocks of 4,
 * separated by spaces. Limits output to 19 characters (16 digits + 3 spaces).
 *
 * @param value - Raw card number input (may contain spaces or other characters)
 * @returns Formatted card number with spaces every 4 digits
 *
 * @example
 * formatCardNumber('4242424242424242') // => '4242 4242 4242 4242'
 * formatCardNumber('4242 4242 4242 4242') // => '4242 4242 4242 4242'
 * formatCardNumber('42424242') // => '4242 4242'
 */
export function formatCardNumber(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  // Add space every 4 digits
  const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
  return formatted.substring(0, 19); // Max 16 digits + 3 spaces
}

/**
 * Formats an expiry date with a slash (MM / YY)
 *
 * Removes all non-digit characters and inserts a slash after the 2nd digit
 * to create the MM / YY format. Limits output to 7 characters (4 digits + 3 for " / ").
 *
 * @param value - Raw expiry input (may contain slashes or other characters)
 * @returns Formatted expiry date in MM / YY format
 *
 * @example
 * formatExpiry('1225') // => '12 / 25'
 * formatExpiry('12/25') // => '12 / 25'
 * formatExpiry('12') // => '12'
 * formatExpiry('') // => ''
 */
export function formatExpiry(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;

  // Add slash between MM and YY
  return `${digits.substring(0, 2)} / ${digits.substring(2, 4)}`;
}
