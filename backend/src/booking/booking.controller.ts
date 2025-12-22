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
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingService.create(createBookingDto, user.organizationId);
  }

  @Get()
  findAll(@Query() query: BookingQueryDto, @CurrentUser() user: User) {
    return this.bookingService.findAll(query, user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: User,
  ) {
    return this.bookingService.update(
      id,
      updateBookingDto,
      user.organizationId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.remove(id, user.organizationId);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.confirm(id, user.organizationId);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.activate(id, user.organizationId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.complete(id, user.organizationId);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bookingService.cancel(id, user.organizationId);
  }
}
