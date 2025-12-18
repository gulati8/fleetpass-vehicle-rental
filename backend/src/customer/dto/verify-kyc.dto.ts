import { IsString, IsIn, IsOptional } from 'class-validator';

export class VerifyKycDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  inquiryId?: string;
}
