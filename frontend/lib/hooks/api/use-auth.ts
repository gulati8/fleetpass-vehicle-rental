import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface MeResponse {
  user: User;
  organization: Organization;
}

// Query: Get Current User
export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data.data as MeResponse;
    },
    retry: false, // Don't retry if not authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation: Login
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data.data as MeResponse;
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

// Mutation: Signup
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await apiClient.post('/auth/signup', data);
      return response.data.data as MeResponse;
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

// Mutation: Logout
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
}
