import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsIn,
  Length,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  vin!: string;

  @IsString()
  @IsNotEmpty()
  make!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @IsString()
  @IsOptional()
  trim?: string;

  @IsString()
  @IsOptional()
  @IsIn(['sedan', 'suv', 'truck', 'coupe', 'van', 'convertible', 'wagon'])
  bodyType?: string;

  @IsString()
  @IsOptional()
  exteriorColor?: string;

  @IsString()
  @IsOptional()
  interiorColor?: string;

  @IsString()
  @IsOptional()
  @IsIn(['automatic', 'manual'])
  transmission?: string;

  @IsString()
  @IsOptional()
  @IsIn(['gas', 'diesel', 'electric', 'hybrid'])
  fuelType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  mileage?: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  dailyRateCents!: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  weeklyRateCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  monthlyRateCents?: number;

  @IsOptional()
  features?: Record<string, boolean>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @IsBoolean()
  @IsOptional()
  isAvailableForRent?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  locationId!: string;
}
