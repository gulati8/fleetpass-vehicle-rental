'use client';

import { useToast } from '@/lib/hooks/useToast';

/**
 * Demo component showing toast notification usage
 * This can be used in the components showcase or for testing
 */
export function ToastDemo() {
  const toast = useToast();

  const demoMessages = {
    success: [
      'Booking created successfully!',
      'Vehicle added to fleet',
      'Customer information saved',
      'Payment processed',
    ],
    error: [
      'Failed to load data',
      'Invalid credentials',
      'Server connection error',
      'Booking dates are not available',
    ],
    warning: [
      'Your session will expire in 5 minutes',
      'Vehicle requires maintenance',
      'KYC verification pending',
      'Payment method expires soon',
    ],
    info: [
      'New features are available',
      'Scheduled maintenance at 2 AM',
      'System update completed',
      'Report is being generated',
    ],
  };

  const randomMessage = (type: keyof typeof demoMessages) => {
    const messages = demoMessages[type];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">
          Toast Notification Demo
        </h3>
        <p className="mb-6 text-sm text-neutral-600">
          Click the buttons below to see different types of toast notifications.
          Maximum 3 toasts are shown at once.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <button
          onClick={() => toast.success(randomMessage('success'))}
          className="rounded-lg bg-success-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
        >
          Success Toast
        </button>

        <button
          onClick={() => toast.error(randomMessage('error'))}
          className="rounded-lg bg-error-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-600 focus:ring-offset-2"
        >
          Error Toast
        </button>

        <button
          onClick={() => toast.warning(randomMessage('warning'))}
          className="rounded-lg bg-warning-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-600 focus:ring-offset-2"
        >
          Warning Toast
        </button>

        <button
          onClick={() => toast.info(randomMessage('info'))}
          className="rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
        >
          Info Toast
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-neutral-900">
          Custom Duration Examples
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toast.success('Quick notification (3s)', 3000)}
            className="rounded bg-success-100 px-3 py-1.5 text-xs font-medium text-success-700 transition-colors hover:bg-success-200"
          >
            3 Second Toast
          </button>
          <button
            onClick={() => toast.error('Long error message (10s)', 10000)}
            className="rounded bg-error-100 px-3 py-1.5 text-xs font-medium text-error-700 transition-colors hover:bg-error-200"
          >
            10 Second Toast
          </button>
          <button
            onClick={() => {
              // Trigger multiple toasts to test queuing
              toast.info('First notification');
              setTimeout(() => toast.success('Second notification'), 300);
              setTimeout(() => toast.warning('Third notification'), 600);
              setTimeout(() => toast.error('Fourth notification'), 900);
            }}
            className="rounded bg-primary-100 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-200"
          >
            Test Queue (4 toasts)
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
        <p className="text-xs text-primary-900">
          <strong>Note:</strong> Toasts automatically dismiss after their duration
          (Success/Warning: 5s, Error: 7s). You can also close them manually by
          clicking the X button. The progress bar shows remaining time.
        </p>
      </div>
    </div>
  );
}
