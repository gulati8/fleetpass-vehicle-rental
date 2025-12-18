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
  Request,
} from '@nestjs/common';
import { LeadService } from './lead.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    organizationId: string;
  };
}

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() createLeadDto: CreateLeadDto) {
    return this.leadService.create(createLeadDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: LeadQueryDto) {
    return this.leadService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadService.update(id, updateLeadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadService.remove(id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() assignLeadDto: AssignLeadDto) {
    return this.leadService.assign(id, assignLeadDto);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() convertLeadDto: ConvertLeadDto) {
    return this.leadService.convert(id, convertLeadDto);
  }
}
