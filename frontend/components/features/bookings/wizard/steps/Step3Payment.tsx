'use client';

/**
 * Step 3: Payment Processing Component
 *
 * Handles the critical payment flow for the booking wizard:
 * 1. Creates booking with API
 * 2. Creates payment intent with booking ID
 * 3. Confirms payment with mock payment method
 * 4. Updates wizard context with result
 *
 * Features:
 * - Mock card input with automatic formatting
 * - Real-time validation with Zod schema
 * - Loading states during API operations
 * - Error handling with retry capability
 * - Secure payment processing flow
 * - PCI DSS compliance indicators
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Shield, CreditCard, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useWizard } from '../BookingWizardContext';
import { useCreateBooking, useCancelBooking } from '@/lib/hooks/api/use-bookings';
import { useCreatePaymentIntent, useConfirmPayment } from '@/lib/hooks/api/use-payments';
import { useVehicle } from '@/lib/hooks/api/use-vehicles';
import { MockCardInput } from '../MockCardInput';
import { PriceSummary } from '../PriceSummary';
import { Button } from '@/components/ui/button/Button';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Badge } from '@/components/ui/badge/Badge';
import { Card, CardContent } from '@/components/ui/card/Card';
import { paymentFormSchema, type PaymentFormData } from '@/lib/validations/payment.validation';
import { cn } from '@/lib/utils';
import type { CreateBookingRequest } from '@shared/types';
import { calculateRentalDays, calculatePricing } from '@/lib/utils/pricing';

/**
 * Props for the PaymentStep component
 */
interface PaymentStepProps {
  /** Callback when payment succeeds */
  onSuccess: (result: { bookingId: string; bookingNumber: string; paymentId: string }) => void;
  /** Callback when payment fails */
  onError: (error: Error) => void;
}

/**
 * Format cents to USD currency string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Payment processing states
 */
type ProcessingState = 'idle' | 'creating_booking' | 'creating_intent' | 'confirming_payment' | 'success';

/**
 * Step 3: Payment Step Component
 *
 * Collects payment information and processes the complete booking + payment flow.
 * This is the critical step where the booking is created and payment is confirmed.
 *
 * CRITICAL IMPLEMENTATION NOTES:
 * - Orphaned Booking Risk: If payment fails after booking creation, booking remains in database
 * - Duplicate Booking Risk: Retrying payment creates new booking instead of reusing existing
 * - Amount Validation: Payment intent must explicitly specify deposit amount
 *
 * TODO: Backend should support atomic transactions (create booking + payment in one operation)
 * TODO: Add backend endpoint to cancel/delete bookings when payment fails
 */
