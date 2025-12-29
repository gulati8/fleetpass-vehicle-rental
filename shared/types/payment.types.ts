/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * Payment model (matches Prisma schema)
 */
export interface Payment {
  id: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  stripePaymentId: string | null;
  stripeCustomerId: string | null;
  paymentMethod: string | null;
  failureReason: string | null;
  refundedAmountCents: number | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    totalCents: number;
  };
}

/**
 * Create payment intent request
 */
export interface CreatePaymentIntentInput {
  bookingId: string;
  amountCents?: number;
  currency?: string;
  customerId?: string;
}

/**
 * Create payment intent response
 */
export interface CreatePaymentIntentResponse {
  payment: Payment;
  clientSecret: string;
}

/**
 * Confirm payment request
 */
export interface ConfirmPaymentInput {
  paymentId: string;
  paymentMethodId: string;
}

/**
 * Refund payment request
 */
export interface RefundPaymentInput {
  paymentId: string;
  amountCents?: number;
  reason?: string;
}

/**
 * Refund payment response
 */
export interface RefundPaymentResponse {
  payment: Payment;
  refund: any; // Stripe refund object
}
