import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsString()
  @IsIn(['pending', 'confirmed', 'active', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  depositPaidAt?: string;

  @IsString()
  @IsOptional()
  mockStripePaymentIntentId?: string;
}
