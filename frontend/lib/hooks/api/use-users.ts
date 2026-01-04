import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// User interface (simplified for assignment/filter purposes)
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Query: Get All Users in Organization
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      // TODO: Backend endpoint /api/v1/users needs to be implemented
      // For now, this will return an empty array
      try {
        const response = await apiClient.get('/users');
        return response.data.data as User[];
      } catch (error) {
        // If endpoint doesn't exist yet, return empty array
        console.warn('Users endpoint not implemented yet. Returning empty array.');
        return [] as User[];
      }
    },
  });
}

// Query: Get Single User
export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data as User;
    },
    enabled: !!id,
  });
}
