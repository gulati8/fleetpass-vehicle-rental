import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.create(
      req.user.organizationId,
      createVehicleDto,
    );
  }

  @Get()
  findAll(
    @Query() query: VehicleQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.findAll(req.user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.vehicleService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.update(
      id,
      req.user.organizationId,
      updateVehicleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.vehicleService.remove(id, req.user.organizationId);
  }

  @Post('check-availability')
  checkAvailability(
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.vehicleService.checkAvailability(
      req.user.organizationId,
      checkAvailabilityDto,
    );
  }
}
