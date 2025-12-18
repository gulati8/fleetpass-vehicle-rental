'use client';

import { Car, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

interface VehicleEmptyStateProps {
  type: 'no-vehicles' | 'no-results';
  onAddVehicle?: () => void;
  onClearFilters?: () => void;
}

export function VehicleEmptyState({
  type,
  onAddVehicle,
  onClearFilters,
}: VehicleEmptyStateProps) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <Search className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">
          No vehicles found
        </h3>
        <p className="text-neutral-600 text-center mb-6 max-w-md">
          We couldn't find any vehicles matching your search criteria. Try adjusting your
          filters or search terms.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  // no-vehicles type
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mb-6">
        <Car className="w-12 h-12 text-primary-600" />
      </div>
      <h3 className="text-2xl font-semibold text-neutral-900 mb-3">
        No vehicles yet
      </h3>
      <p className="text-neutral-600 text-center mb-8 max-w-md">
        Get started by adding your first vehicle to the fleet. You can add details like
        make, model, pricing, and availability.
      </p>
      {onAddVehicle && (
        <Button
          size="lg"
          onClick={onAddVehicle}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          Add Your First Vehicle
        </Button>
      )}
    </div>
  );
}
