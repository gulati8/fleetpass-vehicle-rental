'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useVehicles, useDeleteVehicle } from '@/lib/hooks/api/use-vehicles';
import { useLocations } from '@/lib/hooks/api/use-locations';
import { VehicleCard } from '@/components/features/vehicles/VehicleCard';
import { VehicleFilters } from '@/components/features/vehicles/VehicleFilters';
import { VehicleEmptyState } from '@/components/features/vehicles/VehicleEmptyState';
import { VehicleSkeleton } from '@/components/features/vehicles/VehicleSkeleton';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import type { Vehicle } from '@shared/types';

function VehiclesPageContent() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    locationId: '',
    bodyType: '',
    transmission: '',
    fuelType: '',
    yearMin: '',
    yearMax: '',
    isAvailableForRent: '',
  });

  // Fetch data
  const { data: locations = [], isLoading: locationsLoading } = useLocations();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const deleteVehicle = useDeleteVehicle();

  // Client-side filtering (API doesn't support all filters yet)
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          vehicle.vin.toLowerCase().includes(searchLower) ||
          vehicle.make.toLowerCase().includes(searchLower) ||
          vehicle.model.toLowerCase().includes(searchLower) ||
          vehicle.year.toString().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Location filter
      if (filters.locationId && vehicle.locationId !== filters.locationId) {
        return false;
      }

      // Body type filter
      if (filters.bodyType && vehicle.bodyType !== filters.bodyType) {
        return false;
      }

      // Transmission filter
      if (filters.transmission && vehicle.transmission !== filters.transmission) {
        return false;
      }

      // Fuel type filter
      if (filters.fuelType && vehicle.fuelType !== filters.fuelType) {
        return false;
      }

      // Year range filters
      if (filters.yearMin && vehicle.year < parseInt(filters.yearMin)) {
        return false;
      }
      if (filters.yearMax && vehicle.year > parseInt(filters.yearMax)) {
        return false;
      }

      // Availability filter
      if (filters.isAvailableForRent !== '') {
        const isAvailable = filters.isAvailableForRent === 'true';
        if (vehicle.isAvailableForRent !== isAvailable) {
          return false;
        }
      }

      return true;
    });
  }, [vehicles, filters]);

  // Handlers
  const handleAddVehicle = () => {
    router.push('/vehicles/new');
  };

  const handleViewVehicle = (id: string) => {
    router.push(`/vehicles/${id}`);
  };

  const handleEditVehicle = (id: string) => {
    router.push(`/vehicles/${id}/edit`);
  };

  const handleDeleteClick = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle) {
      setVehicleToDelete(vehicle);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;

    try {
      await deleteVehicle.mutateAsync(vehicleToDelete.id);
      setDeleteModalOpen(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      // In production, show a toast notification
      alert('Failed to delete vehicle. Please try again.');
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      locationId: '',
      bodyType: '',
      transmission: '',
      fuelType: '',
      yearMin: '',
      yearMax: '',
      isAvailableForRent: '',
    });
  };

  const isLoading = vehiclesLoading || locationsLoading;
  const hasFilters = Object.values(filters).some((value) => value !== '');
  const hasResults = filteredVehicles.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-neutral-900">Vehicles</h1>
            <Button
              onClick={handleAddVehicle}
              leftIcon={<Plus className="w-5 h-5" />}
              disabled={isLoading}
            >
              Add Vehicle
            </Button>
          </div>
          <p className="text-neutral-600">
            Manage your vehicle fleet, pricing, and availability
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <VehicleFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={handleClearFilters}
            locations={locations}
            isLoading={isLoading}
          />
        </div>

        {/* View toggle and results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-600">
            {isLoading ? (
              'Loading vehicles...'
            ) : hasFilters ? (
              <>
                <span className="font-semibold">{filteredVehicles.length}</span> vehicle
                {filteredVehicles.length !== 1 ? 's' : ''} found
              </>
            ) : (
              <>
                <span className="font-semibold">{vehicles.length}</span> total vehicle
                {vehicles.length !== 1 ? 's' : ''}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              disabled={isLoading}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              disabled={isLoading}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Vehicles grid/list */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            <VehicleSkeleton viewMode={viewMode} count={8} />
          </div>
        ) : !hasResults ? (
          hasFilters ? (
            <VehicleEmptyState type="no-results" onClearFilters={handleClearFilters} />
          ) : (
            <VehicleEmptyState type="no-vehicles" onAddVehicle={handleAddVehicle} />
          )
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredVehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                viewMode={viewMode}
                onView={handleViewVehicle}
                onEdit={handleEditVehicle}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
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
              {vehicleToDelete && (
                <p className="text-sm text-neutral-600 mb-3">
                  <strong>
                    {vehicleToDelete.year} {vehicleToDelete.make} {vehicleToDelete.model}
                  </strong>
                  <br />
                  VIN: {vehicleToDelete.vin}
                </p>
              )}
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

export default function VehiclesPage() {
  return (
    <FeatureErrorBoundary featureName="Vehicle Management">
      <VehiclesPageContent />
    </FeatureErrorBoundary>
  );
}
