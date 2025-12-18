import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRefundDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number; // If omitted, full refund

  @IsOptional()
  @IsString()
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}
