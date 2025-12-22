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
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    return this.leadService.create(
      createLeadDto,
      user.id,
      user.organizationId,
    );
  }

  @Get()
  findAll(@Query() query: LeadQueryDto, @CurrentUser() user: User) {
    return this.leadService.findAll(query, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.leadService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() user: User,
  ) {
    return this.leadService.update(
      id,
      updateLeadDto,
      user.organizationId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.leadService.remove(id, user.organizationId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() assignLeadDto: AssignLeadDto,
    @CurrentUser() user: User,
  ) {
    return this.leadService.assign(id, assignLeadDto, user.organizationId);
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @Body() convertLeadDto: ConvertLeadDto,
    @CurrentUser() user: User,
  ) {
    return this.leadService.convert(id, convertLeadDto, user.organizationId);
  }
}
