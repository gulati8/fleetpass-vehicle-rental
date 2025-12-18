import { IsString, IsUUID } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @IsUUID()
  customerId!: string;
}
