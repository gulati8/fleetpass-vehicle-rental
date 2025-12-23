import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  Req,
} from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
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
  constructor(
    private authService: AuthService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  // Stricter limit: 5 signup attempts per 15 minutes to prevent abuse
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Public()
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract user agent and IP address
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;

    const result = await this.authService.signup(
      signupDto,
      userAgent,
      ipAddress,
    );

    // Set httpOnly cookie for access token (15 minutes)
    response.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set httpOnly cookie for refresh token (7 days)
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    // Return user and organization data only (no tokens in response body)
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
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract user agent and IP address
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;

    const result = await this.authService.login(loginDto, userAgent, ipAddress);

    // Set httpOnly cookie for access token (15 minutes)
    response.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set httpOnly cookie for refresh token (7 days)
    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    // Return user and organization data only (no tokens in response body)
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

  // Refresh access token using refresh token
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract refresh token from cookies
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    // Extract user agent and IP address
    const userAgent = request.headers['user-agent'];
    const ipAddress = request.ip;

    // Refresh access token
    const result = await this.authService.refreshAccessToken(
      refreshToken,
      userAgent,
      ipAddress,
    );

    // Set new access token cookie
    response.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Return user and organization data
    return {
      user: result.user,
      organization: result.organization,
    };
  }

  // Logout endpoint - clears cookies and revokes refresh token
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Request() req: AuthenticatedRequest,
    @Req() request: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Extract refresh token from cookies
    const refreshToken = request.cookies?.refresh_token;

    // Revoke refresh token
    await this.authService.logout(req.user.id, refreshToken);

    // Clear both cookies
    response.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
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
