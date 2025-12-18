import { IsString } from 'class-validator';

export class DeclineInquiryDto {
  @IsString()
  reason!: string;
}
