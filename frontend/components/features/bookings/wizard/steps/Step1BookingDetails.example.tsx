/**
 * Example Usage: Step1BookingDetails Component
 *
 * This file demonstrates how to integrate Step1BookingDetails into the wizard flow.
 * DO NOT import this file in production code - it's for documentation purposes only.
 */

import { WizardProvider, useWizard } from '../BookingWizardContext';
import { Step1BookingDetails } from './Step1BookingDetails';
import type { BookingWizardData } from '@/types/wizard.types';

/**
 * Example 1: Basic usage within a wizard flow
 */
function WizardExample() {
  const { next, updateBookingData } = useWizard();

  const handleNext = async (data: BookingWizardData) => {
    // Update wizard context with booking data
    updateBookingData(data);

    // Move to next step (step 2)
    await next();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Step1BookingDetails onNext={handleNext} />
    </div>
  );
}

/**
 * Example 2: Complete wizard wrapper with provider
 */
export function BookingWizardExample() {
  return (
    <WizardProvider>
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-8">Create New Booking</h1>
          <WizardExample />
        </div>
      </div>
    </WizardProvider>
  );
}

/**
 * Example 3: With pre-filled data (edit mode)
 */
export function BookingWizardEditExample() {
  return (
    <WizardProvider
      initialState={{
        bookingData: {
          customerId: 'existing-customer-id',
          vehicleId: 'existing-vehicle-id',
          pickupLocationId: 'location-1',
          dropoffLocationId: 'location-2',
          pickupDatetime: '2024-01-15T10:00',
          dropoffDatetime: '2024-01-20T10:00',
          notes: 'Pre-filled notes',
        },
      }}
    >
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto py-8 px-4">
          <h1 className="text-3xl font-bold mb-8">Edit Booking</h1>
          <WizardExample />
        </div>
      </div>
    </WizardProvider>
  );
}

/**
 * Example 4: Standalone usage (outside wizard context)
 * Note: This will throw an error because Step1BookingDetails requires WizardProvider
 */
function StandaloneExample() {
  const handleNext = async (data: BookingWizardData) => {
    console.log('Booking data:', data);
    // Handle navigation manually
  };

  // This will throw: "useWizard must be used within a WizardProvider"
  return <Step1BookingDetails onNext={handleNext} />;
}

/**
 * Example 5: Custom validation handler
 */
function CustomValidationExample() {
  const { next, updateBookingData, setStepError } = useWizard();

  const handleNext = async (data: BookingWizardData) => {
    // Custom business logic validation
    if (data.pickupDatetime && data.dropoffDatetime) {
      const pickup = new Date(data.pickupDatetime);
      const dropoff = new Date(data.dropoffDatetime);
      const diffDays = (dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) {
        setStepError(1, {
          message: 'Rental period cannot exceed 30 days',
          code: 'MAX_RENTAL_PERIOD_EXCEEDED',
        });
        return;
      }
    }

    // Validation passed
    updateBookingData(data);
    await next();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Step1BookingDetails onNext={handleNext} />
    </div>
  );
}
