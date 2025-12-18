import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

const request = require('supertest');

describe('PaymentController (Integration)', () => {
  let app: INestApplication;
  let paymentService: jest.Mocked<PaymentService>;

  const mockPayment = {
    id: 'payment-123',
    bookingId: 'booking-123',
    amountCents: 50000,
    currency: 'usd',
    status: 'pending',
    stripePaymentId: 'pi_mock_123',
    stripeCustomerId: null,
    paymentMethod: null,
    failureReason: null,
    refundedAmountCents: null,
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    booking: {
      id: 'booking-123',
      bookingNumber: 'BP-2024-000001',
      customerId: 'customer-123',
      vehicleId: 'vehicle-123',
      pickupLocationId: 'location-1',
      dropoffLocationId: 'location-1',
      pickupDatetime: new Date('2024-01-01T10:00:00Z'),
      dropoffDatetime: new Date('2024-01-05T10:00:00Z'),
      dailyRateCents: 10000,
      numDays: 4,
      subtotalCents: 40000,
      taxCents: 0,
      totalCents: 50000,
      mockStripePaymentIntentId: null,
      depositCents: 10000,
      depositPaidAt: null,
      status: 'pending',
      createdById: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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
  } as any; // Type assertion to handle complex Prisma types in tests

  beforeEach(async () => {
    const mockPaymentService = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      cancelPayment: jest.fn(),
      refundPayment: jest.fn(),
      findOne: jest.fn(),
      handleWebhook: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            id: 'user-123',
            email: 'user@test.com',
            role: 'admin',
            organizationId: 'org-1',
          };
          return true;
        }),
      })
      .compile();

    paymentService = moduleFixture.get(PaymentService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /payments/intents', () => {
    const createDto = {
      bookingId: 'booking-123',
      amountCents: 50000,
      currency: 'usd',
    };

    it('should create payment intent successfully', async () => {
      const result = {
        payment: mockPayment,
        clientSecret: 'pi_mock_123_secret_abc',
      };
      paymentService.createPaymentIntent.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .post('/payments/intents')
        .send(createDto)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.clientSecret).toBe('pi_mock_123_secret_abc');
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        'org-1',
        createDto,
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/intents')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle booking not found', async () => {
      paymentService.createPaymentIntent.mockRejectedValue(
        new NotFoundException('Booking not found'),
      );

      const response = await request(app.getHttpServer())
        .post('/payments/intents')
        .send(createDto)
        .expect(404);

      expect(response.body.error.message).toBe('Booking not found');
    });
  });

  describe('GET /payments/intents/:id', () => {
    it('should retrieve payment intent', async () => {
      paymentService.findOne.mockResolvedValue(mockPayment);

      const response = await request(app.getHttpServer())
        .get('/payments/intents/payment-123')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe('payment-123');
      expect(paymentService.findOne).toHaveBeenCalledWith('org-1', 'payment-123');
    });

    it('should handle payment not found', async () => {
      paymentService.findOne.mockRejectedValue(
        new NotFoundException('Payment not found'),
      );

      const response = await request(app.getHttpServer())
        .get('/payments/intents/nonexistent')
        .expect(404);

      expect(response.body.error.message).toBe('Payment not found');
    });
  });

  describe('POST /payments/intents/:id/confirm', () => {
    const confirmDto = {
      paymentMethodId: 'pm_test_success',
    };

    it('should confirm payment successfully', async () => {
      const confirmedPayment = {
        ...mockPayment,
        status: 'succeeded',
        paymentMethod: 'card',
      };
      paymentService.confirmPayment.mockResolvedValue(confirmedPayment);

      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/confirm')
        .send(confirmDto)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('succeeded');
      expect(paymentService.confirmPayment).toHaveBeenCalledWith(
        'org-1',
        'payment-123',
        confirmDto,
      );
    });

    it('should validate payment method ID', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/confirm')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle payment already succeeded', async () => {
      paymentService.confirmPayment.mockRejectedValue(
        new BadRequestException('Payment already succeeded'),
      );

      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/confirm')
        .send(confirmDto)
        .expect(400);

      expect(response.body.error.message).toBe('Payment already succeeded');
    });

    it('should handle card declined', async () => {
      const failedPayment = {
        ...mockPayment,
        status: 'failed',
        failureReason: 'Your card was declined',
      };
      paymentService.confirmPayment.mockResolvedValue(failedPayment);

      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/confirm')
        .send({ paymentMethodId: 'pm_test_decline' })
        .expect(201);

      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.failureReason).toBe('Your card was declined');
    });
  });

  describe('POST /payments/intents/:id/cancel', () => {
    it('should cancel payment successfully', async () => {
      const canceledPayment = {
        ...mockPayment,
        status: 'failed',
        failureReason: 'Canceled by user',
      };
      paymentService.cancelPayment.mockResolvedValue(canceledPayment);

      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/cancel')
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('failed');
      expect(paymentService.cancelPayment).toHaveBeenCalledWith(
        'org-1',
        'payment-123',
      );
    });

    it('should handle cancel succeeded payment error', async () => {
      paymentService.cancelPayment.mockRejectedValue(
        new BadRequestException('Cannot cancel succeeded payment. Use refund instead.'),
      );

      const response = await request(app.getHttpServer())
        .post('/payments/intents/payment-123/cancel')
        .expect(400);

      expect(response.body.error.message).toContain('Cannot cancel succeeded payment');
    });
  });

  describe('POST /payments/:id/refund', () => {
    const refundDto = {
      amountCents: 25000,
      reason: 'requested_by_customer',
    };

    it('should create partial refund successfully', async () => {
      const result = {
        payment: {
          ...mockPayment,
          status: 'succeeded',
          refundedAmountCents: 25000,
        },
        refund: {
          id: 're_mock_123',
          object: 'refund' as const,
          amount: 25000,
          currency: 'usd',
          payment_intent: 'pi_mock_123',
          status: 'succeeded' as const,
          created: Math.floor(Date.now() / 1000),
          reason: 'requested_by_customer' as const,
        },
      };
      paymentService.refundPayment.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .post('/payments/payment-123/refund')
        .send(refundDto)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.payment.refundedAmountCents).toBe(25000);
      expect(response.body.data.refund).toBeDefined();
      expect(paymentService.refundPayment).toHaveBeenCalledWith(
        'org-1',
        'payment-123',
        refundDto,
      );
    });

    it('should create full refund successfully', async () => {
      const fullRefundDto = {};
      const result = {
        payment: {
          ...mockPayment,
          status: 'refunded',
          refundedAmountCents: 50000,
        },
        refund: {
          id: 're_mock_123',
          object: 'refund' as const,
          amount: 50000,
          currency: 'usd',
          payment_intent: 'pi_mock_123',
          status: 'succeeded' as const,
          created: Math.floor(Date.now() / 1000),
          reason: null,
        },
      };
      paymentService.refundPayment.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .post('/payments/payment-123/refund')
        .send(fullRefundDto)
        .expect(201);

      expect(response.body.data.payment.status).toBe('refunded');
      expect(response.body.data.payment.refundedAmountCents).toBe(50000);
    });

    it('should handle refund non-succeeded payment', async () => {
      paymentService.refundPayment.mockRejectedValue(
        new BadRequestException('Can only refund succeeded payments'),
      );

      const response = await request(app.getHttpServer())
        .post('/payments/payment-123/refund')
        .send(refundDto)
        .expect(400);

      expect(response.body.error.message).toBe('Can only refund succeeded payments');
    });

    it('should validate refund amount if provided', async () => {
      const invalidDto = {
        amountCents: -100,
      };

      const response = await request(app.getHttpServer())
        .post('/payments/payment-123/refund')
        .send(invalidDto)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /payments/webhooks', () => {
    it('should handle webhook event', async () => {
      paymentService.handleWebhook.mockResolvedValue(undefined);

      const webhookData = {
        event: 'payment_intent.succeeded',
        data: {
          id: 'pi_mock_123',
          status: 'succeeded',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/payments/webhooks')
        .send(webhookData)
        .expect(201);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'payment_intent.succeeded',
        webhookData.data,
      );
    });
  });
});
