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
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealQueryDto } from './dto/deal-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body() createDealDto: CreateDealDto,
  ) {
    return this.dealService.create(
      createDealDto,
      user.id,
      user.organizationId,
    );
  }

  @Get()
  findAll(@Query() query: DealQueryDto, @CurrentUser() user: User) {
    return this.dealService.findAll(query, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDealDto: UpdateDealDto,
    @CurrentUser() user: User,
  ) {
    return this.dealService.update(
      id,
      updateDealDto,
      user.organizationId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dealService.remove(id, user.organizationId);
  }

  @Post(':id/win')
  win(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealService.win(id, user.id, user.organizationId);
  }

  @Post(':id/lose')
  lose(@CurrentUser() user: User, @Param('id') id: string) {
    return this.dealService.lose(id, user.id, user.organizationId);
  }
}
