import { Module, Global } from '@nestjs/common';
import { PersonaMockService } from './persona-mock.service';
import { LoggerModule } from '../common/logger/logger.module';

/**
 * Persona Mock Module
 * Provides mock Persona KYC/identity verification service
 * Marked as @Global so it can be injected anywhere without importing
 */
@Global()
@Module({
  imports: [LoggerModule],
  providers: [PersonaMockService],
  exports: [PersonaMockService],
})
export class PersonaMockModule {}
