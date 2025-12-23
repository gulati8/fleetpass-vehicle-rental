'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Gauge,
  Fuel,
  Settings,
  Car,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';
import { useVehicle, useDeleteVehicle } from '@/lib/hooks/api/use-vehicles';
import { VehicleAvailabilityCalendar } from '@/components/features/vehicles/VehicleAvailabilityCalendar';
import { formatCentsToDollars } from '@/lib/validations/vehicle.validation';

export default function VehicleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: vehicle, isLoading: vehicleLoading } = useVehicle(vehicleId);
  const deleteVehicle = useDeleteVehicle();

  const handleEdit = () => {
    router.push(`/vehicles/${vehicleId}/edit`);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteVehicle.mutateAsync(vehicleId);
      router.push('/vehicles');
      // In production, show success toast
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      alert('Failed to delete vehicle. Please try again.');
    }
  };

  // Loading state
  if (vehicleLoading) {
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

  const dailyRate = formatCentsToDollars(vehicle.dailyRateCents);
  const weeklyRate = vehicle.weeklyRateCents
    ? formatCentsToDollars(vehicle.weeklyRateCents)
    : null;
  const monthlyRate = vehicle.monthlyRateCents
    ? formatCentsToDollars(vehicle.monthlyRateCents)
    : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.trim && (
                <p className="text-lg text-neutral-600">{vehicle.trim}</p>
              )}
              <p className="text-sm text-neutral-500 font-mono mt-2">
                VIN: {vehicle.vin}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={vehicle.isAvailableForRent ? 'success' : 'neutral'}
                size="lg"
              >
                {vehicle.isAvailableForRent ? 'Available' : 'Unavailable'}
              </Badge>
              <Button
                variant="outline"
                onClick={handleEdit}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeleteClick}
                className="text-error-600 hover:text-error-700 hover:bg-error-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Vehicle details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <Card>
              <CardContent className="p-0">
                <div className="w-full h-96 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-xl flex items-center justify-center overflow-hidden">
                  {vehicle.imageUrls.length > 0 ? (
                    <img
                      src={vehicle.imageUrls[0]}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Car className="w-32 h-32 text-neutral-300" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Make</p>
                    <p className="font-medium text-neutral-900">{vehicle.make}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Model</p>
                    <p className="font-medium text-neutral-900">{vehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Year</p>
                    <p className="font-medium text-neutral-900">{vehicle.year}</p>
                  </div>
                  {vehicle.trim && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Trim</p>
                      <p className="font-medium text-neutral-900">{vehicle.trim}</p>
                    </div>
                  )}
                  {vehicle.bodyType && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Body Type</p>
                      <p className="font-medium text-neutral-900 capitalize">
                        {vehicle.bodyType}
                      </p>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Transmission</p>
                      <p className="font-medium text-neutral-900 capitalize">
                        {vehicle.transmission}
                      </p>
                    </div>
                  )}
                  {vehicle.fuelType && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Fuel Type</p>
                      <p className="font-medium text-neutral-900 capitalize">
                        {vehicle.fuelType}
                      </p>
                    </div>
                  )}
                  {vehicle.mileage !== null && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Mileage</p>
                      <p className="font-medium text-neutral-900">
                        {vehicle.mileage?.toLocaleString() || 'N/A'} mi
                      </p>
                    </div>
                  )}
                  {vehicle.exteriorColor && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Exterior Color</p>
                      <p className="font-medium text-neutral-900">
                        {vehicle.exteriorColor}
                      </p>
                    </div>
                  )}
                  {vehicle.interiorColor && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Interior Color</p>
                      <p className="font-medium text-neutral-900">
                        {vehicle.interiorColor}
                      </p>
                    </div>
                  )}
                </div>

                {vehicle.notes && (
                  <div className="mt-6 pt-6 border-t border-neutral-200">
                    <p className="text-sm text-neutral-500 mb-2">Internal Notes</p>
                    <p className="text-neutral-700 whitespace-pre-wrap">
                      {vehicle.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-primary-700 mb-1">Daily Rate</p>
                    <p className="text-2xl font-bold text-primary-900">{dailyRate}</p>
                  </div>
                  {weeklyRate && (
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Weekly Rate</p>
                      <p className="text-2xl font-bold text-neutral-900">{weeklyRate}</p>
                    </div>
                  )}
                  {monthlyRate && (
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-600 mb-1">Monthly Rate</p>
                      <p className="text-2xl font-bold text-neutral-900">
                        {monthlyRate}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Availability & bookings */}
          <div className="space-y-6">
            {/* Quick stats */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Status</span>
                    <Badge
                      variant={vehicle.isAvailableForRent ? 'success' : 'neutral'}
                    >
                      {vehicle.isAvailableForRent ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Total Bookings</span>
                    <span className="font-semibold text-neutral-900">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Revenue (Total)</span>
                    <span className="font-semibold text-neutral-900">$0.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Availability Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleAvailabilityCalendar
                  vehicleId={vehicle.id}
                  bookedDates={[]}
                  maintenanceDates={[]}
                />
              </CardContent>
            </Card>

            {/* Recent bookings placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-neutral-500 text-sm">No bookings yet</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="md"
      >
        <ModalHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <ModalTitle>Delete Vehicle</ModalTitle>
            </div>
            <ModalCloseButton onClose={() => setDeleteModalOpen(false)} />
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-error-600" />
            </div>
            <div>
              <p className="text-neutral-900 font-medium mb-2">
                Are you sure you want to delete this vehicle?
              </p>
              <p className="text-sm text-neutral-600 mb-3">
                <strong>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </strong>
                <br />
                VIN: {vehicle.vin}
              </p>
              <p className="text-sm text-neutral-600">
                This action cannot be undone. All associated data will be permanently
                removed.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleteVehicle.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            isLoading={deleteVehicle.isPending}
            className="bg-error-600 hover:bg-error-700"
          >
            {deleteVehicle.isPending ? 'Deleting...' : 'Delete Vehicle'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
