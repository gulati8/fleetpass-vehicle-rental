import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LocationModule } from './location/location.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { CustomerModule } from './customer/customer.module';
import { BookingModule } from './booking/booking.module';
import { LeadModule } from './lead/lead.module';
import { DealModule } from './deal/deal.module';
import { StripeMockModule } from './stripe-mock/stripe-mock.module';
import { PaymentModule } from './payment/payment.module';
import { PersonaMockModule } from './persona-mock/persona-mock.module';
import { KycModule } from './kyc/kyc.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Global rate limiting with multiple tiers
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    LoggerModule,
    PrismaModule,
    RedisModule,
    StripeMockModule,
    PersonaMockModule,
    AuthModule,
    LocationModule,
    VehicleModule,
    CustomerModule,
    BookingModule,
    LeadModule,
    DealModule,
    PaymentModule,
    KycModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Exception filters (order matters: most specific first)
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter, // Specific: handles ThrottlerException
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // General: handles all HttpException
    },
    // Interceptors (order matters: executed in order of registration)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // First: logs request/response
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor, // Second: wraps response in standard format
    },
  ],
})
export class AppModule {}
