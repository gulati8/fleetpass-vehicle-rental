import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * Create a test-specific QueryClient with disabled retries and caching
 * for predictable test behavior
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable cache
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for testing hooks that use React Query
 *
 * Usage:
 * ```typescript
 * const { result } = renderHook(() => useVehicles(), {
 *   wrapper: QueryWrapper,
 * });
 * ```
 */
export function QueryWrapper({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Create a custom wrapper with a specific QueryClient
 * Useful when you need to control the QueryClient instance in tests
 */
export function createQueryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
