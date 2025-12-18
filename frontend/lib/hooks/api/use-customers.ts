import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Customer {
  id: string;
  userId: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  kycStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  kycDetails?: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    email: string;
    fullName: string;
  };
}

interface CustomerFilters {
  kycStatus?: string;
  city?: string;
  state?: string;
  search?: string;
}

interface CreateCustomerData {
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
}

interface UpdateCustomerData extends Partial<CreateCustomerData> {
  id: string;
  kycStatus?: 'PENDING' | 'VERIFIED' | 'FAILED';
}

// Query: Get All Customers (with filters)
export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/customers', { params: filters });
      return response.data.data as Customer[];
    },
  });
}

// Query: Get Single Customer
export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${id}`);
      return response.data.data as Customer;
    },
    enabled: !!id,
  });
}

// Mutation: Create Customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomerData) => {
      const response = await apiClient.post('/customers', data);
      return response.data.data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}

// Mutation: Update Customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCustomerData) => {
      const response = await apiClient.patch(`/customers/${id}`, data);
      return response.data.data as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}

// Mutation: Delete Customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/customers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}
