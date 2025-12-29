'use client';

import { Suspense } from 'react';
import { BookingWizard } from '@/components/features/bookings/wizard/BookingWizard';

/**
 * New Booking Page Content
 *
 * Renders the 4-step booking wizard for creating new vehicle rental bookings.
 * The wizard handles all state management, validation, payment processing, and confirmation.
 *
 * FEATURES:
 * - Step 1: Customer, vehicle, dates, and location selection
 * - Step 2: Review booking details and pricing
 * - Step 3: Payment processing
 * - Step 4: Booking confirmation
 *
 * STATE MANAGEMENT:
 * - Session storage persistence (24hr TTL) via WizardProvider
 * - Automatic data recovery on page refresh
 * - Step validation before navigation
 *
 * NAVIGATION:
 * - Wizard handles its own navigation between steps
 * - Final step provides "View Booking", "Create Another", and "Return to Dashboard" actions
 *
 * @returns The booking wizard wrapped in error boundary
 */
function NewBookingPageContent() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <BookingWizard />
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-neutral-200 rounded w-1/4" />
            <div className="h-64 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <NewBookingPageContent />
    </Suspense>
  );
}
