import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class VehicleQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by make, model, VIN

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  @IsIn(['sedan', 'suv', 'truck', 'coupe', 'van', 'convertible', 'wagon'])
  bodyType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['gas', 'diesel', 'electric', 'hybrid'])
  fuelType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['automatic', 'manual'])
  transmission?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAvailableForRent?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDailyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDailyRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  minYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  maxYear?: number;

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
  @IsIn(['createdAt', 'year', 'dailyRateCents', 'mileage', 'make'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
