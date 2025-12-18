'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card';
import { VehicleForm } from '@/components/features/vehicles/VehicleForm';
import { useCreateVehicle } from '@/lib/hooks/api/use-vehicles';
import { useLocations } from '@/lib/hooks/api/use-locations';
import type { VehicleFormData } from '@/lib/validations/vehicle.validation';

export default function NewVehiclePage() {
  const router = useRouter();
  const createVehicle = useCreateVehicle();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  const handleSubmit = async (data: VehicleFormData) => {
    try {
      await createVehicle.mutateAsync({
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

      // Success - navigate to vehicles list
      router.push('/vehicles');

      // In production, show success toast
      // toast.success('Vehicle added successfully');
    } catch (error: any) {
      console.error('Failed to create vehicle:', error);

      // In production, show error toast with details
      const errorMessage = error?.response?.data?.message || 'Failed to add vehicle. Please try again.';
      alert(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push('/vehicles');
  };

  if (locationsLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading...</p>
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
          onClick={() => router.push('/vehicles')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Vehicles
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Add New Vehicle</h1>
          <p className="text-neutral-600">
            Add a vehicle to your fleet with pricing and availability details
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <VehicleForm
              mode="create"
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createVehicle.isPending}
              locations={locations}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
