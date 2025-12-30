import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { useToast } from '@/lib/hooks/useToast';

export function useGlobalErrorHandler() {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    // Listen for session expired event from api-client
    const handleSessionExpired = (event: CustomEvent) => {
      toast.error(event.detail.message || 'Your session has expired. Please login again.');
    };

    window.addEventListener('session-expired', handleSessionExpired as EventListener);

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const error = event.query.state.error;

        // Handle our structured API errors
        if (error instanceof ApiError) {
          if (error.status === 401) {
            // Session expired is handled by the api-client event
            if (error.code !== 'SESSION_EXPIRED') {
              toast.error('Authentication required. Please login.');
              window.location.href = '/auth/login';
            }
            return;
          }

          if (error.status === 403) {
            toast.error('Permission denied. You do not have access to this resource.');
            console.error('Permission denied:', error);
            return;
          }

          if (error.code === 'NETWORK_ERROR' || error.status === 0) {
            toast.error('Network error. Please check your connection and try again.');
            console.error('Network error - user may be offline');
            return;
          }

          // Show toast for other API errors (but not validation errors)
          if (error.status >= 500) {
            toast.error('Server error. Please try again later.');
          } else if (error.status >= 400 && !error.details) {
            // Show generic client errors (but skip validation errors which have details)
            toast.error(error.message || 'An error occurred. Please try again.');
          }
        }

        // Log other errors
        console.error('Query error:', error);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('session-expired', handleSessionExpired as EventListener);
    };
  }, [queryClient, toast]);
}
