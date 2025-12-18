# Error Handling Components

Comprehensive error handling components for the FleetPass application.

## Components

### ErrorBoundary

Global error boundary that catches JavaScript errors anywhere in the component tree.

**Usage:**

```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

**With custom fallback:**

```tsx
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

**With reset handler:**

```tsx
<ErrorBoundary onReset={() => console.log('User clicked Try Again')}>
  <YourComponent />
</ErrorBoundary>
```

### FeatureErrorBoundary

Feature-specific error boundary that isolates errors to specific features.

**Usage:**

```tsx
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';

export default function VehiclesPage() {
  return (
    <FeatureErrorBoundary featureName="Vehicle Management">
      <VehiclesList />
    </FeatureErrorBoundary>
  );
}
```

### ApiErrorDisplay

Display API errors in a user-friendly format with field-level validation errors.

**Usage in forms:**

```tsx
import { ApiErrorDisplay } from '@/components/error/ApiErrorDisplay';
import { useCreateVehicle } from '@/lib/hooks/api/use-vehicles';

function VehicleForm() {
  const mutation = useCreateVehicle();

  return (
    <form onSubmit={handleSubmit}>
      {mutation.isError && <ApiErrorDisplay error={mutation.error} />}

      {/* Form fields */}

      <Button type="submit" isLoading={mutation.isPending}>
        Submit
      </Button>
    </form>
  );
}
```

### GlobalErrorHandler

Hooks into React Query's global error handling for API errors.

**Usage:**

```tsx
import { GlobalErrorHandler } from '@/components/error/GlobalErrorHandler';

export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <GlobalErrorHandler />
        {children}
      </QueryProvider>
    </ErrorBoundary>
  );
}
```

## API Error Handling

The enhanced `apiClient` automatically converts errors to `ApiError` instances:

```typescript
import { ApiError } from '@/lib/api-client';

try {
  await apiClient.post('/vehicles', data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.message);   // User-friendly message
    console.log(error.status);    // HTTP status code
    console.log(error.code);      // Error code (e.g., 'VALIDATION_ERROR')
    console.log(error.details);   // Field-level validation errors
  }
}
```

## Error Logging

Errors are automatically logged in development. In production, integrate with your error tracking service:

```typescript
// In frontend/lib/error-logging.ts

import * as Sentry from '@sentry/nextjs';

export function logError(error: Error, errorInfo?: any) {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: errorInfo });
  }
}
```

## Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

function ThrowError() {
  throw new Error('Test error');
}

test('catches errors and displays fallback', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});
```

## Best Practices

1. **Wrap the entire app** with `ErrorBoundary` in root layout
2. **Wrap major features** with `FeatureErrorBoundary` to isolate errors
3. **Use ApiErrorDisplay** in forms to show validation errors
4. **Add GlobalErrorHandler** to handle React Query errors globally
5. **Log errors** in production to error tracking service
6. **Test error boundaries** to ensure they work as expected

## Error Handling Hierarchy

```
App Root
└── ErrorBoundary (catches all errors)
    └── QueryProvider
        └── GlobalErrorHandler (handles API errors)
            └── Feature Pages
                └── FeatureErrorBoundary (isolates feature errors)
                    └── Forms
                        └── ApiErrorDisplay (shows validation errors)
```
