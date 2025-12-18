import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email: string;
    organizationId: string;
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Create a payment intent for a booking
   * POST /payments/intents
   */
  @Post('intents')
  async createPaymentIntent(
    @Request() req: AuthenticatedRequest,
    @Body() createDto: CreatePaymentIntentDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.paymentService.createPaymentIntent(organizationId, createDto);
  }

  /**
   * Get payment intent details
   * GET /payments/intents/:id
   */
  @Get('intents/:id')
  async getPaymentIntent(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return this.paymentService.findOne(organizationId, id);
  }

  /**
   * Confirm a payment intent
   * POST /payments/intents/:id/confirm
   */
  @Post('intents/:id/confirm')
  async confirmPayment(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() confirmDto: ConfirmPaymentDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.paymentService.confirmPayment(organizationId, id, confirmDto);
  }

  /**
   * Cancel a payment intent
   * POST /payments/intents/:id/cancel
   */
  @Post('intents/:id/cancel')
  async cancelPayment(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    return this.paymentService.cancelPayment(organizationId, id);
  }

  /**
   * Create a refund
   * POST /payments/:id/refund
   */
  @Post(':id/refund')
  async refundPayment(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() refundDto: CreateRefundDto,
  ) {
    const organizationId = req.user.organizationId;
    return this.paymentService.refundPayment(organizationId, id, refundDto);
  }

  /**
   * Webhook endpoint for Stripe events (simulated)
   * POST /payments/webhooks
   */
  @Post('webhooks')
  async handleWebhook(@Body() body: { event: string; data: any }) {
    return this.paymentService.handleWebhook(body.event, body.data);
  }
}
