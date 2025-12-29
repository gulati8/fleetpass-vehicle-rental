'use client';

import { XCircle, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { cn } from '@/lib/utils';

interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary and retry */
  resetErrorBoundary: () => void;
  /** Optional callback when user clicks "Go Back" */
  onGoBack?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ErrorFallback Component
 *
 * A user-friendly error display component for use with React Error Boundaries
 * in the booking wizard flow. Shows error details in development mode and
 * provides retry/navigation options.
 *
 * INTEGRATION GUIDE:
 * ==================
 * This component is designed to work with the ErrorBoundary class component
 * located at /components/error/ErrorBoundary.tsx
 *
 * The ErrorBoundary can be used in two ways:
 *
 * 1. Using ErrorBoundary directly with ErrorFallback:
 *    ```tsx
 *    import { ErrorBoundary } from '@/components/error/ErrorBoundary';
 *    import { ErrorFallback } from '@/components/features/bookings/wizard/ErrorFallback';
 *
 *    <ErrorBoundary
 *      fallback={
 *        <ErrorFallback
 *          error={new Error('Unknown error')}
 *          resetErrorBoundary={() => setStep(1)}
 *          onGoBack={() => window.history.back()}
 *        />
 *      }
 *      onReset={() => setStep(1)}
 *    >
 *      <BookingWizardStep />
 *    </ErrorBoundary>
 *    ```
 *
 * 2. Using FeatureErrorBoundary (recommended for features):
 *    ```tsx
 *    import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
 *
 *    <FeatureErrorBoundary featureName="Booking Wizard">
 *      <BookingWizardStep />
 *    </FeatureErrorBoundary>
 *    ```
 *
 * FUTURE IMPLEMENTATION PLAN:
 * ===========================
 * When creating the main BookingWizard.tsx component, wrap it with ErrorBoundary:
 *
 *    ```tsx
 *    export function BookingWizard() {
 *      return (
 *        <ErrorBoundary
 *          fallback={
 *            <ErrorFallback
 *              error={new Error('Booking wizard encountered an error')}
 *              resetErrorBoundary={() => window.location.href = '/bookings'}
 *              onGoBack={() => window.history.back()}
 *            />
 *          }
 *          onReset={() => {
 *            // Reset wizard state if needed
 *            useWizard().reset();
 *          }}
 *        >
 *          <WizardProvider>
 *            Wizard steps here
 *          </WizardProvider>
 *        </ErrorBoundary>
 *      );
 *    }
 *    ```
 *
 * ERROR BOUNDARY CAPABILITIES:
 * ============================
 * - Catches rendering errors during component lifecycle
 * - Catches errors in lifecycle methods and constructors
 * - Does NOT catch: event handlers, async code, server-side rendering
 * - ErrorBoundary logs to console in development
 * - ErrorBoundary logs to error tracking service in production (TODO)
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   FallbackComponent={ErrorFallback}
 *   onReset={() => setStep(1)}
 * >
 *   <BookingWizardStep />
 * </ErrorBoundary>
 * ```
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  onGoBack,
  className,
}: ErrorFallbackProps) {
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      // Default: navigate to previous page
      window.history.back();
    }
  };

  return (
    <div className={cn('flex items-center justify-center p-4 min-h-[400px]', className)}>
      <div role="alert" aria-live="assertive">
        <Card className="max-w-lg w-full border-error-200 bg-error-50">
          <CardHeader>
            <CardTitle className="text-error-600 flex items-center gap-3">
              <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-error-600" />
              </div>
              <span>Something went wrong</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User-friendly error message */}
            <div className="text-neutral-700">
              <p className="font-medium mb-2">We encountered an unexpected error</p>
              <p className="text-sm text-neutral-600">
                We're sorry, but something went wrong while processing your booking. Please try
                again, or go back to the previous step.
              </p>
            </div>

            {/* Development-only error details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-sm bg-white border border-error-200 p-4 rounded-lg">
                <summary className="cursor-pointer font-semibold text-error-700 mb-2 hover:text-error-800">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="font-medium text-neutral-700">Message:</span>
                    <p className="text-xs text-neutral-600 mt-1 font-mono bg-neutral-50 p-2 rounded">
                      {error.message}
                    </p>
                  </div>
                  {error.stack && (
                    <div>
                      <span className="font-medium text-neutral-700">Stack Trace:</span>
                      <pre className="text-xs text-neutral-600 mt-1 overflow-auto whitespace-pre-wrap font-mono bg-neutral-50 p-2 rounded max-h-48">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={resetErrorBoundary}
                variant="primary"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={handleGoBack}
                variant="outline"
                leftIcon={<ChevronLeft className="w-4 h-4" />}
                className="flex-1"
              >
                Go Back
              </Button>
            </div>

            {/* Support hint */}
            <div className="mt-4 text-xs text-neutral-600 bg-white/60 p-3 rounded-lg border border-error-200">
              <p>
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:support@fleetpass.com"
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  support@fleetpass.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
