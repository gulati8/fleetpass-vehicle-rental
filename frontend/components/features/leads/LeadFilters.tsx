'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Button } from '@/components/ui/button/Button';
import { Badge } from '@/components/ui/badge/Badge';
import { LeadStatus, LeadSource } from '@shared/types';

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

interface LeadFiltersProps {
  filters: {
    search: string;
    status: string;
    source: string;
    assignedToId: string;
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  users: User[];
  isLoading?: boolean;
}

export function LeadFilters({
  filters,
  onFilterChange,
  onClearFilters,
  users,
  isLoading = false,
}: LeadFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== '' && value !== 'all'
  ).length;

  // Format status display
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case LeadStatus.NEW:
        return 'New';
      case LeadStatus.CONTACTED:
        return 'Contacted';
      case LeadStatus.QUALIFIED:
        return 'Qualified';
      case LeadStatus.CONVERTED:
        return 'Converted';
      case LeadStatus.LOST:
        return 'Lost';
      default:
        return status;
    }
  };

  // Format source display
  const getSourceLabel = (source: string): string => {
    switch (source) {
      case LeadSource.WEBSITE:
        return 'Website';
      case LeadSource.PHONE:
        return 'Phone';
      case LeadSource.WALK_IN:
        return 'Walk-in';
      case LeadSource.REFERRAL:
        return 'Referral';
      case LeadSource.SOCIAL_MEDIA:
        return 'Social Media';
      case LeadSource.OTHER:
        return 'Other';
      default:
        return source;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search bar - always visible */}
      <div className="relative">
        <Input
          placeholder="Search by name, email, phone..."
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
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Status
              </label>
              <Select
                name="status"
                value={filters.status}
                onChange={(e) =>
                  onFilterChange({ ...filters, status: e.target.value })
                }
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: LeadStatus.NEW, label: 'New' },
                  { value: LeadStatus.CONTACTED, label: 'Contacted' },
                  { value: LeadStatus.QUALIFIED, label: 'Qualified' },
                  { value: LeadStatus.CONVERTED, label: 'Converted' },
                  { value: LeadStatus.LOST, label: 'Lost' },
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Source
              </label>
              <Select
                name="source"
                value={filters.source}
                onChange={(e) =>
                  onFilterChange({ ...filters, source: e.target.value })
                }
                options={[
                  { value: '', label: 'All Sources' },
                  { value: LeadSource.WEBSITE, label: 'Website' },
                  { value: LeadSource.PHONE, label: 'Phone' },
                  { value: LeadSource.WALK_IN, label: 'Walk-in' },
                  { value: LeadSource.REFERRAL, label: 'Referral' },
                  { value: LeadSource.SOCIAL_MEDIA, label: 'Social Media' },
                  { value: LeadSource.OTHER, label: 'Other' },
                ]}
                disabled={isLoading}
              />
            </div>

            {/* Assigned to */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Assigned To
              </label>
              <Select
                name="assignedToId"
                value={filters.assignedToId}
                onChange={(e) =>
                  onFilterChange({ ...filters, assignedToId: e.target.value })
                }
                options={[
                  { value: '', label: 'All Users' },
                  { value: 'unassigned', label: 'Unassigned' },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.firstName} ${user.lastName}`,
                  })),
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
                {filters.status && (
                  <Badge variant="secondary" size="sm">
                    Status: {getStatusLabel(filters.status)}
                  </Badge>
                )}
                {filters.source && (
                  <Badge variant="secondary" size="sm">
                    Source: {getSourceLabel(filters.source)}
                  </Badge>
                )}
                {filters.assignedToId && (
                  <Badge variant="secondary" size="sm">
                    {filters.assignedToId === 'unassigned'
                      ? 'Unassigned'
                      : `Assigned: ${
                          users.find((u) => u.id === filters.assignedToId)
                            ? `${users.find((u) => u.id === filters.assignedToId)?.firstName} ${
                                users.find((u) => u.id === filters.assignedToId)?.lastName
                              }`
                            : 'Selected'
                        }`}
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
