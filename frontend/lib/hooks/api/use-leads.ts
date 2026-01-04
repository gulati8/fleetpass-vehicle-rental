import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';
import type {
  Lead,
  LeadWithRelations,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadFilters,
  Deal,
} from '@shared/types';

// Additional types for mutations
interface AssignLeadRequest {
  assignedToId: string;
}

interface ConvertLeadRequest {
  dealValueCents: number;
  vehicleId: string;
  notes?: string;
}

// Query: Get All Leads (with filters)
export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/leads', { params: filters });
      return response.data.data as LeadWithRelations[];
    },
  });
}

// Query: Get Single Lead
export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/leads/${id}`);
      return response.data.data as LeadWithRelations;
    },
    enabled: !!id,
  });
}

// Mutation: Create Lead
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadRequest) => {
      const response = await apiClient.post('/leads', data);
      return response.data.data as LeadWithRelations;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
    },
  });
}

// Mutation: Update Lead
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateLeadRequest & { id: string }) => {
      const response = await apiClient.patch(`/leads/${id}`, data);
      return response.data.data as LeadWithRelations;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
    },
  });
}

// Mutation: Assign Lead to User
export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assignedToId }: { id: string; assignedToId: string }) => {
      const response = await apiClient.post(`/leads/${id}/assign`, { assignedToId });
      return response.data.data as LeadWithRelations;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
    },
  });
}

// Mutation: Convert Lead to Deal
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dealData }: { id: string } & ConvertLeadRequest) => {
      const response = await apiClient.post(`/leads/${id}/convert`, dealData);
      return response.data.data as { lead: LeadWithRelations; deal: Deal };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.lists() });
    },
  });
}

// Mutation: Delete Lead
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/leads/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.lists() });
    },
  });
}
