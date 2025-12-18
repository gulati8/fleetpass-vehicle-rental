# React Query Implementation Guide

This document explains the React Query (TanStack Query) implementation in the FleetPass frontend.

## Overview

React Query is configured as the data fetching layer for all API operations, providing:

- **Automatic caching** with configurable stale time
- **Background refetching** to keep data fresh
- **Optimistic updates** for better UX
- **Request deduplication** to prevent duplicate API calls
- **Centralized loading and error states**
- **DevTools** for debugging queries in development

## Setup

### Provider Configuration

The `QueryProvider` is configured in `lib/providers/QueryProvider.tsx` and wrapped around the entire app in `app/layout.tsx`:

```typescript
// Default configuration
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 minute
      gcTime: 5 * 60 * 1000,       // 5 minutes (cache time)
      refetchOnWindowFocus: true,   // Refetch when window regains focus
      refetchOnReconnect: true,     // Refetch when reconnecting
      retry: 1,                     // Retry failed requests once
    },
    mutations: {
      retry: 1,
    },
  },
})
```

### React Query DevTools

DevTools are automatically enabled in development mode. You'll see a floating icon in the bottom-right corner of the screen.

- Click the icon to open the DevTools panel
- View all active queries, their status, and cached data
- Manually refetch or invalidate queries
- Monitor network requests and response times

## API Hooks Structure

All API hooks follow a consistent pattern:

```
lib/hooks/api/
├── query-keys.ts          # Centralized query key management
├── use-auth.ts            # Authentication hooks
├── use-vehicles.ts        # Vehicle CRUD hooks
├── use-bookings.ts        # Booking management hooks
├── use-customers.ts       # Customer management hooks
├── use-locations.ts       # Location management hooks
├── use-leads.ts           # Lead management hooks
├── use-deals.ts           # Deal management hooks
├── use-payments.ts        # Payment processing hooks
├── use-kyc.ts             # KYC verification hooks
├── use-api-error.ts       # Error handling utilities
└── index.ts               # Central export
```

## Using API Hooks

### Queries (Data Fetching)

#### Fetch a List

```typescript
import { useVehicles } from '@/lib/hooks/api';

function VehicleList() {
  const { data, isLoading, error, refetch } = useVehicles({
    status: 'AVAILABLE'
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.map(vehicle => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

#### Fetch a Single Item

```typescript
import { useVehicle } from '@/lib/hooks/api';

function VehicleDetails({ vehicleId }: { vehicleId: string }) {
  const { data: vehicle, isLoading, error } = useVehicle(vehicleId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!vehicle) return <NotFound />;

  return <VehicleDetailView vehicle={vehicle} />;
}
```

### Mutations (Data Modification)

#### Create

```typescript
import { useCreateVehicle } from '@/lib/hooks/api';

function CreateVehicleForm() {
  const createVehicle = useCreateVehicle();

  const handleSubmit = async (formData) => {
    try {
      const newVehicle = await createVehicle.mutateAsync(formData);
      console.log('Vehicle created:', newVehicle);
      // Navigate or show success message
    } catch (error) {
      // Error is automatically logged
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createVehicle.isPending}
      >
        {createVehicle.isPending ? 'Creating...' : 'Create Vehicle'}
      </button>

      {createVehicle.error && (
        <ErrorMessage error={createVehicle.error} />
      )}
    </form>
  );
}
```

#### Update

```typescript
import { useUpdateVehicle } from '@/lib/hooks/api';

