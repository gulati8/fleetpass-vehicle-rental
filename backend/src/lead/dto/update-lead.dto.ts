import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @IsString()
  @IsOptional()
  @IsIn(['new', 'contacted', 'qualified', 'converted', 'lost'])
  status?: string;
}
