import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

@Injectable()
export class VehicleService {
  private readonly logger = new LoggerService('VehicleService');

  constructor(private prisma: PrismaService) {}

  async create(organizationId: string, createVehicleDto: CreateVehicleDto) {
    this.logger.logWithFields('info', 'Creating new vehicle', {
      organizationId,
      vin: createVehicleDto.vin,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
    });

    try {
      // Verify location exists and belongs to organization
      const location = await this.prisma.location.findFirst({
        where: {
          id: createVehicleDto.locationId,
          organizationId,
        },
      });

      if (!location) {
        this.logger.warn('Location not found or does not belong to organization', {
          locationId: createVehicleDto.locationId,
          organizationId,
        });
        throw new BadRequestException(
          'Location not found or does not belong to your organization',
        );
      }

      // Check for duplicate VIN
      const existingVehicle = await this.prisma.vehicle.findUnique({
        where: { vin: createVehicleDto.vin },
      });

      if (existingVehicle) {
        this.logger.warn('VIN already exists', {
          vin: createVehicleDto.vin,
        });
        throw new ConflictException(`Vehicle with VIN ${createVehicleDto.vin} already exists`);
      }

      const vehicle = await this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          features: createVehicleDto.features || undefined,
          imageUrls: createVehicleDto.imageUrls || [],
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Vehicle created successfully', {
        vehicleId: vehicle.id,
        organizationId,
        vin: vehicle.vin,
      });

