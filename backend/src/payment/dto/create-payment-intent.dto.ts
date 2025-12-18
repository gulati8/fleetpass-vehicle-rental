import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  bookingId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number; // If omitted, use booking's totalCents

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  customerId?: string; // Stripe customer ID
}
