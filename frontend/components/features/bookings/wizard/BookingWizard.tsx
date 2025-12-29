'use client';

import { useMemo } from 'react';
import { WizardProvider, useWizard } from './BookingWizardContext';
import { StepIndicator } from './steps/StepIndicator';
import { Step1BookingDetails } from './steps/Step1BookingDetails';
import { Step2ReviewBooking } from './steps/Step2ReviewBooking';
import { Step3Payment } from './steps/Step3Payment';
import { Step4Confirmation } from './steps/Step4Confirmation';
import { Card, CardContent } from '@/components/ui/card/Card';
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
  const { state, next, goToStep, setBookingResult, isStepComplete } = useWizard();
  const { currentStep } = state;

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

  // Render the appropriate step component based on current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BookingDetails
            onNext={() => {
              // Data is already saved via updateBookingData in the step component
              // Just navigate to next step
              next();
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
              // Update wizard state with booking result
              setBookingResult({
                bookingId: result.bookingId,
                bookingNumber: result.bookingNumber,
                paymentIntentId: result.paymentId,
              });
              // Navigate to confirmation step
              next();
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
            onNext={() => {
              next();
            }}
          />
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
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
