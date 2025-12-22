import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Vehicle {
  id: string;
  locationId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  bodyType: string | null;
  exteriorColor: string | null;
  interiorColor: string | null;
  transmission: string | null;
  fuelType: string | null;
  mileage: number | null;
  dailyRateCents: number;
  weeklyRateCents: number | null;
  monthlyRateCents: number | null;
  features: Record<string, any> | null;
  imageUrls: string[];
  isAvailableForRent: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VehicleFilters {
  search?: string;
  locationId?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  isAvailableForRent?: boolean;
  minDailyRate?: number;
  maxDailyRate?: number;
  minYear?: number;
  maxYear?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'year' | 'dailyRateCents' | 'mileage' | 'make';
  sortOrder?: 'asc' | 'desc';
}

interface CreateVehicleData {
  locationId: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  fuelType?: string;
  mileage?: number;
  dailyRateCents: number;
  weeklyRateCents?: number;
  monthlyRateCents?: number;
  features?: Record<string, boolean>;
  imageUrls?: string[];
  isAvailableForRent?: boolean;
  notes?: string;
}

interface UpdateVehicleData extends Partial<CreateVehicleData> {
  id: string;
}

// Query: Get All Vehicles (with filters)
export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/vehicles', { params: filters });
      return response.data.data as Vehicle[];
    },
  });
}

// Query: Get Single Vehicle
export function useVehicle(id: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/vehicles/${id}`);
      return response.data.data as Vehicle;
    },
    enabled: !!id,
  });
}

// Query: Check Vehicle Availability
export function useVehicleAvailability(vehicleId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: queryKeys.vehicles.availability(vehicleId, { startDate, endDate }),
    queryFn: async () => {
      const response = await apiClient.post('/vehicles/check-availability', {
        vehicleId,
        startDate,
        endDate,
      });
      return response.data.data as {
        vehicleId: string;
        startDate: string;
        endDate: string;
        isAvailable: boolean;
        conflictingBookings?: any[];
      };
    },
    enabled: !!vehicleId && !!startDate && !!endDate,
  });
}

// Mutation: Create Vehicle
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateVehicleData) => {
      const response = await apiClient.post('/vehicles', data);
      return response.data.data as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}

// Mutation: Update Vehicle (with optimistic updates)
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateVehicleData) => {
      const response = await apiClient.patch(`/vehicles/${id}`, data);
      return response.data.data as Vehicle;
    },

    // Optimistic update for better UX
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.detail(variables.id) });

      // Snapshot previous value
      const previousVehicle = queryClient.getQueryData(queryKeys.vehicles.detail(variables.id));

      // Optimistically update
      queryClient.setQueryData(queryKeys.vehicles.detail(variables.id), (old: any) => ({
        ...old,
        ...variables,
      }));

      return { previousVehicle };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousVehicle) {
        queryClient.setQueryData(
          queryKeys.vehicles.detail(variables.id),
          context.previousVehicle,
        );
      }
    },

    // Always refetch after error or success
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}

// Mutation: Delete Vehicle
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/vehicles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}
