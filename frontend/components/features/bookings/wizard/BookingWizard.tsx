'use client';

import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { WizardProvider, useWizard } from './BookingWizardContext';
import { StepIndicator } from './steps/StepIndicator';
import { Step1BookingDetails } from './steps/Step1BookingDetails';
import { Step2ReviewBooking } from './steps/Step2ReviewBooking';
import { Step3Payment } from './steps/Step3Payment';
import { Step4Confirmation } from './steps/Step4Confirmation';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import type { WizardStep } from '@/types/wizard.types';

/**
 * BookingWizard Component
 *
 * Main orchestrator component for the 4-step booking wizard flow.
 * Manages step progression and renders the appropriate step component.
 *
 * WORKFLOW:
 * Step 1: BookingDetailsStep - Select customer, vehicle, dates, locations
 * Step 2: ReviewStep - Review booking details and pricing
 * Step 3: PaymentStep - Process payment and create booking
 * Step 4: ConfirmationStep - Display booking confirmation
 *
 * FEATURES:
 * - Step indicator showing progress (1/4, 2/4, 3/4, 4/4)
 * - Automatic session persistence via BookingWizardContext
 * - Error boundary integration for graceful failure handling
 * - Responsive design with mobile optimization
 * - Accessibility (keyboard navigation, ARIA labels, screen reader support)
 *
 * STATE MANAGEMENT:
 * - Uses BookingWizardContext for wizard state (step, data, errors)
 * - Session storage persistence (24hr TTL) for data recovery
 * - Step validation before navigation
 *
 * ERROR HANDLING:
 * - Component-level errors caught by parent ErrorBoundary
 * - Step-specific errors handled by individual step components
 * - Global wizard errors displayed in ErrorFallback component
 *
 * USAGE:
 * ```tsx
 * import { BookingWizard } from '@/components/features/bookings/wizard/BookingWizard';
 *
 * export default function NewBookingPage() {
 *   return <BookingWizard />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With error boundary (recommended)
 * <ErrorBoundary
 *   fallback={
 *     <ErrorFallback
 *       error={new Error('Booking wizard failed')}
 *       resetErrorBoundary={() => window.location.reload()}
 *     />
 *   }
 * >
 *   <BookingWizard />
 * </ErrorBoundary>
 * ```
 */
function BookingWizardContent() {
  const { state, next, goToStep, isStepComplete, completeStep1, completeStep3, reset } = useWizard();
  const { currentStep } = state;
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Calculate which steps have been completed
  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    for (let i = 1; i <= 4; i++) {
      if (i < currentStep && isStepComplete(i as WizardStep)) {
        completed.push(i);
      }
    }
    return completed;
  }, [currentStep, isStepComplete]);

  // Handle reset with confirmation
  const handleResetClick = () => {
    // If on step 1, reset immediately (no confirmation needed)
    if (currentStep === 1) {
      reset();
      return;
    }
    // Otherwise show confirmation dialog
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    reset();
    setShowResetConfirm(false);
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  // Render the appropriate step component based on current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BookingDetails
            onNext={(data) => {
              // Atomically update booking data, vehicle data, and navigate to step 2
              completeStep1(data);
            }}
          />
        );
      case 2:
        return (
          <Step2ReviewBooking
            onNext={() => {
              // Navigate to payment step
              next();
            }}
            onEdit={() => {
              // Return to step 1 for editing
              goToStep(1);
            }}
          />
        );
      case 3:
        return (
          <Step3Payment
            onSuccess={(result) => {
              console.log('📋 BookingWizard onSuccess called with:', result);

              // Atomically update booking result and navigate to step 4
              completeStep3({
                bookingId: result.bookingId,
                bookingNumber: result.bookingNumber,
                paymentIntentId: result.paymentId,
              });

              console.log('✅ completeStep3 called, should now be on Step 4');
            }}
            onError={(error) => {
              // Error is already handled in Step3Payment component
              // Additional error handling can be added here if needed
              console.error('Payment failed:', error);
            }}
          />
        );
      case 4:
        return <Step4Confirmation />;
      default:
        return (
          <Step1BookingDetails
            onNext={(data) => {
              completeStep1(data);
            }}
          />
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              {currentStep === 4 ? 'Booking Confirmed' : 'Create New Booking'}
            </h1>
            <p className="text-neutral-600">
              {currentStep === 1 && 'Enter booking details and select vehicle'}
              {currentStep === 2 && 'Review your booking information'}
              {currentStep === 3 && 'Complete payment to confirm booking'}
              {currentStep === 4 && 'Your booking has been successfully created'}
            </p>
          </div>

          {/* Start Over Button - Hide on Step 4 (confirmation page) */}
          {currentStep !== 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetClick}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="flex-shrink-0"
            >
              Start Over
            </Button>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* Step Content */}
      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Help Text */}
      {currentStep !== 4 && (
        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>
            Need help? Contact support at{' '}
            <a
              href="mailto:support@fleetpass.com"
              className="text-primary-600 hover:text-primary-700 font-medium underline"
            >
              support@fleetpass.com
            </a>
          </p>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Start Over?
              </h3>
              <p className="text-sm text-neutral-600 mb-6">
                This will clear all your booking information and return you to the first step. Are you sure you want to continue?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCancelReset}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleConfirmReset}
                  className="flex-1"
                >
                  Yes, Start Over
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * BookingWizard - Main export with WizardProvider
 *
 * Wraps the wizard content with the WizardProvider for state management.
 * This component should be used directly in pages.
 */
export function BookingWizard() {
  return (
    <WizardProvider>
      <BookingWizardContent />
    </WizardProvider>
  );
}
