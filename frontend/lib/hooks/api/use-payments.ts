import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { queryKeys } from './query-keys';

// Types
interface PaymentIntent {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
  paymentMethod: string;
  transactionId?: string;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  paidAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Query: Get Payment Intent for Booking
export function usePaymentIntent(bookingId: string) {
  return useQuery({
    queryKey: queryKeys.payments.intent(bookingId),
    queryFn: async () => {
      const response = await apiClient.get(`/payments/intent/${bookingId}`);
      return response.data.data as PaymentIntent;
    },
    enabled: !!bookingId,
  });
}

// Mutation: Create Payment Intent
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post('/payments/intent', { bookingId });
      return response.data.data as PaymentIntent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.intent(data.bookingId) });
    },
  });
}

// Mutation: Confirm Payment
export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentIntentId,
      paymentMethodId,
    }: {
      paymentIntentId: string;
      paymentMethodId: string;
    }) => {
      const response = await apiClient.post(`/payments/${paymentIntentId}/confirm`, {
        paymentMethodId,
      });
      return response.data.data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.intent(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}

// Mutation: Refund Payment
export function useRefundPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason?: string }) => {
      const response = await apiClient.post(`/payments/${paymentId}/refund`, { reason });
      return response.data.data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.intent(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(data.bookingId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.lists() });
    },
  });
}
