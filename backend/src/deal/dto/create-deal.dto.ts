import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  dealValueCents!: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
