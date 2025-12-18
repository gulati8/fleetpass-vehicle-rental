import { IsOptional, IsString, IsIn, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class BookingQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by booking number, customer name, vehicle

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  pickupLocationId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'confirmed', 'active', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsDateString()
  pickupFrom?: string; // Filter pickups from this date

  @IsOptional()
  @IsDateString()
  pickupTo?: string; // Filter pickups to this date

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'pickupDatetime', 'dropoffDatetime', 'totalCents'])
  sortBy?: string = 'pickupDatetime';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
