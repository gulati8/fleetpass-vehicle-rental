'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, Calendar, Car, MapPin, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';
import { useWizard } from '../BookingWizardContext';
import { useVehicle } from '@/lib/hooks/api/use-vehicles';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useLocation } from '@/lib/hooks/api/use-locations';
import { formatCurrency } from '@/lib/utils/payment-formatting';

/**
 * Step4Confirmation Component
 *
 * Fourth and final step of the booking wizard - displays confirmation of successful booking
 * and payment. Shows booking details, payment confirmation, and provides navigation options.
 *
 * FEATURES:
 * - Success message with booking number
 * - Booking summary (customer, vehicle, dates, locations)
 * - Payment confirmation details
 * - Action buttons (view booking, create another, return to dashboard)
 * - Responsive design with print-friendly layout
 * - Accessibility (ARIA labels, semantic HTML, keyboard navigation)
 *
 * INTEGRATION:
 * - Uses BookingWizardContext for booking/payment results
 * - Fetches full details via React Query hooks
 * - Routes to booking detail page, new booking, or dashboard
 *
 * PREREQUISITES:
 * - Must have bookingResult in wizard context (set by Step3)
 * - bookingResult must contain: bookingId, bookingNumber, paymentIntentId
 *
 * @example
 * ```tsx
 * <Step4Confirmation />
 * ```
 */
