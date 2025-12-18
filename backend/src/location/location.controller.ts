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
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  create(
    @Body() createLocationDto: CreateLocationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.create(
      req.user.organizationId,
      createLocationDto,
    );
  }

  @Get()
  findAll(
    @Query() query: LocationQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.findAll(req.user.organizationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.locationService.findOne(id, req.user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.update(
      id,
      req.user.organizationId,
      updateLocationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.locationService.remove(id, req.user.organizationId);
  }
}
