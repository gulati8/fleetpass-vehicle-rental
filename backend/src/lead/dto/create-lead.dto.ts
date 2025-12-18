import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsOptional()
  customerId?: string; // If lead is for existing customer

  @IsEmail()
  @IsOptional()
  customerEmail?: string; // If not yet a customer

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  source?: string; // 'website', 'phone', 'walk_in', 'referral', etc.

  @IsString()
  @IsOptional()
  vehicleInterestId?: string; // Vehicle they're interested in

  @IsString()
  @IsOptional()
  notes?: string;
}
