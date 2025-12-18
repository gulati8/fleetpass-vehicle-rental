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
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  @Get()
  findAll(@Query() query: BookingQueryDto) {
    return this.bookingService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingService.update(id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.bookingService.confirm(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.bookingService.activate(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.bookingService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.bookingService.cancel(id);
  }
}
