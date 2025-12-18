import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DealModule } from './deal.module';

const request = require('supertest');
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { mockDeal, mockDealWithRelations, mockLead } from '../test/fixtures/lead.fixtures';
import { mockCustomer, mockVehicle } from '../test/fixtures/booking.fixtures';

describe('DealController (Integration)', () => {
  let app: INestApplication;
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

  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        sub: 'user-123',
        email: 'user@test.com',
        organizationId: 'org-123',
      };
      return true;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DealModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /deals', () => {
    it('should create a new deal', async () => {
      const createDto = {
        leadId: 'lead-123',
        customerId: 'customer-123',
        vehicleId: 'vehicle-123',
        dealValueCents: 3000000,
        notes: 'Standard deal',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.deal.create.mockResolvedValue(mockDealWithRelations);

      const response = await request(app.getHttpServer())
        .post('/deals')
        .send(createDto)
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.id).toBe('deal-123');
    });

    it('should return 400 if customer not found', async () => {
      const createDto = {
        customerId: 'customer-999',
        vehicleId: 'vehicle-123',
        dealValueCents: 3000000,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/deals')
        .send(createDto)
        .expect(400);
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = {
        customerId: 'customer-123',
        vehicleId: 'vehicle-123',
        dealValueCents: -100, // Invalid: negative value
      };

      await request(app.getHttpServer())
        .post('/deals')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /deals', () => {
    it('should return paginated deals', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      const response = await request(app.getHttpServer())
        .get('/deals?page=1&limit=10')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.items).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter deals by status', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      await request(app.getHttpServer())
        .get('/deals?status=pending')
        .expect(200);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter deals by leadId', async () => {
      const mockDeals = [mockDealWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockDeals, 1]);

      await request(app.getHttpServer())
        .get('/deals?leadId=lead-123')
        .expect(200);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('GET /deals/:id', () => {
    it('should return a deal by ID', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);

      const response = await request(app.getHttpServer())
        .get('/deals/deal-123')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.id).toBe('deal-123');
    });

    it('should return 404 if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/deals/deal-999')
        .expect(404);
    });
  });

  describe('PATCH /deals/:id', () => {
    it('should update a deal', async () => {
      const updateDto = {
        dealValueCents: 3500000,
        notes: 'Updated deal',
      };

      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .patch('/deals/deal-123')
        .send(updateDto)
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.dealValueCents).toBe(3500000);
    });

    it('should return 404 if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/deals/deal-999')
        .send({ dealValueCents: 3500000 })
        .expect(404);
    });
  });

  describe('DELETE /deals/:id', () => {
    it('should delete a deal', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.delete.mockResolvedValue(mockDeal);

      const response = await request(app.getHttpServer())
        .delete('/deals/deal-123')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.message).toBe('Deal deleted successfully');
    });

    it('should return 404 if deal not found', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/deals/deal-999')
        .expect(404);
    });
  });

  describe('POST /deals/:id/win', () => {
    it('should mark a deal as won', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_won',
        closedAt: new Date(),
        closedById: 'user-123',
      });

      const response = await request(app.getHttpServer())
        .post('/deals/deal-123/win')
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.status).toBe('closed_won');
      expect(data.closedAt).toBeDefined();
    });

    it('should return 400 if deal is not pending', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_lost',
      });

      await request(app.getHttpServer())
        .post('/deals/deal-123/win')
        .expect(400);
    });
  });

  describe('POST /deals/:id/lose', () => {
    it('should mark a deal as lost', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue(mockDealWithRelations);
      mockPrismaService.deal.update.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_lost',
        closedAt: new Date(),
        closedById: 'user-123',
      });

      const response = await request(app.getHttpServer())
        .post('/deals/deal-123/lose')
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.status).toBe('closed_lost');
      expect(data.closedAt).toBeDefined();
    });

    it('should return 400 if deal is not pending', async () => {
      mockPrismaService.deal.findUnique.mockResolvedValue({
        ...mockDealWithRelations,
        status: 'closed_won',
      });

      await request(app.getHttpServer())
        .post('/deals/deal-123/lose')
        .expect(400);
    });
  });
});
