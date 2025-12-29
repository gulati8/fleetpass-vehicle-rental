'use client';

/**
 * Step 1: Booking Details
 *
 * Wrapper component that integrates the existing BookingForm into the wizard flow.
 * This step collects all booking-related information including:
 * - Customer selection
 * - Vehicle selection
 * - Pickup/Dropoff locations and dates
 * - Optional booking notes
 *
 * Features:
 * - Integrates with wizard context for state management
 * - Uses existing BookingForm component for consistent UX
 * - Validates form data before allowing navigation to next step
 * - Syncs form state with wizard context
 * - Handles pre-filled data for edit flows
 */

import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useWizard } from '../BookingWizardContext';
import { bookingFormSchema, type BookingFormData } from '@/lib/validations/booking.validation';
import type { BookingWizardData } from '@/types/wizard.types';
import { useCustomers } from '@/lib/hooks/api/use-customers';
import { useVehicles } from '@/lib/hooks/api/use-vehicles';
import { useLocations } from '@/lib/hooks/api/use-locations';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Select } from '@/components/ui/select/Select';
import { Input } from '@/components/ui/input/Input';
import { Calendar, MapPin, User, Car, DollarSign, FileText } from 'lucide-react';

export interface BookingDetailsStepProps {
  /** Callback when user clicks Next and validation passes */
  onNext: (data: BookingWizardData) => void;
}

/**
 * Step 1 Component - Booking Details Form
 *
 * This component wraps the booking form fields and integrates with the wizard context.
 * It handles form validation, state synchronization, and navigation to the next step.
 *
 * @param props - Component props
 * @param props.onNext - Callback invoked when user clicks Next with valid form data
 *
 * @example
 * ```tsx
 * <Step1BookingDetails
 *   onNext={(data) => {
 *     // Handle navigation to step 2
 *     console.log('Booking data:', data);
 *   }}
 * />
 * ```
 */
