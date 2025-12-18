import { IsString, IsNotEmpty, IsDateString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  pickupLocationId!: string;

  @IsString()
  @IsNotEmpty()
  dropoffLocationId!: string;

  @IsDateString()
  @IsNotEmpty()
  pickupDatetime!: string;

  @IsDateString()
  @IsNotEmpty()
  dropoffDatetime!: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  depositCents?: number; // If not provided, use default

  @IsString()
  @IsOptional()
  notes?: string;
}
