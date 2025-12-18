'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';

interface Location {
  id: string;
  name: string;
}

interface VehicleFiltersProps {
  filters: {
    search: string;
    locationId: string;
    bodyType: string;
    transmission: string;
    fuelType: string;
    yearMin: string;
    yearMax: string;
    isAvailableForRent: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  locations: Location[];
  isLoading?: boolean;
}

export function VehicleFilters({
  filters,
  onFilterChange,
  onClearFilters,
  locations,
  isLoading = false,
}: VehicleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== '' && value !== 'all'
  ).length;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => {
    const year = currentYear - i + 1;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <div className="space-y-4">
      {/* Search bar - always visible */}
      <div className="relative">
        <Input
          placeholder="Search by VIN, make, model, or year..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          leftAddon={<Search className="w-4 h-4" />}
          className="pr-24"
          disabled={isLoading}
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter toggle button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          leftIcon={<Filter className="w-4 h-4" />}
          disabled={isLoading}
        >
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="primary" size="sm" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            disabled={isLoading}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Expandable filter section */}
      {isExpanded && (
        <div className="bg-white p-4 rounded-lg border border-neutral-200 space-y-4 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Location
              </label>
              <Select
                value={filters.locationId}
                onChange={(e) =>
                  onFilterChange({ ...filters, locationId: e.target.value })
                }
                options={[
                  { value: '', label: 'All Locations' },
                  ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Body Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Body Type
              </label>
              <Select
                value={filters.bodyType}
                onChange={(e) =>
                  onFilterChange({ ...filters, bodyType: e.target.value })
                }
                options={[
                  { value: '', label: 'All Types' },
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
            </div>

            {/* Transmission */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Transmission
              </label>
              <Select
                value={filters.transmission}
                onChange={(e) =>
                  onFilterChange({ ...filters, transmission: e.target.value })
                }
                options={[
                  { value: '', label: 'All Transmissions' },
                  { value: 'automatic', label: 'Automatic' },
                  { value: 'manual', label: 'Manual' },
                  { value: 'cvt', label: 'CVT' },
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Fuel Type
              </label>
              <Select
                value={filters.fuelType}
                onChange={(e) =>
                  onFilterChange({ ...filters, fuelType: e.target.value })
                }
                options={[
                  { value: '', label: 'All Fuel Types' },
                  { value: 'gasoline', label: 'Gasoline' },
                  { value: 'diesel', label: 'Diesel' },
                  { value: 'electric', label: 'Electric' },
                  { value: 'hybrid', label: 'Hybrid' },
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Year Min */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Year From
              </label>
              <Select
                value={filters.yearMin}
                onChange={(e) =>
                  onFilterChange({ ...filters, yearMin: e.target.value })
                }
                options={[
                  { value: '', label: 'Any Year' },
                  ...yearOptions,
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Year Max */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Year To
              </label>
              <Select
                value={filters.yearMax}
                onChange={(e) =>
                  onFilterChange({ ...filters, yearMax: e.target.value })
                }
                options={[
                  { value: '', label: 'Any Year' },
                  ...yearOptions,
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Availability Status */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Availability
              </label>
              <Select
                value={filters.isAvailableForRent}
                onChange={(e) =>
                  onFilterChange({ ...filters, isAvailableForRent: e.target.value })
                }
                options={[
                  { value: '', label: 'All Vehicles' },
                  { value: 'true', label: 'Available Only' },
                  { value: 'false', label: 'Unavailable Only' },
                ]}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Active filters summary */}
          {activeFilterCount > 0 && (
            <div className="pt-3 border-t border-neutral-200">
              <p className="text-xs font-medium text-neutral-700 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {filters.locationId && (
                  <Badge variant="secondary" size="sm">
                    Location:{' '}
                    {locations.find((l) => l.id === filters.locationId)?.name || 'Selected'}
                  </Badge>
                )}
                {filters.bodyType && (
                  <Badge variant="secondary" size="sm" className="capitalize">
                    {filters.bodyType}
                  </Badge>
                )}
                {filters.transmission && (
                  <Badge variant="secondary" size="sm" className="capitalize">
                    {filters.transmission}
                  </Badge>
                )}
                {filters.fuelType && (
                  <Badge variant="secondary" size="sm" className="capitalize">
                    {filters.fuelType}
                  </Badge>
                )}
                {filters.yearMin && (
                  <Badge variant="secondary" size="sm">
                    From {filters.yearMin}
                  </Badge>
                )}
                {filters.yearMax && (
                  <Badge variant="secondary" size="sm">
                    To {filters.yearMax}
                  </Badge>
                )}
                {filters.isAvailableForRent && (
                  <Badge variant="secondary" size="sm">
                    {filters.isAvailableForRent === 'true' ? 'Available' : 'Unavailable'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
