import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';

@Injectable()
export class LocationService {
  private readonly logger = new LoggerService('LocationService');

  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createLocationDto: CreateLocationDto) {
    this.logger.logWithFields('info', 'Creating new location', {
      organizationId,
      name: createLocationDto.name,
    });

    try {
      const location = await this.prisma.location.create({
        data: {
          ...createLocationDto,
          organizationId,
          // Convert hoursOfOperation to JSON if provided
          hoursOfOperation: createLocationDto.hoursOfOperation || undefined,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Location created successfully', {
        locationId: location.id,
        organizationId,
      });

      return location;
    } catch (error) {
      this.logger.error('Failed to create location', String(error), {
        organizationId,
        dto: createLocationDto,
      });
      throw error;
    }
  }

  async findAll(organizationId: string, query: LocationQueryDto) {
    const { search, state, city, page = 1, limit = 10 } = query;

    this.logger.logWithFields('debug', 'Finding locations', {
      organizationId,
      query,
    });

    try {
      // Build where clause
      const where: any = {
        organizationId,
      };

      // Add search filter (searches name, city, or address)
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { addressLine1: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add state filter
      if (state) {
        where.state = state;
      }

      // Add city filter
      if (city) {
        where.city = city;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.location.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            _count: {
              select: {
                vehicles: true,
              },
            },
          },
        }),
        this.prisma.location.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Locations retrieved', {
        organizationId,
        total,
        page,
        limit,
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to find locations', String(error), {
        organizationId,
        query,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    this.logger.logWithFields('debug', 'Finding location by ID', {
      locationId: id,
      organizationId,
    });

    try {
      const location = await this.prisma.location.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      if (!location) {
        this.logger.warn('Location not found', {
          locationId: id,
          organizationId,
        });
        throw new NotFoundException(
          `Location with ID ${id} not found or does not belong to your organization`,
        );
      }

      this.logger.logWithFields('debug', 'Location retrieved', {
        locationId: id,
        organizationId,
      });

      return location;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find location', String(error), {
        locationId: id,
        organizationId,
      });
      throw error;
    }
  }

  async update(
    id: string,
    organizationId: string,
    updateLocationDto: UpdateLocationDto,
  ) {
    this.logger.logWithFields('info', 'Updating location', {
      locationId: id,
      organizationId,
    });

    try {
      // First verify the location exists and belongs to the organization
      await this.findOne(id, organizationId);

      const location = await this.prisma.location.update({
        where: {
          id,
        },
        data: {
          ...updateLocationDto,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              vehicles: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Location updated successfully', {
        locationId: id,
        organizationId,
      });

      return location;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update location', String(error), {
        locationId: id,
        organizationId,
        dto: updateLocationDto,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    this.logger.logWithFields('info', 'Deleting location', {
      locationId: id,
      organizationId,
    });

    try {
      // First verify the location exists and belongs to the organization
      await this.findOne(id, organizationId);

      // Check if location has vehicles
      const vehicleCount = await this.prisma.vehicle.count({
        where: { locationId: id },
      });

      if (vehicleCount > 0) {
        this.logger.warn('Cannot delete location with vehicles', {
          locationId: id,
          organizationId,
          vehicleCount,
        });
        throw new Error(
          `Cannot delete location with ${vehicleCount} vehicle(s). Please reassign or remove vehicles first.`,
        );
      }

      await this.prisma.location.delete({
        where: {
          id,
        },
      });

      this.logger.logWithFields('info', 'Location deleted successfully', {
        locationId: id,
        organizationId,
      });

      return { message: 'Location deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete location', String(error), {
        locationId: id,
        organizationId,
      });
      throw error;
    }
  }
}