export function Step4Confirmation() {
  const router = useRouter();
  const { state, reset } = useWizard();

  const { bookingData, paymentData, result: bookingResult } = state;

  // Fetch full details for display (must be called unconditionally per React hooks rules)
  const { data: vehicle } = useVehicle(bookingData?.vehicleId || '');
  const { data: customer } = useCustomer(bookingData?.customerId || '');
  const { data: pickupLocation } = useLocation(bookingData?.pickupLocationId || '');
  const { data: dropoffLocation } = useLocation(bookingData?.dropoffLocationId || '');

  // Validate required data - redirect if missing
  if (!bookingResult || !bookingData) {
    // Should never happen - redirect to step 1 if no booking result or data
    router.push('/bookings/new');
    return null;
  }

  const handleViewBooking = () => {
    reset();
    router.push(`/bookings/${bookingResult?.bookingId}`);
  };

  const handleCreateAnother = () => {
    reset();
    router.push('/bookings/new');
  };

  const handleReturnToDashboard = () => {
    reset();
    router.push('/bookings');
  };

  // Format dates for display
  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const pickupFormatted = formatDateTime(bookingData.pickupDatetime);
  const dropoffFormatted = formatDateTime(bookingData.dropoffDatetime);

  // Calculate pricing (should match Step2/Step3 calculations)
  const TAX_RATE = 0.08;
  const DEPOSIT_PERCENTAGE = 0.2;

  const vehicleRate = vehicle?.dailyRateCents || 0;
  const pickupDate = new Date(bookingData.pickupDatetime);
  const dropoffDate = new Date(bookingData.dropoffDatetime);
  const rentalDays = Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));

  const subtotal = vehicleRate * rentalDays;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const deposit = total * DEPOSIT_PERCENTAGE;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div
        className="text-center py-8 bg-success-50 border border-success-200 rounded-lg"
        role="status"
        aria-live="polite"
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success-600" aria-hidden="true" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-success-900 mb-2">Booking Confirmed!</h2>
        <p className="text-success-700 mb-4">
          Your booking has been successfully created and payment processed.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-success-300 rounded-lg">
          <FileText className="w-5 h-5 text-success-600" aria-hidden="true" />
          <span className="text-sm font-medium text-neutral-700">Booking Number:</span>
          <span className="text-lg font-bold text-success-700">{bookingResult?.bookingNumber || 'N/A'}</span>
        </div>
      </div>

      {/* Booking Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" aria-hidden="true" />
              </div>
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-neutral-500">Name</p>
              <p className="text-base text-neutral-900">
                {customer ? `${customer.firstName} ${customer.lastName}` : 'Loading...'}
              </p>
            </div>
            {customer?.email && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Email</p>
                <p className="text-base text-neutral-900">{customer.email}</p>
              </div>
            )}
            {customer?.phone && (
              <div>
                <p className="text-sm font-medium text-neutral-500">Phone</p>
                <p className="text-base text-neutral-900">{customer.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-primary-600" aria-hidden="true" />
              </div>
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-neutral-500">Vehicle</p>
              <p className="text-base text-neutral-900">
                {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Loading...'}
              </p>
            </div>
            {vehicle?.vin && (
              <div>
                <p className="text-sm font-medium text-neutral-500">VIN</p>
                <p className="text-base text-neutral-900 font-mono">{vehicle.vin}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-neutral-500">Daily Rate</p>
              <p className="text-base text-neutral-900">{formatCurrency(vehicleRate)}/day</p>
            </div>
          </CardContent>
        </Card>

        {/* Rental Period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" aria-hidden="true" />
              </div>
              Rental Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Pick-up</p>
              <p className="text-base text-neutral-900 font-medium">{pickupFormatted.date}</p>
              <p className="text-sm text-neutral-600">{pickupFormatted.time}</p>
            </div>
            <div className="border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-500 mb-1">Drop-off</p>
              <p className="text-base text-neutral-900 font-medium">{dropoffFormatted.date}</p>
              <p className="text-sm text-neutral-600">{dropoffFormatted.time}</p>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg px-3 py-2 mt-4">
              <p className="text-sm font-medium text-primary-900">
                Total Duration: <span className="font-bold">{rentalDays} day{rentalDays !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-600" aria-hidden="true" />
              </div>
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Pick-up Location</p>
              <p className="text-base text-neutral-900">
                {pickupLocation?.name || 'Loading...'}
              </p>
              {pickupLocation?.address && (
                <p className="text-sm text-neutral-600">{pickupLocation.address}</p>
              )}
            </div>
            <div className="border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-500 mb-1">Drop-off Location</p>
              <p className="text-base text-neutral-900">
                {dropoffLocation?.name || 'Loading...'}
              </p>
              {dropoffLocation?.address && (
                <p className="text-sm text-neutral-600">{dropoffLocation.address}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Confirmation */}
      <Card className="border-success-200 bg-success-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success-600" aria-hidden="true" />
            </div>
            Payment Confirmed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingResult?.paymentIntentId && (
            <div className="bg-white border border-success-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-neutral-500">Payment ID</span>
                <span className="text-sm font-mono text-neutral-900">
                  {bookingResult?.paymentIntentId}
                </span>
              </div>
              {paymentData?.cardholderName && (
                <div className="flex justify-between items-center border-t border-neutral-200 pt-2">
                  <span className="text-sm font-medium text-neutral-500">Cardholder</span>
                  <span className="text-sm text-neutral-900">{paymentData.cardholderName}</span>
                </div>
              )}
              {paymentData?.cardNumber && (
                <div className="flex justify-between items-center border-t border-neutral-200 pt-2">
                  <span className="text-sm font-medium text-neutral-500">Card</span>
                  <span className="text-sm font-mono text-neutral-900">
                    **** **** **** {paymentData.cardNumber.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pricing Summary */}
          <div className="bg-white border border-success-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-600">
                Subtotal ({rentalDays} day{rentalDays !== 1 ? 's' : ''})
              </span>
              <span className="text-neutral-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-600">Tax (8%)</span>
              <span className="text-neutral-900">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-neutral-200 pt-2">
              <span className="font-medium text-neutral-700">Total</span>
              <span className="font-semibold text-neutral-900">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between items-center text-base border-t-2 border-success-300 pt-3">
              <span className="font-bold text-success-900">Deposit Paid</span>
              <span className="font-bold text-success-700 text-lg">{formatCurrency(deposit)}</span>
            </div>
            <div className="bg-success-100 border border-success-300 rounded px-3 py-2 mt-3">
              <p className="text-xs text-success-800">
                Remaining balance of <span className="font-bold">{formatCurrency(total - deposit)}</span> is due at
                vehicle pick-up.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          onClick={handleViewBooking}
          variant="primary"
          rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          className="flex-1"
        >
          View Booking Details
        </Button>
        <Button onClick={handleCreateAnother} variant="outline" className="flex-1">
          Create Another Booking
        </Button>
        <Button onClick={handleReturnToDashboard} variant="outline" className="flex-1">
          Return to Dashboard
        </Button>
      </div>

      {/* Print Hint */}
      <div className="text-center text-xs text-neutral-500 pt-4 border-t border-neutral-200">
        <p>
          Tip: Use your browser's print function (Ctrl+P / Cmd+P) to save this confirmation for your
          records.
        </p>
      </div>
    </div>
  );
}
