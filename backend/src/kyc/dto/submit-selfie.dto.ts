import { IsString } from 'class-validator';

export class SubmitSelfieDto {
  @IsString()
  imageData!: string; // base64 encoded image
}
