import { IsString, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentMethodId!: string;

  /**
   * Card number for testing purposes (mock Stripe only)
   * Allows testing different payment scenarios with test cards
   * @example '4242424242424242' - Success
   * @example '4000000000000002' - Decline
   * @example '4000000000009995' - Insufficient funds
   */
  @IsString()
  @IsOptional()
  cardNumber?: string;
}
