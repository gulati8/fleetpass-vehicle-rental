import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';

@Injectable()
export class BookingService {
  private readonly logger = new LoggerService('BookingService');
  private readonly DEFAULT_DEPOSIT_CENTS = 10000; // $100.00 default deposit
  private readonly TAX_RATE = 0.0; // 0% tax for simplicity

  constructor(private prisma: PrismaService) {}

  /**
   * Generate unique booking number in format: BP-YYYY-NNNNNN
   */
  private async generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `BP-${year}-`;

    // Find the latest booking number for this year
    const latestBooking = await this.prisma.booking.findFirst({
      where: {
        bookingNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        bookingNumber: 'desc',
      },
    });

    let sequence = 1;
    if (latestBooking) {
      // Extract sequence number (BP-2024-000123 -> 123)
      const parts = latestBooking.bookingNumber.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2], 10) + 1;
      }
    }

    const sequenceStr = sequence.toString().padStart(6, '0');
    return `${prefix}${sequenceStr}`;
  }

  /**
   * Calculate rental duration in days (ceiling)
   */
  private calculateNumDays(pickupDate: Date, dropoffDate: Date): number {
    const diffMs = dropoffDate.getTime() - pickupDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.ceil(diffHours / 24);
  }

  /**
   * Check if vehicle is available for the given date range
   */
  private async checkVehicleAvailability(
    vehicleId: string,
    pickupDate: Date,
    dropoffDate: Date,
    excludeBookingId?: string,
  ): Promise<boolean> {
    const whereClause: any = {
      vehicleId,
      status: {
        in: ['pending', 'confirmed', 'active'],
      },
      OR: [
        // Booking starts during the requested period
        {
          pickupDatetime: {
            gte: pickupDate,
            lt: dropoffDate,
          },
        },
        // Booking ends during the requested period
        {
          dropoffDatetime: {
            gt: pickupDate,
            lte: dropoffDate,
          },
        },
        // Booking encompasses the entire requested period
        {
          AND: [
            { pickupDatetime: { lte: pickupDate } },
            { dropoffDatetime: { gte: dropoffDate } },
          ],
        },
      ],
    };

    // Exclude current booking when updating
    if (excludeBookingId) {
      whereClause.NOT = { id: excludeBookingId };
    }

    const conflictingBookings = await this.prisma.booking.count({
      where: whereClause,
    });

    return conflictingBookings === 0;
  }

  async create(createBookingDto: CreateBookingDto) {
    this.logger.logWithFields('info', 'Creating new booking', {
      customerId: createBookingDto.customerId,
      vehicleId: createBookingDto.vehicleId,
    });

    try {
      // Parse dates
      const pickupDate = new Date(createBookingDto.pickupDatetime);
      const dropoffDate = new Date(createBookingDto.dropoffDatetime);

      // Validate date range
      if (pickupDate >= dropoffDate) {
        throw new BadRequestException('Pickup date must be before dropoff date');
      }

      // Validate customer exists
      const customer = await this.prisma.customer.findUnique({
        where: { id: createBookingDto.customerId },
      });

      if (!customer) {
        this.logger.warn('Customer not found', {
          customerId: createBookingDto.customerId,
        });
        throw new BadRequestException('Customer not found');
      }

      // Validate vehicle exists
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createBookingDto.vehicleId },
      });

      if (!vehicle) {
        this.logger.warn('Vehicle not found', {
          vehicleId: createBookingDto.vehicleId,
        });
        throw new BadRequestException('Vehicle not found');
      }

      // Check if vehicle is available for rent
      if (!vehicle.isAvailableForRent) {
        throw new BadRequestException('Vehicle is not available for rent');
      }

      // Validate pickup location exists
      const pickupLocation = await this.prisma.location.findUnique({
        where: { id: createBookingDto.pickupLocationId },
      });

      if (!pickupLocation) {
        this.logger.warn('Pickup location not found', {
          locationId: createBookingDto.pickupLocationId,
        });
        throw new BadRequestException('Pickup location not found');
      }

      // Validate dropoff location exists
      const dropoffLocation = await this.prisma.location.findUnique({
        where: { id: createBookingDto.dropoffLocationId },
      });

      if (!dropoffLocation) {
        this.logger.warn('Dropoff location not found', {
          locationId: createBookingDto.dropoffLocationId,
        });
        throw new BadRequestException('Dropoff location not found');
      }

      // Check vehicle availability for date range
      const isAvailable = await this.checkVehicleAvailability(
        createBookingDto.vehicleId,
        pickupDate,
        dropoffDate,
      );

      if (!isAvailable) {
        throw new ConflictException(
          'Vehicle is not available for the requested dates',
        );
      }

      // Calculate pricing
      const numDays = this.calculateNumDays(pickupDate, dropoffDate);
      const dailyRateCents = vehicle.dailyRateCents;
      const subtotalCents = numDays * dailyRateCents;
      const taxCents = Math.round(subtotalCents * this.TAX_RATE);
      const totalCents = subtotalCents + taxCents;
      const depositCents = createBookingDto.depositCents ?? this.DEFAULT_DEPOSIT_CENTS;

      // Generate unique booking number
      const bookingNumber = await this.generateBookingNumber();

      const booking = await this.prisma.booking.create({
        data: {
          bookingNumber,
          customerId: createBookingDto.customerId,
          vehicleId: createBookingDto.vehicleId,
          pickupLocationId: createBookingDto.pickupLocationId,
          dropoffLocationId: createBookingDto.dropoffLocationId,
          pickupDatetime: pickupDate,
          dropoffDatetime: dropoffDate,
          dailyRateCents,
          numDays,
          subtotalCents,
          taxCents,
          totalCents,
          depositCents,
          notes: createBookingDto.notes,
          status: 'pending',
        },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              vin: true,
              dailyRateCents: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Booking created successfully', {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
      });

      return booking;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to create booking', String(error), {
        dto: createBookingDto,
      });
      throw error;
    }
  }

  async findAll(query: BookingQueryDto) {
    const {
      search,
      customerId,
      vehicleId,
      pickupLocationId,
      status,
      pickupFrom,
      pickupTo,
      page = 1,
      limit = 10,
      sortBy = 'pickupDatetime',
      sortOrder = 'asc',
    } = query;

    this.logger.logWithFields('debug', 'Finding bookings', { query });

    try {
      // Build where clause
      const where: any = {};

      // Search filter (booking number, customer name, vehicle)
      if (search) {
        where.OR = [
          { bookingNumber: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
          {
            vehicle: {
              OR: [
                { make: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } },
                { vin: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      // Filter by customer
      if (customerId) {
        where.customerId = customerId;
      }

      // Filter by vehicle
      if (vehicleId) {
        where.vehicleId = vehicleId;
      }

      // Filter by pickup location
      if (pickupLocationId) {
        where.pickupLocationId = pickupLocationId;
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by pickup date range
      if (pickupFrom || pickupTo) {
        where.pickupDatetime = {};
        if (pickupFrom) {
          where.pickupDatetime.gte = new Date(pickupFrom);
        }
        if (pickupTo) {
          where.pickupDatetime.lte = new Date(pickupTo);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                make: true,
                model: true,
                year: true,
                vin: true,
                dailyRateCents: true,
              },
            },
          },
        }),
        this.prisma.booking.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Bookings retrieved', {
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
      this.logger.error('Failed to find bookings', String(error), { query });
      throw error;
    }
  }

  async findOne(id: string) {
    this.logger.logWithFields('debug', 'Finding booking by ID', {
      bookingId: id,
    });

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          customer: true,
          vehicle: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!booking) {
        this.logger.warn('Booking not found', { bookingId: id });
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      this.logger.logWithFields('debug', 'Booking retrieved', { bookingId: id });

      return booking;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find booking', String(error), {
        bookingId: id,
      });
      throw error;
    }
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    this.logger.logWithFields('info', 'Updating booking', { bookingId: id });

    try {
      // Verify booking exists
      const existingBooking = await this.findOne(id);

      // If dates are being updated, re-check availability
      if (updateBookingDto.pickupDatetime || updateBookingDto.dropoffDatetime) {
        const pickupDate = updateBookingDto.pickupDatetime
          ? new Date(updateBookingDto.pickupDatetime)
          : existingBooking.pickupDatetime;
        const dropoffDate = updateBookingDto.dropoffDatetime
          ? new Date(updateBookingDto.dropoffDatetime)
          : existingBooking.dropoffDatetime;

        // Validate date range
        if (pickupDate >= dropoffDate) {
          throw new BadRequestException('Pickup date must be before dropoff date');
        }

        // Check availability (excluding current booking)
        const isAvailable = await this.checkVehicleAvailability(
          existingBooking.vehicleId,
          pickupDate,
          dropoffDate,
          id,
        );

        if (!isAvailable) {
          throw new ConflictException(
            'Vehicle is not available for the requested dates',
          );
        }

        // Recalculate pricing if dates changed
        const numDays = this.calculateNumDays(pickupDate, dropoffDate);
        const subtotalCents = numDays * existingBooking.dailyRateCents;
        const taxCents = Math.round(subtotalCents * this.TAX_RATE);
        const totalCents = subtotalCents + taxCents;

        updateBookingDto = {
          ...updateBookingDto,
          pickupDatetime: pickupDate.toISOString(),
          dropoffDatetime: dropoffDate.toISOString(),
        } as any;

        // Add recalculated values
        (updateBookingDto as any).numDays = numDays;
        (updateBookingDto as any).subtotalCents = subtotalCents;
        (updateBookingDto as any).taxCents = taxCents;
        (updateBookingDto as any).totalCents = totalCents;
      }

      // If customer is being changed, validate
      if (updateBookingDto.customerId) {
        const customer = await this.prisma.customer.findUnique({
          where: { id: updateBookingDto.customerId },
        });

        if (!customer) {
          throw new BadRequestException('Customer not found');
        }
      }

      // If vehicle is being changed, validate
      if (updateBookingDto.vehicleId) {
        const vehicle = await this.prisma.vehicle.findUnique({
          where: { id: updateBookingDto.vehicleId },
        });

        if (!vehicle) {
          throw new BadRequestException('Vehicle not found');
        }
      }

      // If pickup location is being changed, validate
      if (updateBookingDto.pickupLocationId) {
        const location = await this.prisma.location.findUnique({
          where: { id: updateBookingDto.pickupLocationId },
        });

        if (!location) {
          throw new BadRequestException('Pickup location not found');
        }
      }

      // If dropoff location is being changed, validate
      if (updateBookingDto.dropoffLocationId) {
        const location = await this.prisma.location.findUnique({
          where: { id: updateBookingDto.dropoffLocationId },
        });

        if (!location) {
          throw new BadRequestException('Dropoff location not found');
        }
      }

      // Build update data
      const updateData: any = { ...updateBookingDto };

      // Convert date strings to Date objects
      if (updateBookingDto.pickupDatetime) {
        updateData.pickupDatetime = new Date(updateBookingDto.pickupDatetime);
      }
      if (updateBookingDto.dropoffDatetime) {
        updateData.dropoffDatetime = new Date(updateBookingDto.dropoffDatetime);
      }
      if (updateBookingDto.depositPaidAt) {
        updateData.depositPaidAt = new Date(updateBookingDto.depositPaidAt);
      }

      // Log status changes
      if (updateBookingDto.status && updateBookingDto.status !== existingBooking.status) {
        this.logger.logWithFields('info', 'Booking status changing', {
          bookingId: id,
          oldStatus: existingBooking.status,
          newStatus: updateBookingDto.status,
        });
      }

      const booking = await this.prisma.booking.update({
        where: { id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              year: true,
              vin: true,
              dailyRateCents: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Booking updated successfully', {
        bookingId: id,
      });

      return booking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to update booking', String(error), {
        bookingId: id,
        dto: updateBookingDto,
      });
      throw error;
    }
  }

  async remove(id: string) {
    this.logger.logWithFields('info', 'Cancelling booking', { bookingId: id });

    try {
      // Verify booking exists
      const booking = await this.findOne(id);

      // Can only cancel pending or confirmed bookings
      if (!['pending', 'confirmed'].includes(booking.status)) {
        throw new BadRequestException(
          `Cannot cancel booking with status '${booking.status}'. Only pending or confirmed bookings can be cancelled.`,
        );
      }

      await this.prisma.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
      });

      this.logger.logWithFields('info', 'Booking cancelled successfully', {
        bookingId: id,
      });

      return { message: 'Booking cancelled successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to cancel booking', String(error), {
        bookingId: id,
      });
      throw error;
    }
  }

  async confirm(id: string) {
    this.logger.logWithFields('info', 'Confirming booking', { bookingId: id });

    try {
      const booking = await this.findOne(id);

      if (booking.status !== 'pending') {
        throw new BadRequestException(
          `Cannot confirm booking with status '${booking.status}'. Only pending bookings can be confirmed.`,
        );
      }

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          status: 'confirmed',
        },
        include: {
          customer: true,
          vehicle: true,
        },
      });

      this.logger.logWithFields('info', 'Booking confirmed successfully', {
        bookingId: id,
      });

      return updatedBooking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to confirm booking', String(error), {
        bookingId: id,
      });
      throw error;
    }
  }

  async activate(id: string) {
    this.logger.logWithFields('info', 'Activating booking', { bookingId: id });

    try {
      const booking = await this.findOne(id);

      if (booking.status !== 'confirmed') {
        throw new BadRequestException(
          `Cannot activate booking with status '${booking.status}'. Only confirmed bookings can be activated.`,
        );
      }

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          status: 'active',
        },
        include: {
          customer: true,
          vehicle: true,
        },
      });

      this.logger.logWithFields('info', 'Booking activated successfully', {
        bookingId: id,
      });

      return updatedBooking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to activate booking', String(error), {
        bookingId: id,
      });
      throw error;
    }
  }

  async complete(id: string) {
    this.logger.logWithFields('info', 'Completing booking', { bookingId: id });

    try {
      const booking = await this.findOne(id);

      if (booking.status !== 'active') {
        throw new BadRequestException(
          `Cannot complete booking with status '${booking.status}'. Only active bookings can be completed.`,
        );
      }

      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: {
          status: 'completed',
        },
        include: {
          customer: true,
          vehicle: true,
        },
      });

      this.logger.logWithFields('info', 'Booking completed successfully', {
        bookingId: id,
      });

      return updatedBooking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to complete booking', String(error), {
        bookingId: id,
      });
      throw error;
    }
  }

  async cancel(id: string) {
    // Reuse the remove method which handles cancellation logic
    return this.remove(id);
  }
}
