import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { VerifyKycDto } from './dto/verify-kyc.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customerService.create(createCustomerDto, user.organizationId);
  }

  @Get()
  findAll(@Query() query: CustomerQueryDto, @CurrentUser() user: User) {
    return this.customerService.findAll(query, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() user: User,
  ) {
    return this.customerService.update(
      id,
      updateCustomerDto,
      user.organizationId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.customerService.remove(id, user.organizationId);
  }

  @Patch(':id/kyc')
  updateKycStatus(
    @Param('id') id: string,
    @Body() verifyKycDto: VerifyKycDto,
    @CurrentUser() user: User,
  ) {
    return this.customerService.updateKycStatus(
      id,
      verifyKycDto,
      user.organizationId,
    );
  }
}
