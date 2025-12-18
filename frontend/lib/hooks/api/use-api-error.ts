import { useEffect } from 'react';

/**
 * Hook to handle API errors with user-friendly error messages
 *
 * Usage:
 * ```typescript
 * const { data, error } = useVehicles();
 * useApiError(error);
 * ```
 *
 * For more sophisticated error handling, consider integrating
 * a toast library like react-hot-toast or sonner:
 *
 * ```typescript
 * import { toast } from 'react-hot-toast';
 *
 * export function useApiError(error: any) {
 *   useEffect(() => {
 *     if (error) {
 *       const message = extractErrorMessage(error);
 *       toast.error(message);
 *     }
 *   }, [error]);
 * }
 * ```
 */
export function useApiError(error: any) {
  useEffect(() => {
    if (error) {
      const message = extractErrorMessage(error);
      console.error('API Error:', message);
      // TODO: Replace with toast notification when UI library is chosen
      // toast.error(message);
    }
  }, [error]);
}

/**
 * Extract user-friendly error message from various error formats
 */
export function extractErrorMessage(error: any): string {
  // Axios error with response
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  // Standard API error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Network error
  if (error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Request timeout
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Generic error message
  if (error.message) {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
}
