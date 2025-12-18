/**
 * Centralized Query Keys for React Query Cache Management
 *
 * Following React Query best practices with hierarchical key structure:
 * - ['entity'] - All queries for that entity
 * - ['entity', 'list'] - All list queries
 * - ['entity', 'list', filters] - Specific list query with filters
 * - ['entity', 'detail'] - All detail queries
 * - ['entity', 'detail', id] - Specific detail query
 */

export const queryKeys = {
  // Authentication
  auth: {
    me: ['auth', 'me'] as const,
  },

  // Locations
  locations: {
    all: ['locations'] as const,
    lists: () => [...queryKeys.locations.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.locations.lists(), filters] as const,
    details: () => [...queryKeys.locations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.locations.details(), id] as const,
  },

  // Vehicles
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.vehicles.lists(), filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
    availability: (id: string, dates?: any) =>
      [...queryKeys.vehicles.all, 'availability', id, dates] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.bookings.lists(), filters] as const,
    details: () => [...queryKeys.bookings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.bookings.details(), id] as const,
  },

  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
  },

  // Deals
  deals: {
    all: ['deals'] as const,
    lists: () => [...queryKeys.deals.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.deals.lists(), filters] as const,
    details: () => [...queryKeys.deals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deals.details(), id] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    intent: (bookingId: string) => [...queryKeys.payments.all, 'intent', bookingId] as const,
  },

  // KYC
  kyc: {
    all: ['kyc'] as const,
    inquiry: (inquiryId: string) => [...queryKeys.kyc.all, 'inquiry', inquiryId] as const,
  },
};
