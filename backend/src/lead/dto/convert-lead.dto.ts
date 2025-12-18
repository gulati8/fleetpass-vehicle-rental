import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ConvertLeadDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  dealValueCents!: number;

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
