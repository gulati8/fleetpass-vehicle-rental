import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';
import type {
  Payment,
  CreatePaymentIntentInput,
  CreatePaymentIntentResponse,
  RefundPaymentResponse,
} from '@shared/types';

// Query: Get Payment by Payment ID
export function usePayment(paymentId: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(paymentId || ''),
    queryFn: async () => {
      const response = await apiClient.get(`/payments/intents/${paymentId}`);
      return response.data.data as Payment;
    },
    enabled: !!paymentId,
  });
}

// Mutation: Create Payment Intent
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePaymentIntentInput) => {
      const response = await apiClient.post('/payments/intents', input);
      return response.data.data as CreatePaymentIntentResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.payment.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.payment.bookingId) });
    },
  });
}

// Mutation: Confirm Payment
export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      paymentMethodId,
    }: {
      paymentId: string;
      paymentMethodId: string;
    }) => {
      const response = await apiClient.post(`/payments/intents/${paymentId}/confirm`, {
        paymentMethodId,
      });
      return response.data.data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}

// Mutation: Cancel Payment
export function useCancelPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const response = await apiClient.post(`/payments/intents/${paymentId}/cancel`);
      return response.data.data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}

// Mutation: Refund Payment
export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      amountCents,
      reason
    }: {
      paymentId: string;
      amountCents?: number;
      reason?: string;
    }) => {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, {
        amountCents,
        reason
      });
      return response.data.data as RefundPaymentResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.payment.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.payment.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}
