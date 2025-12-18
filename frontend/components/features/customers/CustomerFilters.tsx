'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';

interface CustomerFiltersProps {
  filters: {
    search: string;
    kycStatus: string;
    hasBookings: string;
    sortBy: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function CustomerFilters({
  filters,
  onFilterChange,
  onClearFilters,
  isLoading = false,
}: CustomerFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== '' && value !== 'all' && value !== 'newest'
  ).length;

  return (
    <div className="space-y-4">
      {/* Search bar - always visible */}
      <div className="relative">
        <Input
          placeholder="Search by name, email, or phone..."
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

      {/* Quick filters and toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* KYC Status quick filter */}
          <Select
            value={filters.kycStatus}
            onChange={(e) =>
              onFilterChange({ ...filters, kycStatus: e.target.value })
            }
            options={[
              { value: '', label: 'All KYC Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Declined' },
            ]}
            disabled={isLoading}
            className="w-auto min-w-[140px]"
          />

          {/* Has Bookings filter */}
          <Select
            value={filters.hasBookings}
            onChange={(e) =>
              onFilterChange({ ...filters, hasBookings: e.target.value })
            }
            options={[
              { value: '', label: 'All Customers' },
              { value: 'true', label: 'Has Bookings' },
              { value: 'false', label: 'No Bookings' },
            ]}
            disabled={isLoading}
            className="w-auto min-w-[140px]"
          />

          {/* Sort */}
          <Select
            value={filters.sortBy}
            onChange={(e) =>
              onFilterChange({ ...filters, sortBy: e.target.value })
            }
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'name_asc', label: 'Name (A-Z)' },
              { value: 'name_desc', label: 'Name (Z-A)' },
            ]}
            disabled={isLoading}
            className="w-auto min-w-[140px]"
          />
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              disabled={isLoading}
            >
              Clear all
              <Badge variant="neutral" size="sm" className="ml-2">
                {activeFilterCount}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-neutral-700">
            Active filters:
          </span>
          {filters.kycStatus && (
            <Badge
              variant="secondary"
              size="sm"
              className="capitalize cursor-pointer hover:bg-neutral-300"
              onClick={() => onFilterChange({ ...filters, kycStatus: '' })}
            >
              KYC: {filters.kycStatus}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {filters.hasBookings && (
            <Badge
              variant="secondary"
              size="sm"
              className="cursor-pointer hover:bg-neutral-300"
              onClick={() => onFilterChange({ ...filters, hasBookings: '' })}
            >
              {filters.hasBookings === 'true' ? 'Has Bookings' : 'No Bookings'}
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {filters.sortBy && filters.sortBy !== 'newest' && (
            <Badge
              variant="secondary"
              size="sm"
              className="cursor-pointer hover:bg-neutral-300"
              onClick={() => onFilterChange({ ...filters, sortBy: 'newest' })}
            >
              Sort:{' '}
              {
                [
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'name_asc', label: 'A-Z' },
                  { value: 'name_desc', label: 'Z-A' },
                ].find((opt) => opt.value === filters.sortBy)?.label
              }
              <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CustomerEmptyState - Display when no customers found
 */
interface CustomerEmptyStateProps {
  type: 'no-customers' | 'no-results';
  onAddCustomer?: () => void;
  onClearFilters?: () => void;
}

export function CustomerEmptyState({
  type,
  onAddCustomer,
  onClearFilters,
}: CustomerEmptyStateProps) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <Search className="w-10 h-10 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          No customers found
        </h3>
        <p className="text-neutral-600 text-center mb-6 max-w-md">
          We couldn't find any customers matching your search criteria. Try adjusting
          your filters or search terms.
        </p>
        {onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  // no-customers
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-primary-600" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        No customers yet
      </h3>
      <p className="text-neutral-600 text-center mb-6 max-w-md">
        Get started by adding your first customer. You'll be able to manage their
        information, verify their identity, and create bookings.
      </p>
      {onAddCustomer && (
        <Button variant="primary" onClick={onAddCustomer}>
          Add Customer
        </Button>
      )}
    </div>
  );
}