      return vehicle;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to create vehicle', String(error), {
        organizationId,
        dto: createVehicleDto,
      });
      throw error;
    }
  }

  async findAll(organizationId: string, query: VehicleQueryDto) {
    const {
      search,
      locationId,
      make,
      model,
      bodyType,
      fuelType,
      transmission,
      isAvailableForRent,
      minDailyRate,
      maxDailyRate,
      minYear,
      maxYear,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    this.logger.logWithFields('debug', 'Finding vehicles', {
      organizationId,
      query,
    });

    try {
      // Build where clause
      const where: any = {
        location: {
          organizationId,
        },
      };

      // Search filter (make, model, VIN)
      if (search) {
        where.OR = [
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { vin: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Location filter
      if (locationId) {
        where.locationId = locationId;
      }

      // Make filter
      if (make) {
        where.make = { contains: make, mode: 'insensitive' };
      }

      // Model filter
      if (model) {
        where.model = { contains: model, mode: 'insensitive' };
      }

      // Body type filter
      if (bodyType) {
        where.bodyType = bodyType;
      }

      // Fuel type filter
      if (fuelType) {
        where.fuelType = fuelType;
      }

      // Transmission filter
      if (transmission) {
        where.transmission = transmission;
      }

      // Availability filter
      if (isAvailableForRent !== undefined) {
        where.isAvailableForRent = isAvailableForRent;
      }

      // Price range filter
      if (minDailyRate !== undefined || maxDailyRate !== undefined) {
        where.dailyRateCents = {};
        if (minDailyRate !== undefined) {
          where.dailyRateCents.gte = minDailyRate;
        }
        if (maxDailyRate !== undefined) {
          where.dailyRateCents.lte = maxDailyRate;
        }
      }

      // Year range filter
      if (minYear !== undefined || maxYear !== undefined) {
        where.year = {};
        if (minYear !== undefined) {
          where.year.gte = minYear;
        }
        if (maxYear !== undefined) {
          where.year.lte = maxYear;
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.vehicle.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            location: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                organizationId: true,
              },
            },
          },
        }),
        this.prisma.vehicle.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Vehicles retrieved', {
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
      this.logger.error('Failed to find vehicles', String(error), {
        organizationId,
        query,
      });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    this.logger.logWithFields('debug', 'Finding vehicle by ID', {
      vehicleId: id,
      organizationId,
    });

    try {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id,
          location: {
            organizationId,
          },
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              phone: true,
              organizationId: true,
            },
          },
        },
      });

      if (!vehicle) {
        this.logger.warn('Vehicle not found', {
          vehicleId: id,
          organizationId,
        });
        throw new NotFoundException(
          `Vehicle with ID ${id} not found or does not belong to your organization`,
        );
      }

      this.logger.logWithFields('debug', 'Vehicle retrieved', {
        vehicleId: id,
        organizationId,
      });

      return vehicle;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find vehicle', String(error), {
        vehicleId: id,
        organizationId,
      });
      throw error;
    }
  }

  async update(
    id: string,
    organizationId: string,
    updateVehicleDto: UpdateVehicleDto,
  ) {
    this.logger.logWithFields('info', 'Updating vehicle', {
      vehicleId: id,
      organizationId,
    });

    try {
      // First verify the vehicle exists and belongs to the organization
      await this.findOne(id, organizationId);

      // If locationId is being updated, verify new location belongs to organization
      if (updateVehicleDto.locationId) {
        const location = await this.prisma.location.findFirst({
          where: {
            id: updateVehicleDto.locationId,
            organizationId,
          },
        });

        if (!location) {
          this.logger.warn('New location not found or does not belong to organization', {
            locationId: updateVehicleDto.locationId,
            organizationId,
          });
          throw new BadRequestException(
            'Location not found or does not belong to your organization',
          );
        }
      }

      // If VIN is being updated, check for duplicates
      if (updateVehicleDto.vin) {
        const existingVehicle = await this.prisma.vehicle.findFirst({
          where: {
            vin: updateVehicleDto.vin,
            NOT: { id },
          },
        });

        if (existingVehicle) {
          this.logger.warn('VIN already exists', {
            vin: updateVehicleDto.vin,
          });
          throw new ConflictException(
            `Vehicle with VIN ${updateVehicleDto.vin} already exists`,
          );
        }
      }

      const vehicle = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...updateVehicleDto,
        },
        include: {
          location: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Vehicle updated successfully', {
        vehicleId: id,
        organizationId,
      });

      return vehicle;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to update vehicle', String(error), {
        vehicleId: id,
        organizationId,
        dto: updateVehicleDto,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    this.logger.logWithFields('info', 'Soft deleting vehicle', {
      vehicleId: id,
      organizationId,
    });

    try {
      // First verify the vehicle exists and belongs to the organization
      await this.findOne(id, organizationId);

      // Check for active bookings
      const activeBookings = await this.prisma.booking.count({
        where: {
          vehicleId: id,
          status: {
            in: ['pending', 'confirmed', 'active'],
          },
        },
      });

      if (activeBookings > 0) {
        this.logger.warn('Cannot delete vehicle with active bookings', {
          vehicleId: id,
          organizationId,
          activeBookings,
        });
        throw new BadRequestException(
          `Cannot delete vehicle with ${activeBookings} active booking(s). Please complete or cancel bookings first.`,
        );
      }

      // Soft delete by setting isAvailableForRent to false
      await this.prisma.vehicle.update({
        where: { id },
        data: {
          isAvailableForRent: false,
        },
      });

      this.logger.logWithFields('info', 'Vehicle soft deleted successfully', {
        vehicleId: id,
        organizationId,
      });

      return { message: 'Vehicle removed from available inventory' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to delete vehicle', String(error), {
        vehicleId: id,
        organizationId,
      });
      throw error;
    }
  }

  async checkAvailability(
    organizationId: string,
    checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    const { vehicleId, startDate, endDate } = checkAvailabilityDto;

    this.logger.logWithFields('debug', 'Checking vehicle availability', {
      vehicleId,
      organizationId,
      startDate,
      endDate,
    });

    try {
      // Verify vehicle exists and belongs to organization
      const vehicle = await this.findOne(vehicleId, organizationId);

      // Check if vehicle is available for rent
      if (!vehicle.isAvailableForRent) {
        return {
          available: false,
          reason: 'Vehicle is not available for rent',
        };
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate date range
      if (start >= end) {
        throw new BadRequestException('Start date must be before end date');
      }

      // Check for conflicting bookings
      const conflictingBookings = await this.prisma.booking.count({
        where: {
          vehicleId,
          status: {
            in: ['pending', 'confirmed', 'active'],
          },
          OR: [
            // Booking starts during the requested period
            {
              pickupDatetime: {
                gte: start,
                lt: end,
              },
            },
            // Booking ends during the requested period
            {
              dropoffDatetime: {
                gt: start,
                lte: end,
              },
            },
            // Booking encompasses the entire requested period
            {
              AND: [
                { pickupDatetime: { lte: start } },
                { dropoffDatetime: { gte: end } },
              ],
            },
          ],
        },
      });

      const available = conflictingBookings === 0;

      this.logger.logWithFields('debug', 'Availability check complete', {
        vehicleId,
        organizationId,
        available,
        conflictingBookings,
      });

      return {
        available,
        reason: available ? null : 'Vehicle is booked for the requested dates',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to check availability', String(error), {
        organizationId,
        dto: checkAvailabilityDto,
      });
      throw error;
    }
  }

  async addImages(
    vehicleId: string,
    organizationId: string,
    files: Array<{ filename: string; size: number; mimetype: string }>,
  ) {
    this.logger.logWithFields('info', 'Adding images to vehicle', {
      vehicleId,
      organizationId,
      fileCount: files.length,
    });

    try {
      // Verify ownership
      const vehicle = await this.findOne(vehicleId, organizationId);

      // Generate URLs
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const newUrls = files.map(
        (f) => `${baseUrl}/uploads/vehicles/${f.filename}`,
      );

      // Update vehicle
      const updated = await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          imageUrls: [...(vehicle.imageUrls || []), ...newUrls],
        },
      });

      this.logger.logWithFields('info', 'Images added successfully', {
        vehicleId,
        organizationId,
        imageCount: newUrls.length,
      });

      return { imageUrls: updated.imageUrls };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to add images', String(error), {
        vehicleId,
        organizationId,
        fileCount: files.length,
      });
      throw error;
    }
  }

  async deleteImage(
    vehicleId: string,
    organizationId: string,
    imageUrl: string,
  ) {
    this.logger.logWithFields('info', 'Deleting image from vehicle', {
      vehicleId,
      organizationId,
      imageUrl,
    });

    try {
      const vehicle = await this.findOne(vehicleId, organizationId);

      // Remove from array
      const updated = await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          imageUrls: (vehicle.imageUrls || []).filter(
            (url) => url !== imageUrl,
          ),
        },
      });

      // Delete file from disk
      try {
        const fs = require('fs');
        const path = require('path');
        const filename = imageUrl.split('/').pop();
        const filePath = path.join('./uploads/vehicles', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.logWithFields('debug', 'File deleted from disk', {
            filePath,
          });
        }
      } catch (fileError) {
        this.logger.error('Failed to delete file from disk', String(fileError), {
          imageUrl,
        });
        // Continue even if file deletion fails
      }

      this.logger.logWithFields('info', 'Image deleted successfully', {
        vehicleId,
        organizationId,
      });

      return { imageUrls: updated.imageUrls };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete image', String(error), {
        vehicleId,
        organizationId,
        imageUrl,
      });
      throw error;
    }
  }

  async reorderImages(
    vehicleId: string,
    organizationId: string,
    newOrder: string[],
  ) {
    this.logger.logWithFields('info', 'Reordering vehicle images', {
      vehicleId,
      organizationId,
      imageCount: newOrder.length,
    });

    try {
      // Verify ownership
      await this.findOne(vehicleId, organizationId);

      const updated = await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { imageUrls: newOrder },
      });

      this.logger.logWithFields('info', 'Images reordered successfully', {
        vehicleId,
        organizationId,
      });

      return { imageUrls: updated.imageUrls };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to reorder images', String(error), {
        vehicleId,
        organizationId,
      });
      throw error;
    }
  }
}
