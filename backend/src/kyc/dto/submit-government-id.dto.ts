import { IsString, IsIn, IsOptional } from 'class-validator';

export class SubmitGovernmentIdDto {
  @IsString()
  frontPhoto!: string; // base64 or URL

  @IsString()
  @IsOptional()
  backPhoto?: string;

  @IsString()
  country!: string;

  @IsString()
  @IsIn(['dl', 'pp', 'id'])
  idClass!: 'dl' | 'pp' | 'id'; // driver's license, passport, ID card
}
