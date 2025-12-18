import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class CheckAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
