'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, MapPin, User, Car, DollarSign, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Card, CardContent } from '@/components/ui/card/Card';
import { useCustomers } from '@/lib/hooks/api/use-customers';
import { useVehicles } from '@/lib/hooks/api/use-vehicles';
import { useLocations } from '@/lib/hooks/api/use-locations';
import type { CreateBookingRequest } from '@shared/types';

interface BookingFormProps {
  onSubmit: (data: CreateBookingRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  initialCustomerId?: string;
}

export function BookingForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialCustomerId,
}: BookingFormProps) {
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateBookingRequest>({
    defaultValues: {
      customerId: initialCustomerId || '',
      vehicleId: '',
      pickupLocationId: '',
      dropoffLocationId: '',
      pickupDatetime: '',
      dropoffDatetime: '',
      notes: '',
    },
  });

  // Fetch options
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const { data: locations = [] } = useLocations();

  // Watch form values
  const selectedVehicleId = watch('vehicleId');
  const pickupDatetime = watch('pickupDatetime');
  const dropoffDatetime = watch('dropoffDatetime');

  // Calculate estimated total
  useEffect(() => {
    if (selectedVehicleId && pickupDatetime && dropoffDatetime) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
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

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName} (${c.email})`,
  }));

  const vehicleOptions = vehicles.map(v => ({
    value: v.id,
    label: `${v.year} ${v.make} ${v.model} - ${v.vin}`,
  }));

  const locationOptions = locations.map(l => ({
    value: l.id,
    label: `${l.name} - ${l.city}, ${l.state}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            {...register('customerId', { required: 'Customer is required' })}
            options={[{ value: '', label: 'Select a customer' }, ...customerOptions]}
            error={errors.customerId?.message}
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
            {...register('vehicleId', { required: 'Vehicle is required' })}
            options={[{ value: '', label: 'Select a vehicle' }, ...vehicleOptions]}
            error={errors.vehicleId?.message}
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
                {...register('pickupLocationId', { required: 'Pickup location is required' })}
                options={[{ value: '', label: 'Select location' }, ...locationOptions]}
                error={errors.pickupLocationId?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Drop-off Location
              </label>
              <Select
                {...register('dropoffLocationId', { required: 'Drop-off location is required' })}
                options={[{ value: '', label: 'Select location' }, ...locationOptions]}
                error={errors.dropoffLocationId?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Pickup Date & Time
              </label>
              <Input
                type="datetime-local"
                {...register('pickupDatetime', { required: 'Pickup date/time is required' })}
                error={errors.pickupDatetime?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Drop-off Date & Time
              </label>
              <Input
                type="datetime-local"
                {...register('dropoffDatetime', { required: 'Drop-off date/time is required' })}
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

      {/* Form Actions */}
      <div className="flex gap-4 justify-end pt-4 border-t border-neutral-200">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting} type="button">
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
