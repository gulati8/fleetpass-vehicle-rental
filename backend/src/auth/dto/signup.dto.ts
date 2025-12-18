import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password.validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  organizationName!: string;
}
