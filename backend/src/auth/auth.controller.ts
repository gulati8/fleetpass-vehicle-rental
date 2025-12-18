import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { PasswordValidator } from './helpers/password-validator';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Stricter limit: 5 signup attempts per 15 minutes to prevent abuse
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Public()
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signup(signupDto);

    // Set httpOnly cookie with JWT token
    response.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return user and organization data only (no token in response body)
    return {
      user: result.user,
      organization: result.organization,
    };
  }

  // Stricter limit: 5 login attempts per 15 minutes to prevent brute force
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // Set httpOnly cookie with JWT token
    response.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return user and organization data only (no token in response body)
    return {
      user: result.user,
      organization: result.organization,
    };
  }

  // Standard rate limit applies (100 req/min from global config)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.authService.getMe(req.user.id);
  }

  // Logout endpoint - clears the auth cookie
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return {
      message: 'Logged out successfully',
    };
  }

  // Moderate limit: 10 password validations per minute
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @Post('validate-password')
  validatePassword(@Body('password') password: string) {
    const result = PasswordValidator.validate(password);
    return {
      isStrong: result.isStrong,
      strength: PasswordValidator.getStrengthLabel(result.score),
      score: result.score,
      errors: result.errors,
    };
  }
}