function EditVehicleForm({ vehicleId }: { vehicleId: string }) {
  const updateVehicle = useUpdateVehicle();

  const handleSubmit = async (formData) => {
    await updateVehicle.mutateAsync({
      id: vehicleId,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={updateVehicle.isPending}
      >
        {updateVehicle.isPending ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

#### Delete

```typescript
import { useDeleteVehicle } from '@/lib/hooks/api';

function DeleteVehicleButton({ vehicleId }: { vehicleId: string }) {
  const deleteVehicle = useDeleteVehicle();

  const handleDelete = async () => {
    if (confirm('Are you sure?')) {
      await deleteVehicle.mutateAsync(vehicleId);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteVehicle.isPending}
    >
      {deleteVehicle.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

## Query Key Management

Query keys are centralized in `lib/hooks/api/query-keys.ts` using a hierarchical structure:

```typescript
// Example structure
queryKeys.vehicles.all           // ['vehicles']
queryKeys.vehicles.lists()       // ['vehicles', 'list']
queryKeys.vehicles.list(filters) // ['vehicles', 'list', { filters }]
queryKeys.vehicles.detail(id)    // ['vehicles', 'detail', id]
```

### Why Centralized Query Keys?

1. **Cache Management**: Easily invalidate related queries
2. **Type Safety**: TypeScript ensures consistent key structure
3. **Discoverability**: All keys in one place
4. **Refactoring**: Change key structure without breaking code

### Invalidating Queries

After mutations, related queries are automatically invalidated:

```typescript
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.patch(`/vehicles/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific vehicle
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(variables.id)
      });

      // Invalidate all vehicle lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.lists()
      });
    },
  });
}
```

## Optimistic Updates

For better UX, some mutations implement optimistic updates:

```typescript
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const response = await apiClient.patch(`/vehicles/${id}`, data);
      return response.data.data;
    },

    // Optimistically update the UI
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.vehicles.detail(variables.id)
      });

      // Snapshot previous value
      const previousVehicle = queryClient.getQueryData(
        queryKeys.vehicles.detail(variables.id)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.vehicles.detail(variables.id),
        (old: any) => ({ ...old, ...variables })
      );

      return { previousVehicle };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousVehicle) {
        queryClient.setQueryData(
          queryKeys.vehicles.detail(variables.id),
          context.previousVehicle
        );
      }
    },

    // Always refetch after error or success
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vehicles.detail(variables.id)
      });
    },
  });
}
```

## Error Handling

### Automatic Error Extraction

The `useApiError` hook and `extractErrorMessage` utility handle various error formats:

```typescript
import { useApiError, extractErrorMessage } from '@/lib/hooks/api';

function MyComponent() {
  const { data, error } = useVehicles();

  // Option 1: Use the hook (logs to console)
  useApiError(error);

  // Option 2: Extract message manually
  const errorMessage = error ? extractErrorMessage(error) : null;

  return errorMessage ? <ErrorBanner message={errorMessage} /> : null;
}
```

### Error Message Priority

1. `error.response.data.error.message` (API error response)
2. `error.response.data.message` (Standard API response)
3. Network/timeout specific messages
4. Generic fallback

## Authentication Flow

### Login

```typescript
import { useLogin } from '@/lib/hooks/api';

function LoginForm() {
  const login = useLogin();
  const router = useRouter();

  const handleSubmit = async (credentials) => {
    try {
      await login.mutateAsync(credentials);
      router.push('/dashboard');
    } catch (error) {
      // Error handled automatically
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {login.error && (
        <ErrorMessage error={login.error} />
      )}
      <button
        type="submit"
        disabled={login.isPending}
      >
        {login.isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
```

### Current User

```typescript
import { useMe } from '@/lib/hooks/api';

function UserProfile() {
  const { data: user, isLoading } = useMe();

  if (isLoading) return <Skeleton />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome, {user.fullName}!</div>;
}
```

### Logout

```typescript
import { useLogout } from '@/lib/hooks/api';

function LogoutButton() {
  const logout = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    await logout.mutateAsync();
    router.push('/auth/login');
  };

  return (
    <button onClick={handleLogout}>
      {logout.isPending ? 'Logging out...' : 'Logout'}
    </button>
  );
}
```

## Testing

### Test Utilities

Use `QueryWrapper` for testing hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryWrapper } from '@/lib/test-utils/react-query';
import { useVehicles } from '@/lib/hooks/api';

describe('useVehicles', () => {
  it('should fetch vehicles', async () => {
    const { result } = renderHook(() => useVehicles(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

### Custom QueryClient for Tests

```typescript
import { createTestQueryClient } from '@/lib/test-utils/react-query';

const queryClient = createTestQueryClient();
// Use in your tests
```

## Best Practices

### 1. Use Query Keys Consistently

Always use the centralized `queryKeys` object:

```typescript
// ✅ Good
queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });

// ❌ Bad
queryClient.invalidateQueries({ queryKey: ['vehicles', 'list'] });
```

### 2. Enable Queries Conditionally

Use the `enabled` option to prevent queries from running:

```typescript
const { data } = useVehicle(vehicleId, {
  enabled: !!vehicleId, // Only fetch if vehicleId exists
});
```

### 3. Handle Loading States

Always handle loading, error, and empty states:

```typescript
const { data, isLoading, error } = useVehicles();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data || data.length === 0) return <EmptyState />;

return <VehicleList vehicles={data} />;
```

### 4. Use Optimistic Updates Sparingly

Only use optimistic updates for:
- Simple updates (toggle status, increment count)
- Critical UX paths (like/favorite actions)
- Where rollback is straightforward

Avoid for:
- Complex data transformations
- Server-calculated values
- Operations that frequently fail

### 5. Invalidate Queries Strategically

After mutations, invalidate:
- The specific item (detail)
- All lists that might include that item
- Related resources

```typescript
onSuccess: (data, variables) => {
  // Specific item
  queryClient.invalidateQueries({
    queryKey: queryKeys.vehicles.detail(variables.id)
  });

  // All lists
  queryClient.invalidateQueries({
    queryKey: queryKeys.vehicles.lists()
  });

  // Related bookings
  queryClient.invalidateQueries({
    queryKey: queryKeys.bookings.all
  });
}
```

### 6. Configure Stale Time Appropriately

```typescript
// Rarely changes (locations, settings)
staleTime: 5 * 60 * 1000 // 5 minutes

// Changes frequently (bookings, availability)
staleTime: 30 * 1000 // 30 seconds

// Real-time (notifications, messages)
staleTime: 0 // Always stale
```

## Migration from Direct API Calls

### Before (Manual State Management)

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [vehicles, setVehicles] = useState([]);

useEffect(() => {
  setLoading(true);
  apiClient.get('/vehicles')
    .then(res => setVehicles(res.data.data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

### After (React Query)

```typescript
const { data: vehicles, isLoading, error } = useVehicles();
```

## Troubleshooting

### Query Not Refetching

Check:
1. `staleTime` configuration (may be too high)
2. `enabled` option (query may be disabled)
3. `refetchOnWindowFocus` setting

### Cache Not Updating After Mutation

Check:
1. Mutation has `onSuccess` handler
2. Correct query keys are invalidated
3. Query keys match exactly

### DevTools Not Showing

Check:
1. `NODE_ENV === 'development'`
2. `@tanstack/react-query-devtools` is installed
3. DevTools initialized in `QueryProvider`

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Query Keys Guide](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates](https://tkdodo.eu/blog/optimistic-updates-in-react-query)
- [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
