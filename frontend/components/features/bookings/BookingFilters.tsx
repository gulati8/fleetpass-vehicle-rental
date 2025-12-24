'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import type { BookingFilters as BookingFiltersType } from '@shared/types';

interface BookingFiltersProps {
  filters: BookingFiltersType & { sortBy?: string; sortOrder?: 'asc' | 'desc' };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function BookingFilters({
  filters,
  onFilterChange,
  onClearFilters,
  isLoading = false,
}: BookingFiltersProps) {
  const hasFilters = Object.values(filters).some(
    (value) => value !== '' && value !== undefined && value !== 'pickupDatetime' && value !== 'asc'
  );

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Input
          placeholder="Search by booking number, customer, or vehicle..."
          value={filters.search || ''}
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

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status filter */}
        <Select
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          disabled={isLoading}
          className="w-auto min-w-[140px]"
        />

        {/* Sort */}
        <Select
          value={filters.sortBy || 'pickupDatetime'}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
          options={[
            { value: 'pickupDatetime', label: 'Pickup Date' },
            { value: 'createdAt', label: 'Created Date' },
            { value: 'totalCents', label: 'Total Amount' },
          ]}
          disabled={isLoading}
          className="w-auto min-w-[140px]"
        />

        {/* Sort order */}
        <Select
          value={filters.sortOrder || 'asc'}
          onChange={(e) => onFilterChange({ ...filters, sortOrder: e.target.value })}
          options={[
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
          ]}
          disabled={isLoading}
          className="w-auto min-w-[130px]"
        />

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="ml-auto text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            disabled={isLoading}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state for no bookings
 */
interface BookingEmptyStateProps {
  type: 'no-bookings' | 'no-results';
  onClearFilters?: () => void;
  onAddBooking?: () => void;
}

export function BookingEmptyState({
  type,
  onClearFilters,
  onAddBooking,
}: BookingEmptyStateProps) {
  if (type === 'no-results') {
    return (
      <div className="text-center py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            No bookings found
          </h3>
          <p className="text-neutral-600 mb-6">
            Try adjusting your filters or search criteria to find what you're looking for.
          </p>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          No bookings yet
        </h3>
        <p className="text-neutral-600 mb-6">
          Get started by creating your first booking. You can assign vehicles to verified customers and manage rentals.
        </p>
        {onAddBooking && (
          <button
            onClick={onAddBooking}
            className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Create your first booking
          </button>
        )}
      </div>
    </div>
  );
}
