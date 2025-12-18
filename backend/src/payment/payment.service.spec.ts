import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeMockService } from '../stripe-mock/stripe-mock.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let stripeMock: StripeMockService;

  const organizationId = 'org-123';
  const bookingId = 'booking-123';
  const paymentId = 'payment-123';

  const mockBooking = {
    id: bookingId,
    bookingNumber: 'BP-2024-000001',
    customerId: 'customer-123',
    vehicleId: 'vehicle-123',
    totalCents: 50000,
    status: 'pending',
    vehicle: {
      location: {
        organizationId,
      },
    },
    customer: {
      id: 'customer-123',
      email: 'test@example.com',
    },
  };

  const mockPayment = {
    id: paymentId,
    bookingId,
    amountCents: 50000,
    currency: 'usd',
    status: 'pending',
    stripePaymentId: 'pi_mock_123',
    stripeCustomerId: null,
    paymentMethod: null,
    failureReason: null,
    refundedAmountCents: null,
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    booking: mockBooking,
  };

  const mockPaymentIntent = {
    id: 'pi_mock_123',
    object: 'payment_intent' as const,
    amount: 50000,
    currency: 'usd',
    status: 'requires_payment_method' as const,
    client_secret: 'pi_mock_123_secret_abc',
    customer: null,
    payment_method: null,
    created: Math.floor(Date.now() / 1000),
    metadata: {},
  };

  const mockPrismaService = {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStripeMockService = {
    createPaymentIntent: jest.fn(),
    confirmPaymentIntent: jest.fn(),
    cancelPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    simulateWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: StripeMockService,
          useValue: mockStripeMockService,
        },
      ],
    }).compile();

    // Suppress logs during tests
    jest.spyOn(LoggerService.prototype, 'logWithFields').mockImplementation();
    jest.spyOn(LoggerService.prototype, 'warn').mockImplementation();
    jest.spyOn(LoggerService.prototype, 'error').mockImplementation();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    stripeMock = module.get<StripeMockService>(StripeMockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    const createDto = {
      bookingId,
      amountCents: 50000,
      currency: 'usd',
    };

    it('should create payment intent successfully', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockStripeMockService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.createPaymentIntent(organizationId, createDto);

      expect(result).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(result.clientSecret).toBe('pi_mock_123_secret_abc');
      expect(mockStripeMockService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'usd',
        customer: undefined,
        metadata: {
          bookingId,
          bookingNumber: 'BP-2024-000001',
          organizationId,
        },
      });
    });

    it('should use booking totalCents if amount not specified', async () => {
      const dtoWithoutAmount = { bookingId };
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockStripeMockService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      await service.createPaymentIntent(organizationId, dtoWithoutAmount);

      expect(mockStripeMockService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000, // From mockBooking.totalCents
        }),
      );
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent(organizationId, createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if booking belongs to different organization', async () => {
      const wrongOrgBooking = {
        ...mockBooking,
        vehicle: {
          location: {
            organizationId: 'different-org',
          },
        },
      };
      mockPrismaService.booking.findUnique.mockResolvedValue(wrongOrgBooking);

      await expect(
        service.createPaymentIntent(organizationId, createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    const confirmDto = {
      paymentMethodId: 'pm_test_success',
    };

    it('should confirm payment successfully', async () => {
      const succeededIntent = {
        ...mockPaymentIntent,
        status: 'succeeded' as const,
        payment_method: 'pm_test_success',
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockStripeMockService.confirmPaymentIntent.mockResolvedValue(succeededIntent);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'succeeded',
        paymentMethod: 'card',
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'confirmed',
      });

      const result = await service.confirmPayment(
        organizationId,
        paymentId,
        confirmDto,
      );

      expect(result).toBeDefined();
      expect(result!.status).toBe('succeeded');
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: {
          status: 'confirmed',
          depositPaidAt: expect.any(Date),
        },
      });
    });

    it('should handle payment processing status', async () => {
      const processingIntent = {
        ...mockPaymentIntent,
        status: 'processing' as const,
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockStripeMockService.confirmPaymentIntent.mockResolvedValue(processingIntent);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'processing',
      });

      const result = await service.confirmPayment(
        organizationId,
        paymentId,
        confirmDto,
      );

      expect(result).toBeDefined();
      expect(result!.status).toBe('processing');
    });

    it('should handle payment failure', async () => {
      const failedIntent = {
        ...mockPaymentIntent,
        status: 'requires_payment_method' as const,
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined',
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockStripeMockService.confirmPaymentIntent.mockResolvedValue(failedIntent);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'failed',
        failureReason: 'Your card was declined',
      });

      const result = await service.confirmPayment(
        organizationId,
        paymentId,
        confirmDto,
      );

      expect(result).toBeDefined();
      expect(result!.status).toBe('failed');
      expect(result!.failureReason).toBe('Your card was declined');
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmPayment(organizationId, paymentId, confirmDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if payment belongs to different organization', async () => {
      const wrongOrgPayment = {
        ...mockPayment,
        organizationId: 'different-org',
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(wrongOrgPayment);

      await expect(
        service.confirmPayment(organizationId, paymentId, confirmDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment already succeeded', async () => {
      const succeededPayment = {
        ...mockPayment,
        status: 'succeeded',
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(succeededPayment);

      await expect(
        service.confirmPayment(organizationId, paymentId, confirmDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockStripeMockService.cancelPaymentIntent.mockResolvedValue({
        ...mockPaymentIntent,
        status: 'canceled',
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'failed',
        failureReason: 'Canceled by user',
      });

      const result = await service.cancelPayment(organizationId, paymentId);

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Canceled by user');
    });

    it('should throw BadRequestException if payment already succeeded', async () => {
      const succeededPayment = {
        ...mockPayment,
        status: 'succeeded',
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(succeededPayment);

      await expect(
        service.cancelPayment(organizationId, paymentId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    const refundDto = {
      amountCents: 25000,
      reason: 'requested_by_customer' as const,
    };

    const succeededPayment = {
      ...mockPayment,
      status: 'succeeded',
      refundedAmountCents: 0,
    };

    const mockRefund = {
      id: 're_mock_123',
      object: 'refund' as const,
      amount: 25000,
      currency: 'usd',
      payment_intent: 'pi_mock_123',
      status: 'succeeded' as const,
      created: Math.floor(Date.now() / 1000),
      reason: 'requested_by_customer' as const,
    };

    it('should create partial refund successfully', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(succeededPayment);
      mockStripeMockService.createRefund.mockResolvedValue(mockRefund);
      mockPrismaService.payment.update.mockResolvedValue({
        ...succeededPayment,
        refundedAmountCents: 25000,
      });

      const result = await service.refundPayment(
        organizationId,
        paymentId,
        refundDto,
      );

      expect(result.payment.refundedAmountCents).toBe(25000);
      expect(result.payment.status).toBe('succeeded'); // Not fully refunded
      expect(result.refund).toEqual(mockRefund);
    });

    it('should create full refund and cancel booking', async () => {
      const fullRefundDto = { amountCents: 50000 };

      mockPrismaService.payment.findUnique.mockResolvedValue(succeededPayment);
      mockStripeMockService.createRefund.mockResolvedValue({
        ...mockRefund,
        amount: 50000,
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...succeededPayment,
        status: 'refunded',
        refundedAmountCents: 50000,
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      const result = await service.refundPayment(
        organizationId,
        paymentId,
        fullRefundDto,
      );

      expect(result.payment.status).toBe('refunded');
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { status: 'cancelled' },
      });
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.refundPayment(organizationId, paymentId, refundDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment not succeeded', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment(organizationId, paymentId, refundDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund exceeds remaining amount', async () => {
      const partiallyRefunded = {
        ...succeededPayment,
        refundedAmountCents: 40000,
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(partiallyRefunded);

      const excessRefund = { amountCents: 20000 }; // 40000 + 20000 > 50000

      await expect(
        service.refundPayment(organizationId, paymentId, excessRefund),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find payment successfully', async () => {
      const paymentWithRelations = {
        ...mockPayment,
        booking: {
          ...mockBooking,
          customer: {
            id: 'customer-123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          vehicle: {
            id: 'vehicle-123',
            make: 'Toyota',
            model: 'Camry',
            year: 2024,
          },
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(paymentWithRelations);

      const result = await service.findOne(organizationId, paymentId);

      expect(result).toEqual(paymentWithRelations);
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(organizationId, paymentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if payment belongs to different organization', async () => {
      const wrongOrgPayment = {
        ...mockPayment,
        organizationId: 'different-org',
      };
      mockPrismaService.payment.findUnique.mockResolvedValue(wrongOrgPayment);

      await expect(
        service.findOne(organizationId, paymentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook event', async () => {
      await service.handleWebhook('payment_intent.succeeded', {
        id: 'pi_mock_123',
      });

      expect(mockStripeMockService.simulateWebhook).toHaveBeenCalledWith(
        'payment_intent.succeeded',
        { id: 'pi_mock_123' },
      );
    });
  });
});
