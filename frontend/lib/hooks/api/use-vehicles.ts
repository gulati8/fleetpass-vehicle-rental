import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  licensePlate: string;
  locationId: string;
  dailyRate: number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED';
  fuelType: string;
  transmission: string;
  seats: number;
  features: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface VehicleFilters {
  locationId?: string;
  status?: string;
  make?: string;
  model?: string;
  minRate?: number;
  maxRate?: number;
  fuelType?: string;
  transmission?: string;
  minSeats?: number;
}

interface AvailabilityQuery {
  startDate: string;
  endDate: string;
  locationId?: string;
}

interface CreateVehicleData {
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  licensePlate: string;
  locationId: string;
  dailyRate: number;
  fuelType: string;
  transmission: string;
  seats: number;
  features?: string[];
  images?: string[];
}

interface UpdateVehicleData extends Partial<CreateVehicleData> {
  id: string;
  status?: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED';
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
export function useVehicleAvailability(vehicleId: string, dates?: AvailabilityQuery) {
  return useQuery({
    queryKey: queryKeys.vehicles.availability(vehicleId, dates),
    queryFn: async () => {
      const response = await apiClient.get(`/vehicles/${vehicleId}/availability`, {
        params: dates,
      });
      return response.data.data as { available: boolean; conflictingBookings?: any[] };
    },
    enabled: !!vehicleId && !!dates,
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
