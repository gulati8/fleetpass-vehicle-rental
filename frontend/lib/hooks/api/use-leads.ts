import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Lead {
  id: string;
  dealerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
  source: string;
  notes?: string;
  estimatedValue?: number;
  assignedToUserId?: string;
  convertedToDealId?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: any;
  deal?: any;
}

interface LeadFilters {
  dealerId?: string;
  status?: string;
  source?: string;
  assignedToUserId?: string;
  search?: string;
}

interface CreateLeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  notes?: string;
  estimatedValue?: number;
}

interface UpdateLeadData extends Partial<CreateLeadData> {
  id: string;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
}

interface ConvertLeadData {
  customerId: string;
  vehicleId: string;
  locationId: string;
  startDate: string;
  endDate: string;
}

// Query: Get All Leads (with filters)
export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: async () => {
      const response = await apiClient.get('/leads', { params: filters });
      return response.data.data as Lead[];
    },
  });
}

// Query: Get Single Lead
export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.leads.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/leads/${id}`);
      return response.data.data as Lead;
    },
    enabled: !!id,
  });
}

// Mutation: Create Lead
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      const response = await apiClient.post('/leads', data);
      return response.data.data as Lead;
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
    mutationFn: async ({ id, ...data }: UpdateLeadData) => {
      const response = await apiClient.patch(`/leads/${id}`, data);
      return response.data.data as Lead;
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
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const response = await apiClient.post(`/leads/${id}/assign`, { userId });
      return response.data.data as Lead;
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
    mutationFn: async ({ id, dealData }: { id: string; dealData: ConvertLeadData }) => {
      const response = await apiClient.post(`/leads/${id}/convert`, dealData);
      return response.data.data as { lead: Lead; deal: any };
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
