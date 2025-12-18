import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?1?\d{10,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  driverLicenseNumber?: string;

  @IsString()
  @IsOptional()
  driverLicenseState?: string;

  @IsDateString()
  @IsOptional()
  driverLicenseExpiry?: string;
}
