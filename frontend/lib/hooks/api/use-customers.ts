import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Customer {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  driverLicenseNumber: string | null;
  driverLicenseState: string | null;
  driverLicenseExpiry: string | null;
  kycStatus: string;
  kycInquiryId: string | null;
  kycVerifiedAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFilters {
  search?: string;
  kycStatus?: 'pending' | 'in_progress' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  driverLicenseNumber?: string;
  driverLicenseState?: string;
  driverLicenseExpiry?: string;
}

interface UpdateCustomerData extends Partial<CreateCustomerData> {
  id: string;
  kycStatus?: 'pending' | 'in_progress' | 'approved' | 'rejected';
  kycVerifiedAt?: string;
  kycInquiryId?: string;
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
