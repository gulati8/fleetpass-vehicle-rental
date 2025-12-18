import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Booking {
  id: string;
  customerId: string;
  vehicleId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  pickupTime?: string;
  returnTime?: string;
  mileageStart?: number;
  mileageEnd?: number;
  additionalDrivers?: string[];
  specialRequests?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  customer?: any;
  vehicle?: any;
  location?: any;
}

interface BookingFilters {
  customerId?: string;
  vehicleId?: string;
  locationId?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

interface CreateBookingData {
  customerId: string;
  vehicleId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  additionalDrivers?: string[];
  specialRequests?: string;
}

interface UpdateBookingData extends Partial<CreateBookingData> {
  id: string;
}

// Query: Get All Bookings (with filters)
export function useBookings(filters?: BookingFilters) {
  return useQuery({
    queryKey: queryKeys.bookings.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/bookings', { params: filters });
      return response.data.data as Booking[];
    },
  });
}

// Query: Get Single Booking
export function useBooking(id: string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/bookings/${id}`);
      return response.data.data as Booking;
    },
    enabled: !!id,
  });
}

// Mutation: Create Booking
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBookingData) => {
      const response = await apiClient.post('/bookings', data);
      return response.data.data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
      // Also invalidate vehicle availability
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}

// Mutation: Update Booking
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBookingData) => {
      const response = await apiClient.patch(`/bookings/${id}`, data);
      return response.data.data as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}

// Mutation: Confirm Booking
export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/bookings/${id}/confirm`);
      return response.data.data as Booking;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}

// Mutation: Activate Booking (Start Rental)
export function useActivateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mileageStart }: { id: string; mileageStart: number }) => {
      const response = await apiClient.post(`/bookings/${id}/activate`, { mileageStart });
      return response.data.data as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}

// Mutation: Complete Booking (End Rental)
export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mileageEnd }: { id: string; mileageEnd: number }) => {
      const response = await apiClient.post(`/bookings/${id}/complete`, { mileageEnd });
      return response.data.data as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}

// Mutation: Cancel Booking
export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.post(`/bookings/${id}/cancel`, { reason });
      return response.data.data as Booking;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
    },
  });
}
