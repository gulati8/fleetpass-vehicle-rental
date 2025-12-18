'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { VehicleForm } from '@/components/features/vehicles/VehicleForm';
import { useVehicle, useUpdateVehicle } from '@/lib/hooks/api/use-vehicles';
import { useLocations } from '@/lib/hooks/api/use-locations';
import { apiFormatToFormData } from '@/lib/validations/vehicle.validation';
import type { VehicleFormData } from '@/lib/validations/vehicle.validation';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId);
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const updateVehicle = useUpdateVehicle();

  const handleSubmit = async (data: VehicleFormData) => {
    try {
      await updateVehicle.mutateAsync({
        id: vehicleId,
        ...data,
        // Convert nullables to undefined for API
        trim: data.trim || undefined,
        bodyType: data.bodyType || undefined,
        exteriorColor: data.exteriorColor || undefined,
        interiorColor: data.interiorColor || undefined,
        transmission: data.transmission || undefined,
        fuelType: data.fuelType || undefined,
        mileage: data.mileage || undefined,
        weeklyRateCents: data.weeklyRateCents || undefined,
        monthlyRateCents: data.monthlyRateCents || undefined,
        features: data.features || undefined,
        notes: data.notes || undefined,
        imageUrls: data.imageUrls || [],
      } as any);

      // Success - navigate to vehicle detail
      router.push(`/vehicles/${vehicleId}`);

      // In production, show success toast
      // toast.success('Vehicle updated successfully');
    } catch (error: any) {
      console.error('Failed to update vehicle:', error);

      // In production, show error toast with details
      const errorMessage =
        error?.response?.data?.message || 'Failed to update vehicle. Please try again.';
      alert(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push(`/vehicles/${vehicleId}`);
  };

  // Loading state
  if (vehicleLoading || locationsLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!vehicle) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Vehicle not found</h2>
          <p className="text-neutral-600 mb-6">
            The vehicle you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/vehicles')}>Back to Vehicles</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/vehicles/${vehicleId}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Vehicle
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Edit Vehicle</h1>
          <p className="text-neutral-600">
            Update vehicle information, pricing, and availability
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.trim && ` ${vehicle.trim}`}
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <VehicleForm
              mode="edit"
              defaultValues={apiFormatToFormData(vehicle)}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={updateVehicle.isPending}
              locations={locations}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
