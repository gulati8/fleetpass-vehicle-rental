import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DealQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by customer name, email

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'closed_won', 'closed_lost'])
  status?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

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
  @IsIn(['createdAt', 'updatedAt', 'closedAt', 'dealValueCents'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
