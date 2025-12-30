# Toast Notification System

A lightweight, production-ready toast notification system for FleetPass, integrated with the existing design system.

## Features

- 4 toast types: success, error, warning, info
- Auto-dismiss with configurable durations
- Visual progress bar
- Smooth slide-in/out animations
- Maximum 3 toasts visible at once (FIFO)
- Accessible (ARIA labels, keyboard navigation)
- Respects design system colors and patterns

## Usage

### Basic Usage

```tsx
import { useToast } from '@/lib/hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Booking created successfully!');
  };

  const handleError = () => {
    toast.error('Failed to save changes');
  };

  const handleWarning = () => {
    toast.warning('Your session will expire in 5 minutes');
  };

  const handleInfo = () => {
    toast.info('New features are available');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
}
```

### Custom Duration

```tsx
const toast = useToast();

// Show for 10 seconds instead of default
toast.error('Critical error occurred', 10000);

// Show for 3 seconds
toast.success('Quick notification', 3000);
```

### Advanced Usage

```tsx
const toast = useToast();

// Using the generic showToast method
toast.showToast('warning', 'Custom warning message', 8000);

// Manually remove a toast (usually not needed)
toast.removeToast('toast-id');
```

## Default Durations

- **Success**: 5 seconds
- **Error**: 7 seconds
- **Warning**: 5 seconds
- **Info**: 5 seconds

## Automatic Integration

The toast system is automatically integrated with:

1. **Session Expiry**: Shows error toast when user session expires before redirect
2. **401 Errors**: Shows authentication error toast
3. **403 Errors**: Shows permission denied toast
4. **Network Errors**: Shows network connectivity error toast
5. **Server Errors (5xx)**: Shows generic server error toast

## Design System Compliance

The toast system uses colors from the FleetPass design system:

| Type | Background | Border | Icon | Progress Bar |
|------|------------|--------|------|--------------|
| Success | `success-50` | `success-600` | `success-600` | `success-600` |
| Error | `error-100` | `error-600` | `error-600` | `error-600` |
| Warning | `warning-100` | `warning-500` | `warning-700` | `warning-600` |
| Info | `primary-50` | `primary-600` | `primary-600` | `primary-600` |

## Accessibility

- Proper ARIA roles (`role="alert"`)
- Live regions (`aria-live="assertive"` for errors, `aria-live="polite"` for others)
- Keyboard accessible close button
- Visible focus indicators
- Screen reader friendly

## Architecture

### Components

- **Toast.tsx**: Individual toast component with animations and auto-dismiss
- **ToastContainer.tsx**: Manages multiple toasts and positioning
- **ToastProvider.tsx**: React Context provider for toast state
- **useToast.ts**: Hook for easy access to toast functionality

### File Structure

```
frontend/
├── components/ui/toast/
│   ├── Toast.tsx
│   ├── ToastContainer.tsx
│   └── index.ts
├── lib/
│   ├── providers/ToastProvider.tsx
│   └── hooks/useToast.ts
```

## Integration Points

### 1. Root Layout (`app/layout.tsx`)

```tsx
<ToastProvider>
  <GlobalErrorHandler />
  {children}
</ToastProvider>
```

### 2. API Client (`lib/api-client.ts`)

Session expiry dispatches custom event:

```tsx
window.dispatchEvent(
  new CustomEvent('session-expired', {
    detail: { message: 'Your session has expired. Please login again.' }
  })
);
```

### 3. Error Handler (`lib/hooks/api/use-api-error-handler.ts`)

Listens for errors and shows appropriate toasts:

```tsx
if (error.status === 401) {
  toast.error('Authentication required. Please login.');
}

if (error.status === 403) {
  toast.error('Permission denied. You do not have access to this resource.');
}
```

## Testing

To test the toast system:

1. **Success Toast**: Create a new booking/vehicle/customer
2. **Error Toast**: Try to access a protected resource without auth
3. **Warning Toast**: Add manual trigger in your component
4. **Info Toast**: Add manual trigger in your component
5. **Session Expiry**: Wait for session to expire or manually trigger

## Performance

- Lightweight implementation (~10KB minified)
- Efficient re-renders with React Context
- CSS transitions for smooth animations
- Automatic cleanup of old toasts (max 10 in memory)
- Only renders container when toasts exist

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Future Enhancements

Potential improvements for future iterations:

- Toast action buttons (undo, retry, etc.)
- Custom icons
- Toast positioning options (top-left, bottom-right, etc.)
- Toast stacking animations
- Pause on hover
- Sound notifications
- Multi-line message support with title
