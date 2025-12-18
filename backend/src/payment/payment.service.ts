import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { StripeMockService } from '../stripe-mock/stripe-mock.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new LoggerService('PaymentService');

  constructor(
    private prisma: PrismaService,
    private stripeMock: StripeMockService,
  ) {}

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(
    organizationId: string,
    createDto: CreatePaymentIntentDto,
  ) {
    this.logger.logWithFields('info', 'Creating payment intent', {
      bookingId: createDto.bookingId,
      organizationId,
    });

    try {
      // Fetch and validate booking
      const booking = await this.prisma.booking.findUnique({
        where: { id: createDto.bookingId },
        include: {
          customer: true,
          vehicle: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Multi-tenancy check - verify booking belongs to organization
      if (booking.vehicle.location.organizationId !== organizationId) {
        throw new NotFoundException('Booking not found');
      }

      // Determine amount (use booking total if not specified)
      const amountCents = createDto.amountCents || booking.totalCents;

      // Create Stripe payment intent
      const paymentIntent = await this.stripeMock.createPaymentIntent({
        amount: amountCents,
        currency: createDto.currency || 'usd',
        customer: createDto.customerId,
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          organizationId,
        },
      });

      // Create Payment record
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amountCents,
          currency: paymentIntent.currency,
          status: 'pending',
          stripePaymentId: paymentIntent.id,
          stripeCustomerId: paymentIntent.customer,
          organizationId,
        },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              totalCents: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Payment intent created', {
        type: 'payment_event',
        event: 'payment_intent.created',
        paymentId: payment.id,
        bookingId: booking.id,
        amount: amountCents,
      });

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create payment intent', String(error), {
        dto: createDto,
      });
      throw error;
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(
    organizationId: string,
    paymentId: string,
    confirmDto: ConfirmPaymentDto,
  ) {
    this.logger.logWithFields('info', 'Confirming payment', {
      paymentId,
      organizationId,
    });

    try {
      // Fetch and validate payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Multi-tenancy check
      if (payment.organizationId !== organizationId) {
        throw new NotFoundException('Payment not found');
      }

      if (!payment.stripePaymentId) {
        throw new BadRequestException('Payment has no Stripe payment intent');
      }

      if (payment.status === 'succeeded') {
        throw new BadRequestException('Payment already succeeded');
      }

      // Confirm via Stripe mock
      const paymentIntent = await this.stripeMock.confirmPaymentIntent(
        payment.stripePaymentId,
        confirmDto.paymentMethodId,
      );

      // Update payment record based on result
      let updatedPayment;

      if (paymentIntent.status === 'succeeded') {
        // Payment succeeded
        updatedPayment = await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'succeeded',
            paymentMethod: 'card',
          },
          include: {
            booking: true,
          },
        });

        // Update booking status to confirmed
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: 'confirmed',
            depositPaidAt: new Date(),
          },
        });

        this.logger.logWithFields('info', 'Payment succeeded', {
          type: 'payment_event',
          event: 'payment.succeeded',
          paymentId: payment.id,
          bookingId: payment.bookingId,
          amount: payment.amountCents,
        });
      } else if (paymentIntent.status === 'processing') {
        // Payment processing
        updatedPayment = await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'processing',
            paymentMethod: 'card',
          },
          include: {
            booking: true,
          },
        });

        this.logger.logWithFields('info', 'Payment processing', {
          paymentId: payment.id,
        });
      } else if (paymentIntent.last_payment_error) {
        // Payment failed
        updatedPayment = await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'failed',
            failureReason: paymentIntent.last_payment_error.message,
          },
          include: {
            booking: true,
          },
        });

        this.logger.warn('Payment failed', {
          type: 'payment_event',
          event: 'payment.failed',
          paymentId: payment.id,
          reason: paymentIntent.last_payment_error.message,
        });
      }

      return updatedPayment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to confirm payment', String(error), {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(organizationId: string, paymentId: string) {
    this.logger.logWithFields('info', 'Canceling payment', {
      paymentId,
      organizationId,
    });

    try {
      // Fetch and validate payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Multi-tenancy check
      if (payment.organizationId !== organizationId) {
        throw new NotFoundException('Payment not found');
      }

      if (!payment.stripePaymentId) {
        throw new BadRequestException('Payment has no Stripe payment intent');
      }

      if (payment.status === 'succeeded') {
        throw new BadRequestException(
          'Cannot cancel succeeded payment. Use refund instead.',
        );
      }

      // Cancel via Stripe mock
      await this.stripeMock.cancelPaymentIntent(payment.stripePaymentId);

      // Update payment record
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'failed',
          failureReason: 'Canceled by user',
        },
        include: {
          booking: true,
        },
      });

      this.logger.logWithFields('info', 'Payment canceled', {
        paymentId: payment.id,
      });

      return updatedPayment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to cancel payment', String(error), {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Create a refund for a payment
   */
  async refundPayment(
    organizationId: string,
    paymentId: string,
    refundDto: CreateRefundDto,
  ) {
    this.logger.logWithFields('info', 'Creating refund', {
      paymentId,
      organizationId,
      amount: refundDto.amountCents,
    });

    try {
      // Fetch and validate payment
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Multi-tenancy check
      if (payment.organizationId !== organizationId) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== 'succeeded') {
        throw new BadRequestException('Can only refund succeeded payments');
      }

      if (!payment.stripePaymentId) {
        throw new BadRequestException('Payment has no Stripe payment intent');
      }

      // Determine refund amount
      const refundAmountCents = refundDto.amountCents || payment.amountCents;
      const alreadyRefunded = payment.refundedAmountCents || 0;

      if (refundAmountCents + alreadyRefunded > payment.amountCents) {
        throw new BadRequestException(
          'Refund amount exceeds remaining payment amount',
        );
      }

      // Create refund via Stripe mock
      const refund = await this.stripeMock.createRefund({
        payment_intent: payment.stripePaymentId,
        amount: refundAmountCents,
        reason: refundDto.reason || null,
      });

      // Update payment record
      const totalRefunded = alreadyRefunded + refundAmountCents;
      const isFullyRefunded = totalRefunded >= payment.amountCents;

      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: isFullyRefunded ? 'refunded' : 'succeeded',
          refundedAmountCents: totalRefunded,
        },
        include: {
          booking: true,
        },
      });

      // If fully refunded, update booking status
      if (isFullyRefunded) {
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: 'cancelled',
          },
        });
      }

      this.logger.logWithFields('info', 'Refund created', {
        type: 'payment_event',
        event: 'payment.refunded',
        paymentId: payment.id,
        refundId: refund.id,
        amount: refundAmountCents,
        isFullyRefunded,
      });

      return {
        payment: updatedPayment,
        refund,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create refund', String(error), {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Get payment by ID
   */
  async findOne(organizationId: string, paymentId: string) {
    this.logger.logWithFields('debug', 'Finding payment by ID', {
      paymentId,
      organizationId,
    });

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  year: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Multi-tenancy check
      if (payment.organizationId !== organizationId) {
        throw new NotFoundException('Payment not found');
      }

      return payment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find payment', String(error), {
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Handle webhook events (simulated)
   */
  async handleWebhook(event: string, data: any) {
    this.logger.logWithFields('info', 'Handling webhook event', {
      event,
    });

    // Webhook handling logic would go here
    // For now, just simulate it
    await this.stripeMock.simulateWebhook(event, data);
  }
}
