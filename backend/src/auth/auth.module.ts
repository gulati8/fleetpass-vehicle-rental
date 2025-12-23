import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenCleanupService } from './refresh-token-cleanup.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    RefreshTokenCleanupService,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