export function Step1BookingDetails({ onNext }: BookingDetailsStepProps) {
  const { state, setStepError, clearErrors } = useWizard();
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);

  // Initialize form with data from wizard context (for edit flow or back navigation)
  const methods = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: state.bookingData || {
      customerId: '',
      vehicleId: state.vehicleData.vehicleId || '',
      pickupLocationId: state.vehicleData.pickupLocationId || '',
      dropoffLocationId: state.vehicleData.dropoffLocationId || '',
      pickupDatetime: '',
      dropoffDatetime: '',
      notes: '',
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  // Fetch dropdown options
  const {
    data: customers = [],
    isLoading: loadingCustomers,
    isError: isCustomersError,
    error: customersError
  } = useCustomers();
  const {
    data: vehicles = [],
    isLoading: loadingVehicles,
    isError: isVehiclesError,
    error: vehiclesError
  } = useVehicles();
  const {
    data: locations = [],
    isLoading: loadingLocations,
    isError: isLocationsError,
    error: locationsError
  } = useLocations();

  // Watch form values for real-time updates
  const selectedVehicleId = watch('vehicleId');
  const pickupDatetime = watch('pickupDatetime');
  const dropoffDatetime = watch('dropoffDatetime');

  // Calculate estimated total in real-time
  useEffect(() => {
    if (selectedVehicleId && pickupDatetime && dropoffDatetime) {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (vehicle && vehicle.dailyRateCents) {
        const pickup = new Date(pickupDatetime);
        const dropoff = new Date(dropoffDatetime);
        const days = Math.max(1, Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));
        const subtotal = vehicle.dailyRateCents * days;
        const tax = Math.round(subtotal * 0.08); // 8% tax
        setEstimatedTotal((subtotal + tax) / 100);
      }
    } else {
      setEstimatedTotal(null);
    }
  }, [selectedVehicleId, pickupDatetime, dropoffDatetime, vehicles]);

  // Note: Form state sync removed to prevent race conditions
  // State updates now only happen on form submit (see onSubmit handler)

  // Clear errors when form changes
  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      clearErrors();
    }
  }, [errors, clearErrors]);

  /**
   * Handle form submission
   * Validates form data and calls onNext callback with the form values
   */
  const onSubmit = handleSubmit(
    (data: BookingFormData) => {
      // Clear any existing errors
      setStepError(1, null);
      clearErrors();

      // Convert to BookingWizardData and call onNext
      // Note: The wizard's onNext callback will handle updating the context
      const wizardData: BookingWizardData = {
        ...data,
        notes: data.notes || undefined,
      };

      onNext(wizardData);
    },
    (errors) => {
      // Handle validation errors
      const firstError = Object.values(errors)[0];
      if (firstError) {
        setStepError(1, {
          message: firstError.message || 'Please fix the form errors before continuing',
          code: 'VALIDATION_ERROR',
        });
      }
    }
  );

  // Prepare dropdown options
  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName} (${c.email})`,
  }));

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.year} ${v.make} ${v.model} - ${v.vin}`,
  }));

  const locationOptions = locations.map((l) => ({
    value: l.id,
    label: `${l.name} - ${l.city}, ${l.state}`,
  }));

  const isLoading = loadingCustomers || loadingVehicles || loadingLocations;

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* API Error Banner */}
        {(isCustomersError || isVehiclesError || isLocationsError) && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg" role="alert">
            <p className="text-sm text-error-700 font-medium">Failed to load required data</p>
            <p className="text-xs text-error-600 mt-1">Please refresh the page to try again.</p>
          </div>
        )}

        {/* Customer Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Customer</h3>
                <p className="text-sm text-neutral-600">Select the customer for this booking</p>
              </div>
            </div>

            <Select
              {...register('customerId')}
              options={[{ value: '', label: 'Select a customer' }, ...customerOptions]}
              error={errors.customerId?.message}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Vehicle Selection */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Vehicle</h3>
                <p className="text-sm text-neutral-600">Choose the vehicle to rent</p>
              </div>
            </div>

            <Select
              {...register('vehicleId')}
              options={[{ value: '', label: 'Select a vehicle' }, ...vehicleOptions]}
              error={errors.vehicleId?.message}
              disabled={isLoading}
            />
          </CardContent>
        </Card>

        {/* Pickup & Dropoff Details */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Rental Period</h3>
                <p className="text-sm text-neutral-600">Set pickup and drop-off details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Pickup Location
                </label>
                <Select
                  {...register('pickupLocationId')}
                  options={[{ value: '', label: 'Select location' }, ...locationOptions]}
                  error={errors.pickupLocationId?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Drop-off Location
                </label>
                <Select
                  {...register('dropoffLocationId')}
                  options={[{ value: '', label: 'Select location' }, ...locationOptions]}
                  error={errors.dropoffLocationId?.message}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Pickup Date & Time
                </label>
                <Input
                  type="datetime-local"
                  {...register('pickupDatetime')}
                  error={errors.pickupDatetime?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Drop-off Date & Time
                </label>
                <Input
                  type="datetime-local"
                  {...register('dropoffDatetime')}
                  error={errors.dropoffDatetime?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">Additional Details</h3>
                <p className="text-sm text-neutral-600">Add any special notes or requirements</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Any special requirements or notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Estimated Total */}
        {estimatedTotal !== null && (
          <Card className="bg-primary-50 border-primary-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">Estimated Total</h3>
                    <p className="text-sm text-neutral-600">Including taxes and fees</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary-700">
                  ${estimatedTotal.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display step errors */}
        {state.errors[1] && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-sm text-error-700">{state.errors[1].message}</p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-end gap-4 pt-4 border-t border-neutral-200">
          <Button
            type="submit"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            isLoading={isSubmitting}
            disabled={isLoading}
          >
            {isSubmitting ? 'Validating...' : 'Next: Review Details'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