export function Step3Payment({ onSuccess, onError }: PaymentStepProps) {
  const { state, updatePaymentData, setStepError, setStepLoading, back } = useWizard();
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [createdBookingNumber, setCreatedBookingNumber] = useState<string | null>(null);

  // Extract booking data
  const bookingData = state.bookingData;
  const vehicleId = bookingData?.vehicleId || '';
  const pickupDatetime = bookingData?.pickupDatetime || '';
  const dropoffDatetime = bookingData?.dropoffDatetime || '';

  // Fetch vehicle data for pricing
  const {
    data: vehicle,
    isLoading: loadingVehicle,
    isError: isVehicleError,
  } = useVehicle(vehicleId);

  // API mutations
  const createBooking = useCreateBooking();
  const createPaymentIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();
  const cancelBooking = useCancelBooking();

  // Form management
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardNumber: '',
      expiry: '',
      cvv: '',
      cardholderName: '',
      termsAccepted: false,
    },
  });

  const termsAccepted = watch('termsAccepted');

  // Check if we have required booking data
  const hasBookingData = !!(
    state.bookingData?.customerId &&
    state.bookingData?.vehicleId &&
    state.bookingData?.pickupLocationId &&
    state.bookingData?.dropoffLocationId &&
    state.bookingData?.pickupDatetime &&
    state.bookingData?.dropoffDatetime
  );

  // Calculate rental duration and pricing
  const numDays = useMemo(
    () => pickupDatetime && dropoffDatetime ? calculateRentalDays(pickupDatetime, dropoffDatetime) : 1,
    [pickupDatetime, dropoffDatetime]
  );

  const pricing = useMemo(() => {
    if (!vehicle?.dailyRateCents) return null;
    return calculatePricing(vehicle.dailyRateCents, numDays);
  }, [vehicle?.dailyRateCents, numDays]);

  /**
   * Handle payment form submission
   * Orchestrates the complete booking creation + payment flow
   *
   * IMPLEMENTATION DETAILS:
   * - Issue #2 Fix: Check if booking already exists before creating new one (prevents duplicates)
   * - Issue #3 Fix: Explicitly pass deposit amount to payment intent
   * - Issue #1 Fix: Attempt to cancel orphaned booking if payment fails
   */
  const onSubmit = async (data: PaymentFormData) => {
    if (!hasBookingData || !state.bookingData) {
      const errorMsg = 'Missing booking data. Please go back and complete previous steps.';
      setError(errorMsg);
      onError(new Error(errorMsg));
      return;
    }

    // Calculate deposit amount for explicit validation (Issue #3)
    const depositCents = pricing?.depositCents || 0;
    if (!depositCents || !pricing) {
      const errorMsg = 'Unable to calculate deposit amount. Please refresh and try again.';
      setError(errorMsg);
      onError(new Error(errorMsg));
      return;
    }

    // Capture current processing state for error handling
    let currentState: ProcessingState = 'idle';

    try {
      // Clear previous errors
      setError(null);
      setStepError(3, null);
      setStepLoading(3, true);

      // Update wizard context with payment data
      updatePaymentData(data);

      // Step 1: Create or reuse booking (Issue #2 Fix: Prevent duplicate bookings on retry)
      let booking;
      if (createdBookingId && createdBookingNumber) {
        // Booking was already created in previous attempt, skip creation
        console.log('Reusing existing booking:', createdBookingId);
        booking = { id: createdBookingId, bookingNumber: createdBookingNumber };
        currentState = 'creating_intent';
        setProcessingState('creating_intent');
      } else {
        // First attempt, create new booking
        currentState = 'creating_booking';
        setProcessingState('creating_booking');

        const bookingRequest: CreateBookingRequest = {
          customerId: state.bookingData.customerId,
          vehicleId: state.bookingData.vehicleId,
          pickupLocationId: state.bookingData.pickupLocationId,
          dropoffLocationId: state.bookingData.dropoffLocationId,
          pickupDatetime: state.bookingData.pickupDatetime,
          dropoffDatetime: state.bookingData.dropoffDatetime,
          notes: state.bookingData.notes,
        };

        booking = await createBooking.mutateAsync(bookingRequest);
        setCreatedBookingId(booking.id);
        setCreatedBookingNumber(booking.bookingNumber);
      }

      // Step 2: Create payment intent (Issue #3 Fix: Explicitly pass deposit amount)
      currentState = 'creating_intent';
      setProcessingState('creating_intent');
      const paymentIntentResult = await createPaymentIntent.mutateAsync({
        bookingId: booking.id,
        customerId: state.bookingData.customerId,
        amountCents: depositCents, // CRITICAL: Explicitly charge deposit amount
      });

      // Step 3: Confirm payment with mock payment method
      currentState = 'confirming_payment';
      setProcessingState('confirming_payment');
      const confirmedPayment = await confirmPayment.mutateAsync({
        paymentId: paymentIntentResult.payment.id,
        paymentMethodId: 'pm_card_visa', // Mock Stripe payment method ID
        cardNumber: data.cardNumber, // Pass card number for mock testing (supports decline cards)
      });

      // Step 4: Success - update wizard and notify parent
      currentState = 'success';
      setProcessingState('success');
      setStepLoading(3, false);

      console.log('💚 Payment successful, calling onSuccess...');

      // Call success callback - if navigation succeeds, component will unmount
      // If navigation fails, reset processing state after 3 seconds
      const navigationTimeout = setTimeout(() => {
        console.log('⚠️  Navigation timeout - resetting processing state');
        setProcessingState('idle');
      }, 3000);

      try {
        onSuccess({
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          paymentId: confirmedPayment.id,
        });
        console.log('✅ onSuccess callback completed');

        // If we reach here and component is still mounted, navigation failed
        // The timeout will reset the state after 3 seconds
      } catch (err) {
        console.error('❌ onSuccess threw error:', err);
        clearTimeout(navigationTimeout);
        setProcessingState('idle');
        setError('Payment succeeded but navigation failed. Please check your booking in the bookings list.');
      }
    } catch (err: unknown) {
      // Error handling with user-friendly messages
      setProcessingState('idle');
      setStepLoading(3, false);

      let errorMessage = 'Payment processing failed. Please try again.';

      // Provide context-specific error messages
      if (currentState === 'creating_booking') {
        errorMessage = (err as Error)?.message || 'Failed to create booking. Please try again.';
      } else if (currentState === 'creating_intent') {
        errorMessage = (err as Error)?.message || 'Failed to initialize payment. Please try again.';
      } else if (currentState === 'confirming_payment') {
        errorMessage = (err as Error)?.message || 'Payment confirmation failed. Please try again.';
      }

      // Issue #1 Fix: Attempt to cancel orphaned booking if payment failed after booking creation
      if (createdBookingId && currentState !== 'creating_booking') {
        try {
          console.error('Payment failed for booking:', createdBookingId, '- attempting to cancel');
          // Cancel the booking to prevent orphaned records
          await cancelBooking.mutateAsync(createdBookingId);
          console.log('Successfully cancelled orphaned booking:', createdBookingId);
          // Clear the booking ID so user can retry from scratch
          setCreatedBookingId(null);
          setCreatedBookingNumber(null);
        } catch (cleanupErr) {
          console.error('Failed to cleanup orphaned booking:', cleanupErr);
          // Don't throw - we still want to show the original payment error to user
          // The booking will remain in 'pending' status and can be manually cleaned up
        }
      }

      setError(errorMessage);
      setStepError(3, { message: errorMessage, code: 'PAYMENT_FAILED' });
      onError(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  /**
   * Get user-friendly loading message based on current state
   */
  const getLoadingMessage = (): string => {
    switch (processingState) {
      case 'creating_booking':
        return 'Creating your booking...';
      case 'creating_intent':
        return 'Initializing secure payment...';
      case 'confirming_payment':
        return 'Processing payment...';
      case 'success':
        return 'Payment successful!';
      default:
        return 'Processing...';
    }
  };

  const isProcessing = processingState !== 'idle';
  const depositCents = pricing?.depositCents || 0;

  // Show loading state while fetching vehicle data
  if (loadingVehicle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading pricing information...</p>
        </div>
      </div>
    );
  }

  // Show error if vehicle data failed to load
  if (isVehicleError || !vehicle) {
    return (
      <Card className="border-error-300 bg-error-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-error-900 mb-1">Unable to Load Pricing</h4>
              <p className="text-sm text-error-700">
                Failed to load vehicle pricing information. Please go back and try again.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if pricing calculation failed
  if (!pricing) {
    return (
      <Card className="border-error-300 bg-error-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-error-900 mb-1">Pricing Error</h4>
              <p className="text-sm text-error-700">
                Unable to calculate pricing. Please go back and verify your booking details.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  {processingState === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-success-600" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    {getLoadingMessage()}
                  </h3>
                  <p className="text-sm text-neutral-600">Please wait while we process your request</p>
                </div>
                {/* Security indicators */}
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <Lock className="w-3 h-3" />
                  <span>Secure encrypted connection</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Card className="border-error-300 bg-error-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-error-900 mb-1">Payment Failed</h4>
                <p className="text-sm text-error-700">{error}</p>
                {createdBookingId && createdBookingNumber && (
                  <p className="text-xs text-error-600 mt-2">
                    Note: A booking ({createdBookingNumber}) was created but payment failed.
                    Retrying will use the existing booking to avoid duplicates.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit Amount Card */}
      <Card className="bg-gradient-to-br from-primary-600 to-primary-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium mb-1">Deposit Amount</p>
              <p className="text-3xl font-bold">{formatCurrency(depositCents)}</p>
              <p className="text-primary-100 text-xs mt-2">
                Will be held and released within 5-7 business days
              </p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Summary - Collapsible */}
      <PriceSummary
        subtotalCents={pricing.subtotalCents}
        taxCents={pricing.taxCents}
        totalCents={pricing.totalCents}
        depositCents={pricing.depositCents}
        numDays={numDays}
        dailyRateCents={vehicle.dailyRateCents}
        expanded={false}
      />

      {/* Payment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Test Mode Badge */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Payment Information</h2>
          <Badge variant="warning" size="sm" className="bg-warning-100 border-warning-300">
            Test Mode
          </Badge>
        </div>

        {/* Mock Card Input */}
        <MockCardInput register={register} errors={errors} />

        {/* Terms and Conditions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  className={cn(
                    'h-4 w-4 rounded border-neutral-300 text-primary-600 transition-colors',
                    'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    errors.termsAccepted && 'border-error-500 focus:ring-error-500'
                  )}
                  {...register('termsAccepted')}
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="termsAccepted" className="text-sm font-medium text-neutral-900 cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </label>
                {errors.termsAccepted && (
                  <p className="text-xs text-error-600 mt-1">{errors.termsAccepted.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Badges */}
        <div className="flex items-center justify-center gap-6 py-4 border-t border-b border-neutral-200">
          <div className="flex items-center gap-2 text-neutral-600">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">256-bit SSL Encryption</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">PCI DSS Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-600">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-medium">Secure Payment</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={back}
            disabled={isProcessing}
            leftIcon={<ArrowLeft className="w-5 h-5" />}
            className="flex-1 sm:flex-initial"
          >
            Back to Review
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isProcessing}
            disabled={isProcessing || !termsAccepted}
            leftIcon={!isProcessing ? <Lock className="w-5 h-5" /> : undefined}
            className="flex-[2]"
          >
            {isProcessing ? 'Processing Payment...' : `Pay ${formatCurrency(depositCents)}`}
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-neutral-600">
          Your payment is secure and encrypted. You will receive a confirmation email after successful
          payment.
        </p>
      </form>
    </div>
  );
}
