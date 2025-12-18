import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createTestVehicle,
  createTestVehicleWithLocation,
  createVehicleDto,
  createVehicleQueryDto,
  createCheckAvailabilityDto,
  createTestVehicles,
} from '../test/fixtures/vehicle.fixtures';
import { createTestLocation } from '../test/fixtures/location.fixtures';

describe('VehicleService', () => {
  let service: VehicleService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    location: {
      findFirst: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a vehicle successfully', async () => {
      const orgId = 'org-123';
      const dto = createVehicleDto();
      const location = createTestLocation();
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.location.findFirst.mockResolvedValue(location);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);
      mockPrismaService.vehicle.create.mockResolvedValue(vehicle);

      const result = await service.create(orgId, dto);

      expect(result).toEqual(vehicle);
      expect(mockPrismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          id: dto.locationId,
          organizationId: orgId,
        },
      });
      expect(mockPrismaService.vehicle.findUnique).toHaveBeenCalledWith({
        where: { vin: dto.vin },
      });
      expect(mockPrismaService.vehicle.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if location does not belong to organization', async () => {
      const orgId = 'org-123';
      const dto = createVehicleDto();

      mockPrismaService.location.findFirst.mockResolvedValue(null);

      await expect(service.create(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.vehicle.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if VIN already exists', async () => {
      const orgId = 'org-123';
      const dto = createVehicleDto();
      const location = createTestLocation();
      const existingVehicle = createTestVehicle();

      mockPrismaService.location.findFirst.mockResolvedValue(location);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(existingVehicle);

      await expect(service.create(orgId, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated vehicles', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto();
      const vehicles = [
        createTestVehicleWithLocation(),
        createTestVehicleWithLocation({ id: 'vehicle-456' }),
      ];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 2]);

      const result = await service.findAll(orgId, query);

      expect(result).toEqual({
        items: vehicles,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by search query (make)', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ search: 'Toyota' });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      const result = await service.findAll(orgId, query);

      expect(result.items).toEqual(vehicles);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by locationId', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ locationId: 'location-123' });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by make', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ make: 'Toyota' });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by bodyType', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ bodyType: 'sedan' });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by fuelType', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ fuelType: 'electric' });
      const vehicles = [
        createTestVehicleWithLocation({ fuelType: 'electric' }),
      ];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by transmission', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ transmission: 'automatic' });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by isAvailableForRent', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ isAvailableForRent: true });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by price range', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({
        minDailyRate: 4000,
        maxDailyRate: 6000,
      });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by year range', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ minYear: 2020, maxYear: 2024 });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should apply sorting', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({
        sortBy: 'dailyRateCents',
        sortOrder: 'asc',
      });
      const vehicles = [createTestVehicleWithLocation()];

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 1]);

      await service.findAll(orgId, query);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const orgId = 'org-123';
      const query = createVehicleQueryDto({ page: 2, limit: 5 });
      const vehicles = createTestVehicles(5);

      mockPrismaService.$transaction.mockResolvedValue([vehicles, 15]);

      const result = await service.findAll(orgId, query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should return a vehicle by ID', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);

      const result = await service.findOne(vehicleId, orgId);

      expect(result).toEqual(vehicle);
      expect(mockPrismaService.vehicle.findFirst).toHaveBeenCalledWith({
        where: {
          id: vehicleId,
          location: {
            organizationId: orgId,
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
    });

    it('should throw NotFoundException if vehicle not found', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-999';

      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne(vehicleId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if vehicle belongs to different organization', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';

      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne(vehicleId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a vehicle successfully', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const existingVehicle = createTestVehicleWithLocation();
      const updateDto = { dailyRateCents: 6000 };
      const updatedVehicle = { ...existingVehicle, ...updateDto };

      mockPrismaService.vehicle.findFirst.mockResolvedValue(existingVehicle);
      mockPrismaService.vehicle.update.mockResolvedValue(updatedVehicle);

      const result = await service.update(vehicleId, orgId, updateDto);

      expect(result).toEqual(updatedVehicle);
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: vehicleId },
        data: updateDto,
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
    });

    it('should verify new location belongs to organization when updating locationId', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const existingVehicle = createTestVehicleWithLocation();
      const newLocation = createTestLocation({ id: 'location-456' });
      const updateDto = { locationId: 'location-456' };

      mockPrismaService.vehicle.findFirst.mockResolvedValue(existingVehicle);
      mockPrismaService.location.findFirst.mockResolvedValue(newLocation);
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...existingVehicle,
        ...updateDto,
      });

      await service.update(vehicleId, orgId, updateDto);

      expect(mockPrismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          id: updateDto.locationId,
          organizationId: orgId,
        },
      });
    });

    it('should throw BadRequestException if new location does not belong to organization', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const existingVehicle = createTestVehicleWithLocation();
      const updateDto = { locationId: 'location-456' };

      mockPrismaService.vehicle.findFirst.mockResolvedValue(existingVehicle);
      mockPrismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.update(vehicleId, orgId, updateDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.vehicle.update).not.toHaveBeenCalled();
    });

    it('should check for duplicate VIN when updating VIN', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const existingVehicle = createTestVehicleWithLocation();
      const updateDto = { vin: '1HGBH41JXMN109999' };
      const duplicateVehicle = createTestVehicle({ id: 'vehicle-456' });

      mockPrismaService.vehicle.findFirst
        .mockResolvedValueOnce(existingVehicle)
        .mockResolvedValueOnce(duplicateVehicle);

      await expect(
        service.update(vehicleId, orgId, updateDto),
      ).rejects.toThrow(ConflictException);
      expect(mockPrismaService.vehicle.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if vehicle does not exist', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-999';
      const updateDto = { dailyRateCents: 6000 };

      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.update(vehicleId, orgId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a vehicle successfully', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrismaService.booking.count.mockResolvedValue(0);
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...vehicle,
        isAvailableForRent: false,
      });

      const result = await service.remove(vehicleId, orgId);

      expect(result).toEqual({
        message: 'Vehicle removed from available inventory',
      });
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: vehicleId },
        data: {
          isAvailableForRent: false,
        },
      });
    });

    it('should throw BadRequestException if vehicle has active bookings', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-123';
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrismaService.booking.count.mockResolvedValue(2);

      await expect(service.remove(vehicleId, orgId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.vehicle.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if vehicle does not exist', async () => {
      const orgId = 'org-123';
      const vehicleId = 'vehicle-999';

      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.remove(vehicleId, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkAvailability', () => {
    it('should return available when no conflicting bookings', async () => {
      const orgId = 'org-123';
      const dto = createCheckAvailabilityDto();
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrismaService.booking.count.mockResolvedValue(0);

      const result = await service.checkAvailability(orgId, dto);

      expect(result).toEqual({
        available: true,
        reason: null,
      });
    });

    it('should return not available when vehicle has conflicting bookings', async () => {
      const orgId = 'org-123';
      const dto = createCheckAvailabilityDto();
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);
      mockPrismaService.booking.count.mockResolvedValue(1);

      const result = await service.checkAvailability(orgId, dto);

      expect(result).toEqual({
        available: false,
        reason: 'Vehicle is booked for the requested dates',
      });
    });

    it('should return not available when vehicle is not available for rent', async () => {
      const orgId = 'org-123';
      const dto = createCheckAvailabilityDto();
      const vehicle = createTestVehicleWithLocation({
        isAvailableForRent: false,
      });

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);

      const result = await service.checkAvailability(orgId, dto);

      expect(result).toEqual({
        available: false,
        reason: 'Vehicle is not available for rent',
      });
      expect(mockPrismaService.booking.count).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if start date is after end date', async () => {
      const orgId = 'org-123';
      const dto = createCheckAvailabilityDto({
        startDate: '2024-06-10T10:00:00Z',
        endDate: '2024-06-05T10:00:00Z',
      });
      const vehicle = createTestVehicleWithLocation();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(vehicle);

      await expect(service.checkAvailability(orgId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if vehicle does not exist', async () => {
      const orgId = 'org-123';
      const dto = createCheckAvailabilityDto();

      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.checkAvailability(orgId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
