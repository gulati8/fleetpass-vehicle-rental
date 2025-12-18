import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Deal {
  id: string;
  dealerId: string;
  leadId?: string;
  bookingId: string;
  stage: 'NEGOTIATION' | 'PROPOSAL' | 'CONTRACT' | 'WON' | 'LOST';
  value: number;
  probability: number;
  expectedCloseDate: string;
  actualCloseDate?: string;
  lostReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lead?: any;
  booking?: any;
}

interface DealFilters {
  dealerId?: string;
  stage?: string;
  minValue?: number;
  maxValue?: number;
  expectedCloseDateFrom?: string;
  expectedCloseDateTo?: string;
}

interface CreateDealData {
  leadId?: string;
  bookingId: string;
  stage?: 'NEGOTIATION' | 'PROPOSAL' | 'CONTRACT';
  value: number;
  probability?: number;
  expectedCloseDate: string;
  notes?: string;
}

interface UpdateDealData extends Partial<CreateDealData> {
  id: string;
}

// Query: Get All Deals (with filters)
export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: queryKeys.deals.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/deals', { params: filters });
      return response.data.data as Deal[];
    },
  });
}

// Query: Get Single Deal
export function useDeal(id: string) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/deals/${id}`);
      return response.data.data as Deal;
    },
    enabled: !!id,
  });
}

// Mutation: Create Deal
export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDealData) => {
      const response = await apiClient.post('/deals', data);
      return response.data.data as Deal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}

// Mutation: Update Deal
export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDealData) => {
      const response = await apiClient.patch(`/deals/${id}`, data);
      return response.data.data as Deal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}

// Mutation: Mark Deal as Won
export function useWinDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/deals/${id}/win`);
      return response.data.data as Deal;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}

// Mutation: Mark Deal as Lost
export function useLoseDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await apiClient.post(`/deals/${id}/lose`, { reason });
      return response.data.data as Deal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}

// Mutation: Delete Deal
export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/deals/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}
