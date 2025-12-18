import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomerQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by name, email, phone, license number

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_progress', 'approved', 'rejected'])
  kycStatus?: string;

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
  @IsIn(['createdAt', 'firstName', 'lastName', 'email'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
