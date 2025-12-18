/**
 * Mock Stripe API Types
 * These mirror the real Stripe API structure for development/testing
 */

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled';

export type RefundStatus = 'pending' | 'succeeded' | 'failed';

export type RefundReason =
  | 'duplicate'
  | 'fraudulent'
  | 'requested_by_customer'
  | null;

export interface MockPaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  client_secret: string;
  customer: string | null;
  payment_method: string | null;
  created: number;
  metadata: Record<string, string>;
  last_payment_error?: {
    code: string;
    message: string;
  };
}

export interface MockCustomer {
  id: string;
  object: 'customer';
  email: string | null;
  name: string | null;
  phone: string | null;
  created: number;
  metadata: Record<string, string>;
}

export interface MockPaymentMethod {
  id: string;
  object: 'payment_method';
  type: 'card' | 'bank_account';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  customer: string | null;
  created: number;
}

export interface MockRefund {
  id: string;
  object: 'refund';
  amount: number;
  currency: string;
  payment_intent: string;
  status: RefundStatus;
  created: number;
  reason: RefundReason;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  customer?: string;
  payment_method?: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerParams {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CreateRefundParams {
  payment_intent: string;
  amount?: number; // If omitted, full refund
  reason?: RefundReason;
}

/**
 * Test card numbers that simulate different scenarios
 */
export const TEST_CARDS = {
  SUCCESS: '4242424242424242',
  DECLINE: '4000000000000002',
  INSUFFICIENT_FUNDS: '4000000000009995',
  PROCESSING: '4000000000000127',
} as const;

/**
 * Stripe error codes
 */
export const STRIPE_ERROR_CODES = {
  CARD_DECLINED: 'card_declined',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  PAYMENT_INTENT_NOT_FOUND: 'resource_missing',
  INVALID_AMOUNT: 'invalid_request_error',
} as const;
