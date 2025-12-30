'use client';

import { useContext } from 'react';
import { ToastContext, ToastContextValue } from '@/lib/providers/ToastProvider';

/**
 * Hook to access toast notification functionality
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toast = useToast();
 *
 *   const handleSuccess = () => {
 *     toast.success('Operation completed successfully!');
 *   };
 *
 *   const handleError = () => {
 *     toast.error('Something went wrong', 10000); // Custom duration
 *   };
 *
 *   return (
 *     <button onClick={handleSuccess}>Show Success</button>
 *   );
 * }
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
