import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from './lead.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  mockLead,
  mockLeadWithRelations,
  mockUser,
  mockDealWithRelations,
} from '../test/fixtures/lead.fixtures';
import { mockCustomer, mockVehicle } from '../test/fixtures/booking.fixtures';

describe('LeadService', () => {
  let service: LeadService;
  let prisma: PrismaService;
  const ORG_ID = 'org-1';

  const mockPrismaService = {
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    vehicle: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    deal: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
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

    service = module.get<LeadService>(LeadService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      customerId: 'customer-123',
      customerEmail: 'john.doe@example.com',
      customerName: 'John Doe',
      customerPhone: '+1234567890',
      source: 'website',
      notes: 'Interested in SUVs',
    };

    it('should create a lead successfully', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.lead.create.mockResolvedValue(mockLeadWithRelations);

      const result = await service.create(createDto, 'user-456', ORG_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe('lead-123');
      expect(mockPrismaService.lead.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          createdById: 'user-456',
          organizationId: ORG_ID,
          status: 'new',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if customer not found', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, 'user-456', ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vehicle not found', async () => {
      const dtoWithVehicle = {
        ...createDto,
        vehicleInterestId: 'vehicle-999',
      };
      mockPrismaService.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.create(dtoWithVehicle, 'user-456', ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create lead without customerId', async () => {
      const dtoWithoutCustomer = {
        customerEmail: 'new.lead@example.com',
        customerName: 'New Lead',
        source: 'phone',
      };
      mockPrismaService.lead.create.mockResolvedValue({
        ...mockLeadWithRelations,
        customerId: null,
      });

      const result = await service.create(dtoWithoutCustomer, 'user-456', ORG_ID);

      expect(result).toBeDefined();
      expect(mockPrismaService.lead.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated leads', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      const result = await service.findAll({ page: 1, limit: 10 }, ORG_ID);

      expect(result).toEqual({
        items: mockLeads,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await service.findAll({ status: 'new', page: 1, limit: 10 }, ORG_ID);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      const [findManyCall] = mockPrismaService.$transaction.mock.calls[0][0];
      // Transaction passes array of promises, we need to check the actual calls
    });

    it('should filter by source', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await service.findAll({ source: 'website', page: 1, limit: 10 }, ORG_ID);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by assignedToId', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await service.findAll(
        { assignedToId: 'user-123', page: 1, limit: 10 },
        ORG_ID,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should search by customer name/email/phone', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await service.findAll({ search: 'john', page: 1, limit: 10 }, ORG_ID);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a lead by ID', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });

      const result = await service.findOne('lead-123', ORG_ID);

      expect(result).toEqual({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      expect(mockPrismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.findOne('lead-999', ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      customerName: 'Updated Name',
      status: 'contacted',
    };

    it('should update a lead successfully', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLeadWithRelations,
        ...updateDto,
      });

      const result = await service.update('lead-123', updateDto, ORG_ID);

      expect(result.customerName).toBe('Updated Name');
      expect(result.status).toBe('contacted');
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.update('lead-999', updateDto, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate status transitions', async () => {
      const invalidUpdate = { status: 'new' };
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
        status: 'converted',
      });

      await expect(
        service.update('lead-123', invalidUpdate, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid status transitions', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
        status: 'new',
      });
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLeadWithRelations,
        status: 'contacted',
      });

      const result = await service.update(
        'lead-123',
        { status: 'contacted' },
        ORG_ID,
      );

      expect(result.status).toBe('contacted');
    });

    it('should throw BadRequestException if customer not found when updating customerId', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update('lead-123', { customerId: 'customer-999' }, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vehicle not found when updating vehicleInterestId', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'lead-123',
          { vehicleInterestId: 'vehicle-999' },
          ORG_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a lead successfully', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.lead.delete.mockResolvedValue(mockLead);

      const result = await service.remove('lead-123', ORG_ID);

      expect(result).toEqual({ message: 'Lead deleted successfully' });
      expect(mockPrismaService.lead.delete).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
      });
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.remove('lead-999', ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assign', () => {
    const assignDto = { assignedToId: 'user-123' };

    it('should assign a lead to a user successfully', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        organizationId: ORG_ID,
      });
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLeadWithRelations,
        assignedToId: 'user-123',
      });

      const result = await service.assign('lead-123', assignDto, ORG_ID);

      expect(result.assignedToId).toBe('user-123');
      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-123' },
        data: { assignedToId: 'user-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.assign('lead-999', assignDto, ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign('lead-123', assignDto, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is inactive', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        organizationId: ORG_ID,
        isActive: false,
      });

      await expect(
        service.assign('lead-123', assignDto, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('convert', () => {
    const convertDto = {
      dealValueCents: 3000000,
      vehicleId: 'vehicle-123',
      notes: 'Converted to deal',
    };

    it('should convert a lead to a deal successfully', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        organizationId: ORG_ID,
      });
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          deal: {
            create: jest.fn().mockResolvedValue(mockDealWithRelations),
          },
          lead: {
            update: jest.fn().mockResolvedValue({
              ...mockLeadWithRelations,
              status: 'converted',
            }),
          },
        });
      });

      const result = await service.convert('lead-123', convertDto, ORG_ID);

      expect(result).toBeDefined();
      expect(result.lead.status).toBe('converted');
      expect(result.deal).toBeDefined();
    });

    it('should throw ConflictException if lead already converted', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
        status: 'converted',
      });

      await expect(
        service.convert('lead-123', convertDto, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if lead is lost', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
        status: 'lost',
      });

      await expect(
        service.convert('lead-123', convertDto, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vehicle not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.convert('lead-123', convertDto, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if lead has no customer', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        organizationId: ORG_ID,
        customerId: null,
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        ...mockVehicle,
        organizationId: ORG_ID,
      });

      await expect(
        service.convert('lead-123', convertDto, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
