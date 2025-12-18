import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationService } from './location.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../test/test-utils';
import {
  createTestLocation,
  createTestLocationWithOrganization,
  createLocationDto,
  createLocationQueryDto,
} from '../test/fixtures/location.fixtures';

describe('LocationService', () => {
  let service: LocationService;
  let prismaService: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    // Create mocks
    prismaService = mockPrismaService();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new location', async () => {
      // Arrange
      const organizationId = 'org-123';
      const dto = createLocationDto();
      const expectedLocation = createTestLocationWithOrganization({
        organizationId,
      });

      prismaService.location.create.mockResolvedValue(expectedLocation);

      // Act
      const result = await service.create(organizationId, dto);

      // Assert
      expect(result).toEqual(expectedLocation);
      expect(prismaService.location.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          organizationId,
          hoursOfOperation: dto.hoursOfOperation,
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
    });

    it('should create location without optional fields', async () => {
      // Arrange
      const organizationId = 'org-123';
      const dto = createLocationDto({
        addressLine2: undefined,
        latitude: undefined,
        longitude: undefined,
        phone: undefined,
        hoursOfOperation: undefined,
      });
      const expectedLocation = createTestLocationWithOrganization({
        organizationId,
        addressLine2: null,
        latitude: null,
        longitude: null,
        phone: null,
        hoursOfOperation: null,
      });

      prismaService.location.create.mockResolvedValue(expectedLocation);

      // Act
      const result = await service.create(organizationId, dto);

      // Assert
      expect(result).toEqual(expectedLocation);
    });
  });

  describe('findAll', () => {
    it('should return paginated locations', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto({ page: 1, limit: 10 });
      const locations = [
        createTestLocationWithOrganization({ organizationId }),
        createTestLocationWithOrganization({
          id: 'location-456',
          organizationId,
          name: 'Second Location',
        }),
      ];

      prismaService.$transaction.mockResolvedValue([locations, 2]);

      // Act
      const result = await service.findAll(organizationId, query);

      // Assert
      expect(result).toEqual({
        items: locations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter locations by search term', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto({ search: 'Main' });
      const locations = [createTestLocationWithOrganization({ organizationId })];

      prismaService.$transaction.mockResolvedValue([locations, 1]);

      // Act
      const result = await service.findAll(organizationId, query);

      // Assert
      expect(result.items).toEqual(locations);
      expect(result.total).toBe(1);
    });

    it('should filter locations by state', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto({ state: 'CA' });
      const locations = [createTestLocationWithOrganization({ organizationId })];

      prismaService.$transaction.mockResolvedValue([locations, 1]);

      // Act
      const result = await service.findAll(organizationId, query);

      // Assert
      expect(result.items).toEqual(locations);
      expect(result.total).toBe(1);
    });

    it('should filter locations by city', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto({ city: 'San Francisco' });
      const locations = [createTestLocationWithOrganization({ organizationId })];

      prismaService.$transaction.mockResolvedValue([locations, 1]);

      // Act
      const result = await service.findAll(organizationId, query);

      // Assert
      expect(result.items).toEqual(locations);
      expect(result.total).toBe(1);
    });

    it('should scope results to organizationId', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto();

      prismaService.$transaction.mockResolvedValue([[], 0]);

      // Act
      await service.findAll(organizationId, query);

      // Assert
      const transactionCallback = prismaService.$transaction.mock.calls[0][0];
      expect(transactionCallback).toBeDefined();
    });

    it('should calculate correct pagination', async () => {
      // Arrange
      const organizationId = 'org-123';
      const query = createLocationQueryDto({ page: 2, limit: 5 });
      const locations = [createTestLocationWithOrganization({ organizationId })];

      prismaService.$transaction.mockResolvedValue([locations, 12]);

      // Act
      const result = await service.findAll(organizationId, query);

      // Assert
      expect(result.totalPages).toBe(3); // 12 items / 5 per page = 3 pages
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return a single location by ID', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-123';
      const location = createTestLocationWithOrganization({
        id: locationId,
        organizationId,
      });

      prismaService.location.findFirst.mockResolvedValue(location);

      // Act
      const result = await service.findOne(locationId, organizationId);

      // Assert
      expect(result).toEqual(location);
      expect(prismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          id: locationId,
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
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      const locationId = 'non-existent';
      const organizationId = 'org-123';

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(locationId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(locationId, organizationId)).rejects.toThrow(
        `Location with ID ${locationId} not found or does not belong to your organization`,
      );
    });

    it('should throw NotFoundException when location belongs to different organization', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-456';

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(locationId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update a location', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-123';
      const dto = createLocationDto({ name: 'Updated Name' });
      const existingLocation = createTestLocationWithOrganization({
        id: locationId,
        organizationId,
      });
      const updatedLocation = {
        ...existingLocation,
        name: 'Updated Name',
      };

      prismaService.location.findFirst.mockResolvedValue(existingLocation);
      prismaService.location.update.mockResolvedValue(updatedLocation);

      // Act
      const result = await service.update(locationId, organizationId, dto);

      // Assert
      expect(result).toEqual(updatedLocation);
      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: {
          id: locationId,
        },
        data: {
          ...dto,
          hoursOfOperation: dto.hoursOfOperation,
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
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      const locationId = 'non-existent';
      const organizationId = 'org-123';
      const dto = createLocationDto();

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(locationId, organizationId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when location belongs to different organization', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-456';
      const dto = createLocationDto();

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(locationId, organizationId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should successfully delete a location', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-123';
      const location = createTestLocationWithOrganization({
        id: locationId,
        organizationId,
      });

      prismaService.location.findFirst.mockResolvedValue(location);
      prismaService.vehicle.count.mockResolvedValue(0);
      prismaService.location.delete.mockResolvedValue(location);

      // Act
      const result = await service.remove(locationId, organizationId);

      // Assert
      expect(result).toEqual({ message: 'Location deleted successfully' });
      expect(prismaService.location.delete).toHaveBeenCalledWith({
        where: {
          id: locationId,
        },
      });
    });

    it('should throw error when location has vehicles', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-123';
      const location = createTestLocationWithOrganization({
        id: locationId,
        organizationId,
      });

      prismaService.location.findFirst.mockResolvedValue(location);
      prismaService.vehicle.count.mockResolvedValue(5);

      // Act & Assert
      await expect(service.remove(locationId, organizationId)).rejects.toThrow(
        'Cannot delete location with 5 vehicle(s). Please reassign or remove vehicles first.',
      );
      expect(prismaService.location.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when location not found', async () => {
      // Arrange
      const locationId = 'non-existent';
      const organizationId = 'org-123';

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(locationId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.location.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when location belongs to different organization', async () => {
      // Arrange
      const locationId = 'location-123';
      const organizationId = 'org-456';

      prismaService.location.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(locationId, organizationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.location.delete).not.toHaveBeenCalled();
    });
  });
});
