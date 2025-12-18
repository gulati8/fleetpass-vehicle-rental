import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  timezone: string;
  dealerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocationFilters {
  dealerId?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
}

interface CreateLocationData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  timezone: string;
}

interface UpdateLocationData extends Partial<CreateLocationData> {
  id: string;
  isActive?: boolean;
}

// Query: Get All Locations (with filters)
export function useLocations(filters?: LocationFilters) {
  return useQuery({
    queryKey: queryKeys.locations.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/locations', { params: filters });
      return response.data.data as Location[];
    },
  });
}

// Query: Get Single Location
export function useLocation(id: string) {
  return useQuery({
    queryKey: queryKeys.locations.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/locations/${id}`);
      return response.data.data as Location;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

// Mutation: Create Location
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLocationData) => {
      const response = await apiClient.post('/locations', data);
      return response.data.data as Location;
    },
    onSuccess: () => {
      // Invalidate all location lists
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.lists() });
    },
  });
}

// Mutation: Update Location
export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateLocationData) => {
      const response = await apiClient.patch(`/locations/${id}`, data);
      return response.data.data as Location;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific location and all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.lists() });
    },
  });
}

// Mutation: Delete Location
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/locations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all location lists
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.lists() });
    },
  });
}
