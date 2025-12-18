import { Test, TestingModule } from '@nestjs/testing';
import { DealService } from './deal.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  mockDeal,
  mockDealWithRelations,
  mockLead,
  mockUser,
} from '../test/fixtures/lead.fixtures';
import { mockCustomer, mockVehicle } from '../test/fixtures/booking.fixtures';

describe('DealService', () => {
  let service: DealService;
  let prisma: PrismaService;

  const mockPrismaService = {
    deal: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealService,
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

    service = module.get<DealService>(DealService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      leadId: 'lead-123',
      customerId: 'customer-123',
      vehicleId: 'vehicle-123',
      dealValueCents: 3000000,
      notes: 'Standard deal',
    };

    it('should create a deal successfully', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.deal.create.mockResolvedValue(mockDealWithRelations);

      const result = await service.create(createDto, 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('deal-123');
      expect(mockPrismaService.deal.create).toHaveBeenCalledWith({
        data: {
          leadId: createDto.leadId,
          customerId: createDto.customerId,
          vehicleId: createDto.vehicleId,
          dealValueCents: createDto.dealValueCents,
          notes: createDto.notes,
          status: 'pending',
        },
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if vehicle not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if lead not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create deal without leadId', async () => {
      const dtoWithoutLead = {
        customerId: 'customer-123',
        vehicleId: 'vehicle-123',
        dealValueCents: 3000000,
      };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.deal.create.mockResolvedValue({
        ...mockDealWithRelations,
        leadId: null,
      });

      const result = await service.create(dtoWithoutLead);

      expect(result).toBeDefined();
      expect(mockPrismaService.deal.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated deals', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockDeals,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      await service.findAll({ status: 'pending', page: 1, limit: 10 });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by leadId', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      await service.findAll({ leadId: 'lead-123', page: 1, limit: 10 });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should search by customer name/email', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      await service.findAll({ search: 'john', page: 1, limit: 10 });

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a deal by ID', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);

      const result = await service.findOne('deal-123');

      expect(result).toEqual(mockDealWithRelations);
      expect(mockPrismaService.deal.findUnique).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await expect(service.findOne('deal-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      dealValueCents: 3500000,
      notes: 'Updated deal',
    };

    it('should update a deal successfully', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        ...updateDto,
      });

      const result = await service.update('deal-123', updateDto);

      expect(result.dealValueCents).toBe(3500000);
      expect(result.notes).toBe('Updated deal');
    });

    it('should throw NotFoundException if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await expect(service.update('deal-999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate status transitions', async () => {
      const invalidUpdate = { status: 'pending' };
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_won',
      });

      await expect(service.update('deal-123', invalidUpdate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if customer not found when updating customerId', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update('deal-123', { customerId: 'customer-999' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if vehicle not found when updating vehicleId', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);

      await expect(
        service.update('deal-123', { vehicleId: 'vehicle-999' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if lead not found when updating leadId', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(
        service.update('deal-123', { leadId: 'lead-999' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete a deal successfully', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.delete.mockResolvedValue(mockDeal);

      const result = await service.remove('deal-123');

      expect(result).toEqual({ message: 'Deal deleted successfully' });
      expect(mockPrismaService.deal.delete).toHaveBeenCalledWith({
        where: { id: 'deal-123' },
      });
    });

    it('should throw NotFoundException if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await expect(service.remove('deal-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('win', () => {
    it('should mark a deal as won successfully', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_won',
        closedAt: new Date(),
        closedById: 'user-123',
      });

      const result = await service.win('deal-123', 'user-123');

      expect(result.status).toBe('closed_won');
      expect(result.closedAt).toBeDefined();
      expect(result.closedById).toBe('user-123');
    });

    it('should throw NotFoundException if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await expect(service.win('deal-999', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if deal is not pending', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_lost',
      });

      await expect(service.win('deal-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('lose', () => {
    it('should mark a deal as lost successfully', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_lost',
        closedAt: new Date(),
        closedById: 'user-123',
      });

      const result = await service.lose('deal-123', 'user-123');

      expect(result.status).toBe('closed_lost');
      expect(result.closedAt).toBeDefined();
      expect(result.closedById).toBe('user-123');
    });

    it('should throw NotFoundException if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await expect(service.lose('deal-999', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if deal is not pending', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_won',
      });

      await expect(service.lose('deal-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
