'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useBookings } from '@/lib/hooks/api/use-bookings';
import { BookingCard, BookingSkeleton } from '@/components/features/bookings/BookingCard';
import { BookingFilters, BookingEmptyState } from '@/components/features/bookings/BookingFilters';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import type { BookingFilters as BookingFiltersType } from '@shared/types';

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Initialize filters from URL params if available
  const customerId = searchParams?.get('customerId') || undefined;

  // Filters state
  const [filters, setFilters] = useState<BookingFiltersType & { sortBy?: string; sortOrder?: 'asc' | 'desc' }>({
    search: '',
    status: '',
    customerId,
    sortBy: 'pickupDatetime',
    sortOrder: 'asc',
  });

  // Fetch data
  const { data: bookings = [], isLoading } = useBookings(filters);

  // Handlers
  const handleAddBooking = () => {
    router.push('/bookings/new');
  };

  const handleViewBooking = (id: string) => {
    router.push(`/bookings/${id}`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      sortBy: 'pickupDatetime',
      sortOrder: 'asc',
    });
  };

  const hasFilters = Object.values(filters).some(
    (value) => value !== '' && value !== undefined && value !== 'pickupDatetime' && value !== 'asc'
  );
  const hasResults = bookings.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-neutral-900">Bookings</h1>
            <Button
              onClick={handleAddBooking}
              leftIcon={<Plus className="w-5 h-5" />}
              disabled={isLoading}
            >
              New Booking
            </Button>
          </div>
          <p className="text-neutral-600">
            Manage vehicle rentals, track bookings, and monitor rental status
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <BookingFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={handleClearFilters}
            isLoading={isLoading}
          />
        </div>

        {/* View toggle and results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-600">
            {isLoading ? (
              'Loading bookings...'
            ) : hasFilters ? (
              <>
                <span className="font-semibold">{bookings.length}</span> booking
                {bookings.length !== 1 ? 's' : ''} found
              </>
            ) : (
              <>
                <span className="font-semibold">{bookings.length}</span> total booking
                {bookings.length !== 1 ? 's' : ''}
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

        {/* Bookings grid/list */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            <BookingSkeleton viewMode={viewMode} count={8} />
          </div>
        ) : !hasResults ? (
          hasFilters ? (
            <BookingEmptyState type="no-results" onClearFilters={handleClearFilters} />
          ) : (
            <BookingEmptyState type="no-bookings" onAddBooking={handleAddBooking} />
          )
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                viewMode={viewMode}
                onView={handleViewBooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <FeatureErrorBoundary featureName="Booking Management">
      <Suspense fallback={
        <div className="min-h-screen bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-neutral-200 rounded w-1/4" />
              <div className="h-12 bg-neutral-200 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <div className="h-64 bg-neutral-200 rounded" />
                <div className="h-64 bg-neutral-200 rounded" />
                <div className="h-64 bg-neutral-200 rounded" />
                <div className="h-64 bg-neutral-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      }>
        <BookingsPageContent />
      </Suspense>
    </FeatureErrorBoundary>
  );
}
