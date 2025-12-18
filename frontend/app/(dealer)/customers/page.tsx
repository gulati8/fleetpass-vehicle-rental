'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCustomers } from '@/lib/hooks/api/use-customers';
import { CustomerCard, CustomerSkeleton } from '@/components/features/customers/CustomerCard';
import { CustomerFilters, CustomerEmptyState } from '@/components/features/customers/CustomerFilters';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';

function CustomersPageContent() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    kycStatus: '',
    hasBookings: '',
    sortBy: 'newest',
  });

  // Fetch data
  const { data: customers = [], isLoading } = useCustomers();

  // Client-side filtering and sorting
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter((customer) => {
        const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        const email = customer.email.toLowerCase();
        const phone = customer.phone?.toLowerCase() || '';

        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower)
        );
      });
    }

    // KYC status filter
    if (filters.kycStatus) {
      result = result.filter(
        (customer) => customer.kycStatus === filters.kycStatus
      );
    }

    // Has bookings filter
    if (filters.hasBookings) {
      const hasBookings = filters.hasBookings === 'true';
      result = result.filter((customer) => {
        const bookingCount = (customer as any).bookingCount ?? 0;
        return hasBookings ? bookingCount > 0 : bookingCount === 0;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
        case 'name_desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(
            `${a.firstName} ${a.lastName}`
          );
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [customers, filters]);

  // Handlers
  const handleAddCustomer = () => {
    router.push('/customers/new');
  };

  const handleViewCustomer = (id: string) => {
    router.push(`/customers/${id}`);
  };

  const handleEditCustomer = (id: string) => {
    router.push(`/customers/${id}/edit`);
  };

  const handleStartKYC = (id: string) => {
    router.push(`/customers/${id}/kyc`);
  };

  const handleCreateBooking = (id: string) => {
    router.push(`/bookings/new?customerId=${id}`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      kycStatus: '',
      hasBookings: '',
      sortBy: 'newest',
    });
  };

  const hasFilters = Object.values(filters).some(
    (value) => value !== '' && value !== 'newest'
  );
  const hasResults = filteredCustomers.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-neutral-900">Customers</h1>
            <Button
              onClick={handleAddCustomer}
              leftIcon={<Plus className="w-5 h-5" />}
              disabled={isLoading}
            >
              Add Customer
            </Button>
          </div>
          <p className="text-neutral-600">
            Manage customer information, verify identities, and track bookings
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <CustomerFilters
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
              'Loading customers...'
            ) : hasFilters ? (
              <>
                <span className="font-semibold">{filteredCustomers.length}</span> customer
                {filteredCustomers.length !== 1 ? 's' : ''} found
              </>
            ) : (
              <>
                <span className="font-semibold">{customers.length}</span> total customer
                {customers.length !== 1 ? 's' : ''}
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

        {/* Customers grid/list */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            <CustomerSkeleton viewMode={viewMode} count={8} />
          </div>
        ) : !hasResults ? (
          hasFilters ? (
            <CustomerEmptyState type="no-results" onClearFilters={handleClearFilters} />
          ) : (
            <CustomerEmptyState type="no-customers" onAddCustomer={handleAddCustomer} />
          )
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                viewMode={viewMode}
                onView={handleViewCustomer}
                onEdit={handleEditCustomer}
                onStartKYC={handleStartKYC}
                onCreateBooking={handleCreateBooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <FeatureErrorBoundary featureName="Customer Management">
      <CustomersPageContent />
    </FeatureErrorBoundary>
  );
}
