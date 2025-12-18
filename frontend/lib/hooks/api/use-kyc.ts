import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface Inquiry {
  id: string;
  customerId: string;
  personaInquiryId: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'NEEDS_REVIEW';
  verificationUrl?: string;
  governmentIdVerified: boolean;
  selfieVerified: boolean;
  addressVerified: boolean;
  declineReasons?: string[];
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Query: Get Inquiry by ID
export function useInquiry(inquiryId: string) {
  return useQuery({
    queryKey: queryKeys.kyc.inquiry(inquiryId),
    queryFn: async () => {
      const response = await apiClient.get(`/kyc/inquiries/${inquiryId}`);
      return response.data.data as Inquiry;
    },
    enabled: !!inquiryId,
  });
}

// Mutation: Create Inquiry for Customer
export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiClient.post('/kyc/inquiries', { customerId });
      return response.data.data as Inquiry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

// Mutation: Submit Government ID
export function useSubmitGovernmentId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, file }: { inquiryId: string; file: File }) => {
      const formData = new FormData();
      formData.append('governmentId', file);
      const response = await apiClient.post(`/kyc/inquiries/${inquiryId}/government-id`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data as Inquiry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.inquiry(data.id) });
    },
  });
}

// Mutation: Submit Selfie
export function useSubmitSelfie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, file }: { inquiryId: string; file: File }) => {
      const formData = new FormData();
      formData.append('selfie', file);
      const response = await apiClient.post(`/kyc/inquiries/${inquiryId}/selfie`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data as Inquiry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.inquiry(data.id) });
    },
  });
}

// Mutation: Approve Inquiry (Test Helper)
export function useApproveInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiryId: string) => {
      const response = await apiClient.post(`/kyc/inquiries/${inquiryId}/approve`);
      return response.data.data as Inquiry;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.inquiry(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}
