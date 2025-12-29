'use client';

/**
 * Step 2: Review Booking
 *
 * Displays a read-only summary of booking details before payment.
 * Allows users to review all information and edit if needed.
 *
 * Features:
 * - Customer information display (name, email)
 * - Vehicle details with image (year/make/model, VIN, daily rate)
 * - Rental period information (dates, times, locations, duration)
 * - Price summary with breakdown (subtotal, tax, total, deposit)
 * - Edit capability to return to Step 1
 * - Loading states for data fetching
 * - Error handling for failed API calls
 */

import { useCallback, useMemo } from 'react';
import { ArrowLeft, ArrowRight, User, Car, Calendar, MapPin, Edit2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { PriceSummary } from '../PriceSummary';
import { useWizard } from '../BookingWizardContext';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { useVehicle } from '@/lib/hooks/api/use-vehicles';
import { useLocation } from '@/lib/hooks/api/use-locations';
import { calculateRentalDays, calculatePricing } from '@/lib/utils/pricing';

export interface ReviewStepProps {
  /** Callback when user clicks Continue to Payment */
  onNext: () => void;
  /** Callback when user clicks Edit to return to Step 1 */
  onEdit: () => void;
}


/**
 * Step 2 Component - Review Booking Details
 *
 * Displays a comprehensive review of all booking information collected in Step 1.
 * Fetches related data (customer, vehicle, locations) and displays them in organized cards.
 *
 * @param props - Component props
 * @param props.onNext - Callback invoked when user clicks Continue to Payment
 * @param props.onEdit - Callback invoked when user clicks Edit button
 *
 * @example
 * ```tsx
 * <Step2ReviewBooking
 *   onNext={() => {
 *     // Navigate to payment step
 *   }}
 *   onEdit={() => {
 *     // Return to booking details step
 *   }}
 * />
 * ```
 */
export function Step2ReviewBooking({ onNext, onEdit }: ReviewStepProps) {
  const { state, back } = useWizard();

  // Extract booking data with fallback for hooks rules compliance
  const bookingData = state.bookingData;
  const {
    customerId = '',
    vehicleId = '',
    pickupLocationId = '',
    dropoffLocationId = '',
    pickupDatetime = '',
    dropoffDatetime = '',
    notes = '',
  } = bookingData || {};

  // Fetch related data (must be called before any returns for React hooks rules)
  const {
    data: customer,
    isLoading: loadingCustomer,
    isError: isCustomerError,
  } = useCustomer(customerId);

  const {
    data: vehicle,
    isLoading: loadingVehicle,
    isError: isVehicleError,
  } = useVehicle(vehicleId);

  const {
    data: pickupLocation,
    isLoading: loadingPickupLocation,
    isError: isPickupLocationError,
  } = useLocation(pickupLocationId);

  const {
    data: dropoffLocation,
    isLoading: loadingDropoffLocation,
    isError: isDropoffLocationError,
  } = useLocation(dropoffLocationId);

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
   * Format datetime for display
   *
   * @param datetime - ISO datetime string to format
   * @param timezone - Optional IANA timezone (e.g., 'America/New_York')
   * @returns Formatted date and time strings
   *
   * Note: Currently uses browser's local timezone for display consistency.
   * The timezone parameter is available but not yet implemented to avoid
   * potential confusion between location timezone and user's local timezone.
   * Future enhancement: Add timezone conversion with clear UI indication.
   */
  const formatDateTime = useCallback((datetime: string, timezone?: string) => {
    try {
      const date = new Date(datetime);
      // Currently using browser local timezone for consistent user experience
      // TODO: Implement timezone conversion when timezone parameter is provided
      return {
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };
    } catch {
      return { date: 'Invalid date', time: '' };
    }
  }, []);

  // Memoize formatted dates to avoid unnecessary recalculations
  const pickupFormatted = useMemo(
    () => formatDateTime(pickupDatetime, pickupLocation?.timezone),
    [pickupDatetime, pickupLocation?.timezone, formatDateTime]
  );
  const dropoffFormatted = useMemo(
    () => formatDateTime(dropoffDatetime, dropoffLocation?.timezone),
    [dropoffDatetime, dropoffLocation?.timezone, formatDateTime]
  );

  // Check if any data is loading
  const isLoading =
    loadingCustomer || loadingVehicle || loadingPickupLocation || loadingDropoffLocation;

  // Check if any data failed to load
  const hasError =
    isCustomerError || isVehicleError || isPickupLocationError || isDropoffLocationError;

  // Ensure we have booking data (after all hooks)
  if (!bookingData) {
    return (
      <div className="p-6 bg-error-50 border border-error-200 rounded-lg">
        <p className="text-sm text-error-700 font-medium">Missing booking data</p>
        <p className="text-xs text-error-600 mt-1">Please go back and fill in the booking details.</p>
      </div>
    );
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="p-6 bg-error-50 border border-error-200 rounded-lg">
        <p className="text-sm text-error-700 font-medium">Failed to load booking details</p>
        <p className="text-xs text-error-600 mt-1">
          Please refresh the page or contact support if the problem persists.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="mt-4"
        >
          Go Back to Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">Review Your Booking</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Please review all details before proceeding to payment
        </p>
      </div>

      {/* Customer Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Customer</h3>
                <p className="text-sm text-neutral-600">Renter information</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          </div>

          {customer && (
            <div className="space-y-2 ml-13">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  {customer.firstName} {customer.lastName}
                </span>
              </div>
              <div className="text-sm text-neutral-600">{customer.email}</div>
              {customer.phone && (
                <div className="text-sm text-neutral-600">{customer.phone}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Vehicle</h3>
                <p className="text-sm text-neutral-600">Selected rental vehicle</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          </div>

          {vehicle && (
            <div className="flex gap-4 ml-13">
              {/* Vehicle Image */}
              {vehicle.imageUrls && vehicle.imageUrls.length > 0 ? (
                <img
                  src={vehicle.imageUrls[0]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-32 h-24 object-cover rounded-lg border border-neutral-200"
                />
              ) : (
                <div className="w-32 h-24 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center">
                  <Car className="w-8 h-8 text-neutral-400" />
                </div>
              )}

              {/* Vehicle Details */}
              <div className="flex-1 space-y-2">
                <div className="font-medium text-neutral-900">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </div>
                <div className="text-sm text-neutral-600">VIN: {vehicle.vin}</div>
                <div className="text-sm font-semibold text-primary-700">
                  ${(vehicle.dailyRateCents / 100).toFixed(2)}/day
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rental Period Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Rental Period</h3>
                <p className="text-sm text-neutral-600">Pickup and drop-off details</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit
            </Button>
          </div>

          <div className="space-y-4 ml-13">
            {/* Pickup */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-success-600" />
                <span className="text-sm font-medium text-neutral-900">Pickup</span>
              </div>
              <div className="ml-6 space-y-1">
                <div className="text-sm text-neutral-900">
                  {pickupFormatted.date} at {pickupFormatted.time}
                </div>
                {pickupLocation && (
                  <div className="text-sm text-neutral-600">
                    {pickupLocation.name} - {pickupLocation.city}, {pickupLocation.state}
                  </div>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-error-600" />
                <span className="text-sm font-medium text-neutral-900">Drop-off</span>
              </div>
              <div className="ml-6 space-y-1">
                <div className="text-sm text-neutral-900">
                  {dropoffFormatted.date} at {dropoffFormatted.time}
                </div>
                {dropoffLocation && (
                  <div className="text-sm text-neutral-600">
                    {dropoffLocation.name} - {dropoffLocation.city}, {dropoffLocation.state}
                  </div>
                )}
              </div>
            </div>

            {/* Duration Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-full">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                {numDays} {numDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes (if provided) */}
      {notes && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Additional Notes</h3>
              </div>
            </div>
            <div className="ml-13 text-sm text-neutral-700 whitespace-pre-wrap">{notes}</div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Card */}
      {pricing && vehicle && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white rounded-lg" />
          <Card className="relative border-2 border-primary-200">
            <CardContent className="p-6">
              <PriceSummary
                subtotalCents={pricing.subtotalCents}
                taxCents={pricing.taxCents}
                totalCents={pricing.totalCents}
                depositCents={pricing.depositCents}
                numDays={numDays}
                dailyRateCents={vehicle.dailyRateCents}
                expanded={true}
                className="border-0 bg-transparent"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4 pt-4 border-t border-neutral-200">
        <Button
          variant="outline"
          onClick={back}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        <Button
          onClick={onNext}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading skeleton component for the review step
 */
function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-neutral-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-neutral-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-neutral-200 rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 ml-13">
          <div className="h-4 bg-neutral-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-neutral-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
