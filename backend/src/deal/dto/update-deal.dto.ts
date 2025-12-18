import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { CreateDealDto } from './create-deal.dto';

export class UpdateDealDto extends PartialType(CreateDealDto) {
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'closed_won', 'closed_lost'])
  status?: string;
}
