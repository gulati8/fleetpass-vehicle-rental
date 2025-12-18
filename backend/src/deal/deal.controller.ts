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
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    organizationId: string;
  };
}

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  create(@Request() req: AuthenticatedRequest, @Body() createDealDto: CreateDealDto) {
    return this.dealService.create(createDealDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: DealQueryDto) {
    return this.dealService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealService.update(id, updateDealDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dealService.remove(id);
  }

  @Post(':id/win')
  win(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dealService.win(id, req.user.sub);
  }

  @Post(':id/lose')
  lose(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.dealService.lose(id, req.user.sub);
  }
}
