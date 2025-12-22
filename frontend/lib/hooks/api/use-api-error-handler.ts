import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

export function useGlobalErrorHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error;

        // Handle our structured API errors
        if (error instanceof ApiError) {
          if (error.status === 401) {
            console.warn('Unauthorized - redirecting to login');
            window.location.href = '/auth/login';
            return;
          }

          if (error.status === 403) {
            console.error('Permission denied:', error);
            return;
          }

          if (error.code === 'NETWORK_ERROR' || error.status === 0) {
            console.error('Network error - user may be offline');
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
