import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  state!: string; // Two-letter state code

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'Invalid ZIP code format' })
  postalCode!: string;

  @IsString()
  @IsNotEmpty()
  country!: string; // Default: "US"

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsString()
  @IsOptional()
  @Matches(/^\+?1?\d{10,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  hoursOfOperation?: Record<string, { open: string; close: string }>;
}
