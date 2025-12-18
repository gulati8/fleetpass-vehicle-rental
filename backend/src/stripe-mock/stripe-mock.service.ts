import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';
import {
  MockPaymentIntent,
  MockCustomer,
  MockPaymentMethod,
  MockRefund,
  CreatePaymentIntentParams,
  CreateCustomerParams,
  UpdateCustomerParams,
  CreateRefundParams,
  TEST_CARDS,
  STRIPE_ERROR_CODES,
} from './types/stripe-mock.types';
import { randomUUID } from 'crypto';

/**
 * Mock Stripe Service
 * Simulates Stripe API behavior for development and testing
 * No actual network calls - all operations are in-memory
 */
@Injectable()
export class StripeMockService {
  private readonly logger = new LoggerService('StripeMockService');

  // In-memory stores
  private paymentIntents = new Map<string, MockPaymentIntent>();
  private customers = new Map<string, MockCustomer>();
  private paymentMethods = new Map<string, MockPaymentMethod>();
  private refunds = new Map<string, MockRefund>();

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<MockPaymentIntent> {
    this.logger.logWithFields('info', 'Creating mock payment intent', {
      amount: params.amount,
      currency: params.currency || 'usd',
    });

    if (params.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const id = `pi_mock_${randomUUID()}`;
    const clientSecret = `${id}_secret_${randomUUID()}`;

    const paymentIntent: MockPaymentIntent = {
      id,
      object: 'payment_intent',
      amount: params.amount,
      currency: params.currency || 'usd',
      status: 'requires_payment_method',
      client_secret: clientSecret,
      customer: params.customer || null,
      payment_method: params.payment_method || null,
      created: Math.floor(Date.now() / 1000),
      metadata: params.metadata || {},
    };

    this.paymentIntents.set(id, paymentIntent);

    this.logger.logWithFields('info', 'Mock payment intent created', {
      paymentIntentId: id,
      status: paymentIntent.status,
    });

    return paymentIntent;
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(id: string): Promise<MockPaymentIntent> {
    const paymentIntent = this.paymentIntents.get(id);

    if (!paymentIntent) {
      throw new NotFoundException(
        `Payment intent ${id} not found`,
      );
    }

    return paymentIntent;
  }

  /**
   * Confirm a payment intent
   * Simulates card processing with test card numbers
   */
  async confirmPaymentIntent(
    id: string,
    paymentMethodId?: string,
  ): Promise<MockPaymentIntent> {
    const paymentIntent = await this.retrievePaymentIntent(id);

    this.logger.logWithFields('info', 'Confirming mock payment intent', {
      paymentIntentId: id,
      currentStatus: paymentIntent.status,
    });

    if (paymentIntent.status !== 'requires_payment_method' && paymentIntent.status !== 'requires_confirmation') {
      throw new BadRequestException(
        `Cannot confirm payment intent with status ${paymentIntent.status}`,
      );
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      paymentIntent.payment_method = paymentMethodId;
    }

    // Simulate card processing behavior based on test card numbers
    const cardNumber = this.getCardNumberFromPaymentMethod(paymentMethodId);

    if (cardNumber === TEST_CARDS.DECLINE) {
      // Card declined
      paymentIntent.status = 'requires_payment_method';
      paymentIntent.last_payment_error = {
        code: STRIPE_ERROR_CODES.CARD_DECLINED,
        message: 'Your card was declined',
      };
      this.logger.warn('Mock payment declined', { paymentIntentId: id });
    } else if (cardNumber === TEST_CARDS.INSUFFICIENT_FUNDS) {
      // Insufficient funds
      paymentIntent.status = 'requires_payment_method';
      paymentIntent.last_payment_error = {
        code: STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS,
        message: 'Your card has insufficient funds',
      };
      this.logger.warn('Mock payment insufficient funds', { paymentIntentId: id });
    } else {
      // Success path - transition through processing to succeeded
      paymentIntent.status = 'processing';

      // Simulate async processing (1 second delay in real scenario)
      // For testing, we'll mark it as succeeded immediately
      setTimeout(() => {
        const pi = this.paymentIntents.get(id);
        if (pi && pi.status === 'processing') {
          pi.status = 'succeeded';
          this.logger.logWithFields('info', 'Mock payment succeeded', {
            paymentIntentId: id,
          });
        }
      }, 100); // Short delay to simulate async

      // For immediate response, mark as succeeded
      paymentIntent.status = 'succeeded';
      delete paymentIntent.last_payment_error;
    }

    this.paymentIntents.set(id, paymentIntent);
    return paymentIntent;
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(id: string): Promise<MockPaymentIntent> {
    const paymentIntent = await this.retrievePaymentIntent(id);

    this.logger.logWithFields('info', 'Canceling mock payment intent', {
      paymentIntentId: id,
    });

    if (paymentIntent.status === 'succeeded') {
      throw new BadRequestException(
        'Cannot cancel a succeeded payment intent',
      );
    }

    paymentIntent.status = 'canceled';
    this.paymentIntents.set(id, paymentIntent);

    return paymentIntent;
  }

  /**
   * Create a customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<MockCustomer> {
    this.logger.logWithFields('info', 'Creating mock customer', {
      email: params.email,
    });

    const id = `cus_mock_${randomUUID()}`;

    const customer: MockCustomer = {
      id,
      object: 'customer',
      email: params.email || null,
      name: params.name || null,
      phone: params.phone || null,
      created: Math.floor(Date.now() / 1000),
      metadata: params.metadata || {},
    };

    this.customers.set(id, customer);

    this.logger.logWithFields('info', 'Mock customer created', {
      customerId: id,
    });

    return customer;
  }

  /**
   * Retrieve a customer
   */
  async retrieveCustomer(id: string): Promise<MockCustomer> {
    const customer = this.customers.get(id);

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    id: string,
    params: UpdateCustomerParams,
  ): Promise<MockCustomer> {
    const customer = await this.retrieveCustomer(id);

    this.logger.logWithFields('info', 'Updating mock customer', {
      customerId: id,
    });

    if (params.email !== undefined) customer.email = params.email;
    if (params.name !== undefined) customer.name = params.name;
    if (params.phone !== undefined) customer.phone = params.phone;
    if (params.metadata !== undefined) {
      customer.metadata = { ...customer.metadata, ...params.metadata };
    }

    this.customers.set(id, customer);

    return customer;
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<MockPaymentMethod> {
    this.logger.logWithFields('info', 'Attaching mock payment method', {
      paymentMethodId,
      customerId,
    });

    // Verify customer exists
    await this.retrieveCustomer(customerId);

    let paymentMethod = this.paymentMethods.get(paymentMethodId);

    if (!paymentMethod) {
      // Create new payment method
      paymentMethod = {
        id: paymentMethodId,
        object: 'payment_method',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: new Date().getFullYear() + 2,
        },
        customer: customerId,
        created: Math.floor(Date.now() / 1000),
      };
    } else {
      paymentMethod.customer = customerId;
    }

    this.paymentMethods.set(paymentMethodId, paymentMethod);

    return paymentMethod;
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<MockPaymentMethod> {
    const paymentMethod = this.paymentMethods.get(paymentMethodId);

    if (!paymentMethod) {
      throw new NotFoundException(`Payment method ${paymentMethodId} not found`);
    }

    this.logger.logWithFields('info', 'Detaching mock payment method', {
      paymentMethodId,
    });

    paymentMethod.customer = null;
    this.paymentMethods.set(paymentMethodId, paymentMethod);

    return paymentMethod;
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string): Promise<{ data: MockPaymentMethod[] }> {
    // Verify customer exists
    await this.retrieveCustomer(customerId);

    const methods = Array.from(this.paymentMethods.values()).filter(
      (pm) => pm.customer === customerId,
    );

    return { data: methods };
  }

  /**
   * Create a refund
   */
  async createRefund(params: CreateRefundParams): Promise<MockRefund> {
    const paymentIntent = await this.retrievePaymentIntent(params.payment_intent);

    this.logger.logWithFields('info', 'Creating mock refund', {
      paymentIntentId: params.payment_intent,
      amount: params.amount,
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException(
        'Can only refund succeeded payment intents',
      );
    }

    const refundAmount = params.amount || paymentIntent.amount;

    if (refundAmount > paymentIntent.amount) {
      throw new BadRequestException(
        'Refund amount cannot exceed payment amount',
      );
    }

    const id = `re_mock_${randomUUID()}`;

    const refund: MockRefund = {
      id,
      object: 'refund',
      amount: refundAmount,
      currency: paymentIntent.currency,
      payment_intent: params.payment_intent,
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      reason: params.reason || null,
    };

    this.refunds.set(id, refund);

    this.logger.logWithFields('info', 'Mock refund created', {
      refundId: id,
      amount: refundAmount,
    });

    return refund;
  }

  /**
   * Retrieve a refund
   */
  async retrieveRefund(id: string): Promise<MockRefund> {
    const refund = this.refunds.get(id);

    if (!refund) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    return refund;
  }

  /**
   * Simulate a webhook event
   * In production, Stripe would send this to our endpoint
   */
  async simulateWebhook(event: string, data: any): Promise<void> {
    this.logger.logWithFields('info', 'Simulating webhook event', {
      event,
      data,
    });

    // Webhook simulation logic would go here
    // For now, just log it
  }

  /**
   * Extract card number from payment method (for testing)
   */
  private getCardNumberFromPaymentMethod(paymentMethodId?: string): string {
    if (!paymentMethodId) {
      return TEST_CARDS.SUCCESS;
    }

    // For test payment methods, check if they include card number
    if (paymentMethodId.includes('decline')) {
      return TEST_CARDS.DECLINE;
    }
    if (paymentMethodId.includes('insufficient')) {
      return TEST_CARDS.INSUFFICIENT_FUNDS;
    }

    return TEST_CARDS.SUCCESS;
  }

  /**
   * Clear all mock data (useful for testing)
   */
  async clear(): Promise<void> {
    this.paymentIntents.clear();
    this.customers.clear();
    this.paymentMethods.clear();
    this.refunds.clear();
    this.logger.log('Mock Stripe data cleared');
  }
}
