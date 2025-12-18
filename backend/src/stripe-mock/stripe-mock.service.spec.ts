import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StripeMockService } from './stripe-mock.service';
import { TEST_CARDS } from './types/stripe-mock.types';

describe('StripeMockService', () => {
  let service: StripeMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeMockService],
    }).compile();

    service = module.get<StripeMockService>(StripeMockService);
    await service.clear(); // Clear any existing mock data
  });

  afterEach(async () => {
    await service.clear();
  });

  describe('Payment Intents', () => {
    it('should create a payment intent', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
        currency: 'usd',
        metadata: { bookingId: 'test-booking' },
      });

      expect(paymentIntent).toBeDefined();
      expect(paymentIntent.id).toMatch(/^pi_mock_/);
      expect(paymentIntent.object).toBe('payment_intent');
      expect(paymentIntent.amount).toBe(10000);
      expect(paymentIntent.currency).toBe('usd');
      expect(paymentIntent.status).toBe('requires_payment_method');
      expect(paymentIntent.client_secret).toContain('_secret_');
      expect(paymentIntent.metadata.bookingId).toBe('test-booking');
    });

    it('should reject payment intent with invalid amount', async () => {
      await expect(
        service.createPaymentIntent({
          amount: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createPaymentIntent({
          amount: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should retrieve a payment intent', async () => {
      const created = await service.createPaymentIntent({
        amount: 5000,
      });

      const retrieved = await service.retrievePaymentIntent(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for non-existent payment intent', async () => {
      await expect(
        service.retrievePaymentIntent('pi_mock_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should confirm payment intent successfully', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      const confirmed = await service.confirmPaymentIntent(
        created.id,
        'pm_test_success',
      );

      expect(confirmed.status).toBe('succeeded');
      expect(confirmed.payment_method).toBe('pm_test_success');
      expect(confirmed.last_payment_error).toBeUndefined();
    });

    it('should handle declined card', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      const confirmed = await service.confirmPaymentIntent(
        created.id,
        'pm_test_decline',
      );

      expect(confirmed.status).toBe('requires_payment_method');
      expect(confirmed.last_payment_error).toBeDefined();
      expect(confirmed.last_payment_error?.code).toBe('card_declined');
    });

    it('should handle insufficient funds', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      const confirmed = await service.confirmPaymentIntent(
        created.id,
        'pm_test_insufficient',
      );

      expect(confirmed.status).toBe('requires_payment_method');
      expect(confirmed.last_payment_error).toBeDefined();
      expect(confirmed.last_payment_error?.code).toBe('insufficient_funds');
    });

    it('should reject confirming already succeeded payment', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(created.id, 'pm_test_success');

      await expect(
        service.confirmPaymentIntent(created.id, 'pm_test_success'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cancel a payment intent', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      const canceled = await service.cancelPaymentIntent(created.id);

      expect(canceled.status).toBe('canceled');
    });

    it('should reject canceling succeeded payment', async () => {
      const created = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(created.id, 'pm_test_success');

      await expect(service.cancelPaymentIntent(created.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Customers', () => {
    it('should create a customer', async () => {
      const customer = await service.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
        phone: '+1234567890',
        metadata: { userId: 'user-123' },
      });

      expect(customer).toBeDefined();
      expect(customer.id).toMatch(/^cus_mock_/);
      expect(customer.object).toBe('customer');
      expect(customer.email).toBe('test@example.com');
      expect(customer.name).toBe('Test User');
      expect(customer.phone).toBe('+1234567890');
      expect(customer.metadata.userId).toBe('user-123');
    });

    it('should retrieve a customer', async () => {
      const created = await service.createCustomer({
        email: 'test@example.com',
      });

      const retrieved = await service.retrieveCustomer(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(
        service.retrieveCustomer('cus_mock_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update a customer', async () => {
      const created = await service.createCustomer({
        email: 'old@example.com',
        name: 'Old Name',
      });

      const updated = await service.updateCustomer(created.id, {
        email: 'new@example.com',
        name: 'New Name',
        metadata: { updated: 'true' },
      });

      expect(updated.email).toBe('new@example.com');
      expect(updated.name).toBe('New Name');
      expect(updated.metadata.updated).toBe('true');
    });
  });

  describe('Payment Methods', () => {
    it('should attach payment method to customer', async () => {
      const customer = await service.createCustomer({
        email: 'test@example.com',
      });

      const paymentMethod = await service.attachPaymentMethod(
        'pm_test_123',
        customer.id,
      );

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.id).toBe('pm_test_123');
      expect(paymentMethod.customer).toBe(customer.id);
      expect(paymentMethod.type).toBe('card');
      expect(paymentMethod.card).toBeDefined();
    });

    it('should throw NotFoundException for non-existent customer', async () => {
      await expect(
        service.attachPaymentMethod('pm_test_123', 'cus_mock_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should detach payment method', async () => {
      const customer = await service.createCustomer({
        email: 'test@example.com',
      });

      await service.attachPaymentMethod('pm_test_123', customer.id);

      const detached = await service.detachPaymentMethod('pm_test_123');

      expect(detached.customer).toBeNull();
    });

    it('should list payment methods for customer', async () => {
      const customer = await service.createCustomer({
        email: 'test@example.com',
      });

      await service.attachPaymentMethod('pm_test_1', customer.id);
      await service.attachPaymentMethod('pm_test_2', customer.id);

      const result = await service.listPaymentMethods(customer.id);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].customer).toBe(customer.id);
      expect(result.data[1].customer).toBe(customer.id);
    });
  });

  describe('Refunds', () => {
    it('should create a full refund', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(paymentIntent.id, 'pm_test_success');

      const refund = await service.createRefund({
        payment_intent: paymentIntent.id,
      });

      expect(refund).toBeDefined();
      expect(refund.id).toMatch(/^re_mock_/);
      expect(refund.object).toBe('refund');
      expect(refund.amount).toBe(10000);
      expect(refund.payment_intent).toBe(paymentIntent.id);
      expect(refund.status).toBe('succeeded');
    });

    it('should create a partial refund', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(paymentIntent.id, 'pm_test_success');

      const refund = await service.createRefund({
        payment_intent: paymentIntent.id,
        amount: 5000,
        reason: 'requested_by_customer',
      });

      expect(refund.amount).toBe(5000);
      expect(refund.reason).toBe('requested_by_customer');
    });

    it('should reject refund for non-succeeded payment', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
      });

      await expect(
        service.createRefund({
          payment_intent: paymentIntent.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject refund exceeding payment amount', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(paymentIntent.id, 'pm_test_success');

      await expect(
        service.createRefund({
          payment_intent: paymentIntent.id,
          amount: 15000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should retrieve a refund', async () => {
      const paymentIntent = await service.createPaymentIntent({
        amount: 10000,
      });

      await service.confirmPaymentIntent(paymentIntent.id, 'pm_test_success');

      const created = await service.createRefund({
        payment_intent: paymentIntent.id,
      });

      const retrieved = await service.retrieveRefund(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for non-existent refund', async () => {
      await expect(
        service.retrieveRefund('re_mock_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Clear', () => {
    it('should clear all mock data', async () => {
      await service.createPaymentIntent({ amount: 10000 });
      await service.createCustomer({ email: 'test@example.com' });

      await service.clear();

      await expect(
        service.retrievePaymentIntent('pi_mock_test'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
