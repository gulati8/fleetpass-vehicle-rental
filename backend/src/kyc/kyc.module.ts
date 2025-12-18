import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { PersonaMockModule } from '../persona-mock/persona-mock.module';
import { CustomerModule } from '../customer/customer.module';

@Module({
  imports: [PrismaModule, LoggerModule, PersonaMockModule, CustomerModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
