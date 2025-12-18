/**
 * Type guard utilities for runtime type checking
 */

import { ApiResponse, ApiError } from './api.types';
import { BookingStatus, LeadStatus, DealStatus, KycStatus, UserRole } from './index';

/**
 * Type guard to check if response is ApiError
 */
export function isApiError(response: any): response is ApiError {
  return (
    response &&
    response.success === false &&
    response.error &&
    typeof response.error.message === 'string' &&
    typeof response.error.statusCode === 'number'
  );
}

/**
 * Type guard to check if response is successful ApiResponse
 */
export function isApiSuccess<T>(response: any): response is ApiResponse<T> {
  return response && response.success === true && 'data' in response;
}

/**
 * Validate BookingStatus
 */
export function isBookingStatus(value: string): value is BookingStatus {
  return Object.values(BookingStatus).includes(value as BookingStatus);
}

/**
 * Validate LeadStatus
 */
export function isLeadStatus(value: string): value is LeadStatus {
  return Object.values(LeadStatus).includes(value as LeadStatus);
}

/**
 * Validate DealStatus
 */
export function isDealStatus(value: string): value is DealStatus {
  return Object.values(DealStatus).includes(value as DealStatus);
}

/**
 * Validate KycStatus
 */
export function isKycStatus(value: string): value is KycStatus {
  return Object.values(KycStatus).includes(value as KycStatus);
}

/**
 * Validate UserRole
 */
export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

/**
 * Convert cents to dollars (for display)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents (for storage)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(cents: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(centsToDollars(cents));
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parseISODate(dateString));
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parseISODate(dateString));
}

/**
 * Calculate number of days between two dates
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
