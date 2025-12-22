import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  mockBooking,
  mockCustomer,
  mockVehicle,
  mockLocation,
} from '../test/fixtures/booking.fixtures';

describe('BookingService', () => {
  let service: BookingService;
  let prisma: PrismaService;
  const ORG_ID = 'org-1';

  const mockPrismaService = {
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    // Suppress logs during tests
    jest.spyOn(LoggerService.prototype, 'logWithFields').mockImplementation();
    jest.spyOn(LoggerService.prototype, 'warn').mockImplementation();
    jest.spyOn(LoggerService.prototype, 'error').mockImplementation();

    service = module.get<BookingService>(BookingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      pickupLocationId: 'location-1',
      dropoffLocationId: 'location-1',
      pickupDatetime: '2024-01-01T10:00:00Z',
      dropoffDatetime: '2024-01-05T10:00:00Z',
    };

    it('should create a booking successfully', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        organizationId: ORG_ID,
      });
      mockPrismaService.location.findFirst.mockResolvedValue({
        ...mockLocation,
        organizationId: ORG_ID,
      });
      mockPrismaService.booking.count.mockResolvedValue(0); // No conflicts
      mockPrismaService.booking.findFirst.mockResolvedValue(null); // For booking number generation
      mockPrismaService.booking.create.mockResolvedValue({
        ...mockBooking,
        customer: mockCustomer,
        vehicle: mockVehicle,
      });

      const result = await service.create(createDto, ORG_ID);

      expect(result).toBeDefined();
      expect(mockPrismaService.booking.create).toHaveBeenCalled();
    });

    it('should throw error if pickup date is after dropoff date', async () => {
      const invalidDto = {
        ...createDto,
        pickupDatetime: '2024-01-05T10:00:00Z',
        dropoffDatetime: '2024-01-01T10:00:00Z',
      };

      await expect(service.create(invalidDto, ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if vehicle not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if vehicle is not available for rent', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        organizationId: ORG_ID,
        isAvailableForRent: false,
      });
      mockPrismaService.location.findFirst.mockResolvedValue({
        ...mockLocation,
        organizationId: ORG_ID,
      });

      await expect(service.create(createDto, ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if vehicle has conflicting bookings', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        organizationId: ORG_ID,
      });
      mockPrismaService.location.findFirst.mockResolvedValue({
        ...mockLocation,
        organizationId: ORG_ID,
      });
      mockPrismaService.booking.count.mockResolvedValue(1); // Conflict found

      await expect(service.create(createDto, ORG_ID)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated bookings', async () => {
      const mockBookings = [mockBooking];
      mockPrismaService.$transaction.mockResolvedValue([mockBookings, 1]);

      const result = await service.findAll({}, ORG_ID);

      expect(result.items).toEqual(mockBookings);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by customer ID', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ customerId: 'customer-1' }, ORG_ID);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockPrismaService.$transaction.mockResolvedValue([[], 0]);

      await service.findAll({ status: 'confirmed' }, ORG_ID);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a booking by ID', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });

      const result = await service.findOne('booking-1', ORG_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-1');
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      notes: 'Updated notes',
    };

    it('should update booking successfully', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        ...updateDto,
      });

      const result = await service.update('booking-1', updateDto, ORG_ID);

      expect(result.notes).toBe('Updated notes');
      expect(mockPrismaService.booking.update).toHaveBeenCalled();
    });

    it('should re-validate availability when dates change', async () => {
      const dateUpdateDto = {
        pickupDatetime: '2024-02-01T10:00:00Z',
        dropoffDatetime: '2024-02-05T10:00:00Z',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.count.mockResolvedValue(0); // No conflicts
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        ...dateUpdateDto,
      });

      await service.update('booking-1', dateUpdateDto, ORG_ID);

      expect(mockPrismaService.booking.count).toHaveBeenCalled();
    });

    it('should throw error if new dates have conflicts', async () => {
      const dateUpdateDto = {
        pickupDatetime: '2024-02-01T10:00:00Z',
        dropoffDatetime: '2024-02-05T10:00:00Z',
      };

      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.count.mockResolvedValue(1); // Conflict

      await expect(
        service.update('booking-1', dateUpdateDto, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should cancel a pending booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'pending',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'cancelled',
      });

      const result = await service.remove('booking-1', ORG_ID);

      expect(result.message).toBe('Booking cancelled successfully');
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'cancelled' },
      });
    });

    it('should not allow cancelling active bookings', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'active',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });

      await expect(service.remove('booking-1', ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirm', () => {
    it('should confirm a pending booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'pending',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'confirmed',
        customer: mockCustomer,
        vehicle: mockVehicle,
      });

      const result = await service.confirm('booking-1', ORG_ID);

      expect(result.status).toBe('confirmed');
    });

    it('should not allow confirming non-pending bookings', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'confirmed',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });

      await expect(service.confirm('booking-1', ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a confirmed booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'confirmed',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'active',
        customer: mockCustomer,
        vehicle: mockVehicle,
      });

      const result = await service.activate('booking-1', ORG_ID);

      expect(result.status).toBe('active');
    });

    it('should not allow activating non-confirmed bookings', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'pending',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });

      await expect(service.activate('booking-1', ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete an active booking', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'active',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: 'completed',
        customer: mockCustomer,
        vehicle: mockVehicle,
      });

      const result = await service.complete('booking-1', ORG_ID);

      expect(result.status).toBe('completed');
    });

    it('should not allow completing non-active bookings', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        organizationId: ORG_ID,
        status: 'confirmed',
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      });

      await expect(service.complete('booking-1', ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
