import { Module, Global } from '@nestjs/common';
import { StripeMockService } from './stripe-mock.service';

/**
 * Stripe Mock Module
 * Global module that provides mock Stripe API for development and testing
 */
@Global()
@Module({
  providers: [StripeMockService],
  exports: [StripeMockService],
})
export class StripeMockModule {}
