import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useGlobalErrorHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error;

        // Handle specific error types
        if (error instanceof Error) {
          // 401 Unauthorized - redirect to login
          if ('response' in error && (error as any).response?.status === 401) {
            console.warn('Unauthorized - redirecting to login');
            window.location.href = '/auth/login';
            return;
          }

          // 403 Forbidden - show permission error
          if ('response' in error && (error as any).response?.status === 403) {
            console.error('Permission denied:', error);
            // TODO: Show toast notification when UI library is integrated
            // toast.error('You do not have permission to perform this action');
            return;
          }

          // Network errors
          if (error.message === 'Network Error') {
            console.error('Network error - user may be offline');
            // TODO: Show toast notification
            // toast.error('Unable to connect to server. Please check your connection.');
            return;
          }
        }

        // Log other errors
        console.error('Query error:', error);
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
}
