'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Checkbox } from '@/components/ui/checkbox/Checkbox';
import { Label } from '@/components/ui/label/Label';
import { FormError } from '@/components/ui/form/FormError';
import { VehicleImageUploader } from './VehicleImageUploader';
import {
  vehicleSchema,
  type VehicleFormData,
  formatCentsToDollars,
  dollarsToCents,
} from '@/lib/validations/vehicle.validation';

interface Location {
  id: string;
  name: string;
}

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormData>;
  onSubmit: (data: VehicleFormData) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  locations: Location[];
  vehicleId?: string; // Required in edit mode for image uploads
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
  locations,
  vehicleId,
}: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      isAvailableForRent: true,
      imageUrls: [],
      ...defaultValues,
    },
  });

  const isAvailable = watch('isAvailableForRent');
  const imageUrls = watch('imageUrls') || [];

  const handleFormSubmit = async (data: VehicleFormData) => {
    // Convert dollar inputs to cents
    const formattedData = {
      ...data,
      dailyRateCents: dollarsToCents(data.dailyRateCents),
      weeklyRateCents: data.weeklyRateCents ? dollarsToCents(data.weeklyRateCents) : null,
      monthlyRateCents: data.monthlyRateCents ? dollarsToCents(data.monthlyRateCents) : null,
    };

    await onSubmit(formattedData);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Information */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Make */}
          <div>
            <Label htmlFor="make" required>
              Make
            </Label>
            <Input
              id="make"
              {...register('make')}
              error={!!errors.make}
              placeholder="e.g., Toyota"
              disabled={isLoading}
            />
            {errors.make && <FormError>{errors.make.message}</FormError>}
          </div>

          {/* Model */}
          <div>
            <Label htmlFor="model" required>
              Model
            </Label>
            <Input
              id="model"
              {...register('model')}
              error={!!errors.model}
              placeholder="e.g., Camry"
              disabled={isLoading}
            />
            {errors.model && <FormError>{errors.model.message}</FormError>}
          </div>

          {/* Year */}
          <div>
            <Label htmlFor="year" required>
              Year
            </Label>
            <Input
              id="year"
              type="number"
              {...register('year')}
              error={!!errors.year}
              placeholder={new Date().getFullYear().toString()}
              disabled={isLoading}
            />
            {errors.year && <FormError>{errors.year.message}</FormError>}
          </div>

          {/* Trim */}
          <div>
            <Label htmlFor="trim" optional>
              Trim
            </Label>
            <Input
              id="trim"
              {...register('trim')}
              error={!!errors.trim}
              placeholder="e.g., LE, XLE"
              disabled={isLoading}
            />
            {errors.trim && <FormError>{errors.trim.message}</FormError>}
          </div>

          {/* VIN */}
          <div className="md:col-span-2">
            <Label htmlFor="vin" required>
              VIN (Vehicle Identification Number)
            </Label>
            <Input
              id="vin"
              {...register('vin')}
              error={!!errors.vin}
              placeholder="17-character VIN"
              maxLength={17}
              className="font-mono"
              disabled={isLoading || mode === 'edit'} // VIN cannot be edited
            />
            {errors.vin && <FormError>{errors.vin.message}</FormError>}
            {mode === 'edit' && (
              <p className="text-xs text-neutral-500 mt-1">VIN cannot be changed</p>
            )}
          </div>
        </div>
      </section>

      {/* Vehicle Images */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Vehicle Images
        </h3>
        <VehicleImageUploader
          vehicleId={vehicleId} // undefined in create mode
          imageUrls={imageUrls}
          onImagesChange={(urls) => setValue('imageUrls', urls, { shouldDirty: true })}
        />
      </section>

      {/* Vehicle Details */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Vehicle Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Body Type */}
          <div>
            <Label htmlFor="bodyType" optional>
              Body Type
            </Label>
            <Select
              id="bodyType"
              {...register('bodyType')}
              error={!!errors.bodyType}
              options={[
                { value: '', label: 'Select body type' },
                { value: 'sedan', label: 'Sedan' },
                { value: 'suv', label: 'SUV' },
                { value: 'truck', label: 'Truck' },
                { value: 'van', label: 'Van' },
                { value: 'luxury', label: 'Luxury' },
                { value: 'coupe', label: 'Coupe' },
                { value: 'convertible', label: 'Convertible' },
                { value: 'wagon', label: 'Wagon' },
                { value: 'hatchback', label: 'Hatchback' },
              ]}
              disabled={isLoading}
            />
            {errors.bodyType && <FormError>{errors.bodyType.message}</FormError>}
          </div>

          {/* Transmission */}
          <div>
            <Label htmlFor="transmission" optional>
              Transmission
            </Label>
            <Select
              id="transmission"
              {...register('transmission')}
              error={!!errors.transmission}
              options={[
                { value: '', label: 'Select transmission' },
                { value: 'automatic', label: 'Automatic' },
                { value: 'manual', label: 'Manual' },
                { value: 'cvt', label: 'CVT' },
              ]}
              disabled={isLoading}
            />
            {errors.transmission && <FormError>{errors.transmission.message}</FormError>}
          </div>

          {/* Fuel Type */}
          <div>
            <Label htmlFor="fuelType" optional>
              Fuel Type
            </Label>
            <Select
              id="fuelType"
              {...register('fuelType')}
              error={!!errors.fuelType}
              options={[
                { value: '', label: 'Select fuel type' },
                { value: 'gas', label: 'Gasoline' },
                { value: 'diesel', label: 'Diesel' },
                { value: 'electric', label: 'Electric' },
                { value: 'hybrid', label: 'Hybrid' },
              ]}
              disabled={isLoading}
            />
            {errors.fuelType && <FormError>{errors.fuelType.message}</FormError>}
          </div>

          {/* Mileage */}
          <div>
            <Label htmlFor="mileage" optional>
              Current Mileage
            </Label>
            <Input
              id="mileage"
              type="number"
              {...register('mileage')}
              error={!!errors.mileage}
              placeholder="0"
              disabled={isLoading}
            />
            {errors.mileage && <FormError>{errors.mileage.message}</FormError>}
          </div>

          {/* Exterior Color */}
          <div>
            <Label htmlFor="exteriorColor" optional>
              Exterior Color
            </Label>
            <Input
              id="exteriorColor"
              {...register('exteriorColor')}
              error={!!errors.exteriorColor}
              placeholder="e.g., Silver"
              disabled={isLoading}
            />
            {errors.exteriorColor && <FormError>{errors.exteriorColor.message}</FormError>}
          </div>

          {/* Interior Color */}
          <div>
            <Label htmlFor="interiorColor" optional>
              Interior Color
            </Label>
            <Input
              id="interiorColor"
              {...register('interiorColor')}
              error={!!errors.interiorColor}
              placeholder="e.g., Black"
              disabled={isLoading}
            />
            {errors.interiorColor && <FormError>{errors.interiorColor.message}</FormError>}
          </div>
        </div>
      </section>

      {/* Pricing & Location */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Pricing & Location
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Rate */}
          <div>
            <Label htmlFor="dailyRateCents" required>
              Daily Rate
            </Label>
            <Input
              id="dailyRateCents"
              type="number"
              step="0.01"
              {...register('dailyRateCents')}
              error={!!errors.dailyRateCents}
              placeholder="45.00"
              disabled={isLoading}
            />
            {errors.dailyRateCents && (
              <FormError>{errors.dailyRateCents.message}</FormError>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              Enter amount in dollars (e.g., 45.00 for $45/day)
            </p>
          </div>

          {/* Weekly Rate */}
          <div>
            <Label htmlFor="weeklyRateCents" optional>
              Weekly Rate
            </Label>
            <Input
              id="weeklyRateCents"
              type="number"
              step="0.01"
              {...register('weeklyRateCents')}
              error={!!errors.weeklyRateCents}
              placeholder="250.00"
              disabled={isLoading}
            />
            {errors.weeklyRateCents && (
              <FormError>{errors.weeklyRateCents.message}</FormError>
            )}
          </div>

          {/* Monthly Rate */}
          <div>
            <Label htmlFor="monthlyRateCents" optional>
              Monthly Rate
            </Label>
            <Input
              id="monthlyRateCents"
              type="number"
              step="0.01"
              {...register('monthlyRateCents')}
              error={!!errors.monthlyRateCents}
              placeholder="900.00"
              disabled={isLoading}
            />
            {errors.monthlyRateCents && (
              <FormError>{errors.monthlyRateCents.message}</FormError>
            )}
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="locationId" required>
              Location
            </Label>
            <Select
              id="locationId"
              {...register('locationId')}
              error={!!errors.locationId}
              options={[
                { value: '', label: 'Select location' },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
              disabled={isLoading}
            />
            {errors.locationId && <FormError>{errors.locationId.message}</FormError>}
          </div>
        </div>
      </section>

      {/* Availability & Notes */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Availability & Notes
        </h3>
        <div className="space-y-6">
          {/* Availability Checkbox */}
          <Checkbox
            id="isAvailableForRent"
            label="Available for rent"
            description="Make this vehicle available for customers to book"
            {...register('isAvailableForRent')}
            disabled={isLoading}
          />

          {/* Notes */}
          <div>
            <Label htmlFor="notes" optional>
              Internal Notes
            </Label>
            <textarea
              id="notes"
              {...register('notes')}
              className="w-full min-h-[100px] px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add any internal notes about this vehicle..."
              disabled={isLoading}
              maxLength={1000}
            />
            {errors.notes && <FormError>{errors.notes.message}</FormError>}
            <p className="text-xs text-neutral-500 mt-1">
              For internal use only. Not visible to customers.
            </p>
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelClick}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : mode === 'create' ? (
            'Add Vehicle'
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
