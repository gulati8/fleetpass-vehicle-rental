import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';
import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsString()
  @IsIn(['pending', 'in_progress', 'approved', 'rejected'])
  @IsOptional()
  kycStatus?: string;

  @IsDateString()
  @IsOptional()
  kycVerifiedAt?: string;

  @IsString()
  @IsOptional()
  kycInquiryId?: string;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;
}
