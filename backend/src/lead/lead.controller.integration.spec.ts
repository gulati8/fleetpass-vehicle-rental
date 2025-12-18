import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { LeadModule } from './lead.module';

const request = require('supertest');
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { mockLead, mockLeadWithRelations, mockUser } from '../test/fixtures/lead.fixtures';
import { mockCustomer, mockVehicle } from '../test/fixtures/booking.fixtures';

describe('LeadController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const mockPrismaService = {
    lead: {
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
    user: {
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
      imports: [LeadModule],
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

  describe('POST /leads', () => {
    it('should create a new lead', async () => {
      const createDto = {
        customerId: 'customer-123',
        customerEmail: 'john.doe@example.com',
        customerName: 'John Doe',
        source: 'website',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.lead.create.mockResolvedValue(mockLeadWithRelations);

      const response = await request(app.getHttpServer())
        .post('/leads')
        .send(createDto)
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.id).toBe('lead-123');
    });

    it('should return 400 if customer not found', async () => {
      const createDto = {
        customerId: 'customer-999',
        customerEmail: 'john.doe@example.com',
        customerName: 'John Doe',
        source: 'website',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/leads')
        .send(createDto)
        .expect(400);
    });

    it('should return 400 if validation fails', async () => {
      const invalidDto = {
        customerEmail: 'not-an-email',
      };

      await request(app.getHttpServer())
        .post('/leads')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /leads', () => {
    it('should return paginated leads', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      const response = await request(app.getHttpServer())
        .get('/leads?page=1&limit=10')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.items).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should filter leads by status', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await request(app.getHttpServer())
        .get('/leads?status=new')
        .expect(200);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter leads by source', async () => {
      const mockLeads = [mockLeadWithRelations];
      mockPrismaService.$transaction.mockResolvedValue([mockLeads, 1]);

      await request(app.getHttpServer())
        .get('/leads?source=website')
        .expect(200);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('GET /leads/:id', () => {
    it('should return a lead by ID', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);

      const response = await request(app.getHttpServer())
        .get('/leads/lead-123')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.id).toBe('lead-123');
    });

    it('should return 404 if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/leads/lead-999')
        .expect(404);
    });
  });

  describe('PATCH /leads/:id', () => {
    it('should update a lead', async () => {
      const updateDto = {
        customerName: 'Updated Name',
        status: 'contacted',
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLeadWithRelations,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .patch('/leads/lead-123')
        .send(updateDto)
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.customerName).toBe('Updated Name');
    });

    it('should return 404 if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/leads/lead-999')
        .send({ customerName: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /leads/:id', () => {
    it('should delete a lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);
      mockPrismaService.lead.delete.mockResolvedValue(mockLead);

      const response = await request(app.getHttpServer())
        .delete('/leads/lead-123')
        .expect(200);

      const data = response.body.data || response.body;
      expect(data.message).toBe('Lead deleted successfully');
    });

    it('should return 404 if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/leads/lead-999')
        .expect(404);
    });
  });

  describe('POST /leads/:id/assign', () => {
    it('should assign a lead to a user', async () => {
      const assignDto = { assignedToId: 'user-123' };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.lead.update.mockResolvedValue({
        ...mockLeadWithRelations,
        assignedToId: 'user-123',
      });

      const response = await request(app.getHttpServer())
        .post('/leads/lead-123/assign')
        .send(assignDto)
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.assignedToId).toBe('user-123');
    });

    it('should return 400 if user not found', async () => {
      const assignDto = { assignedToId: 'user-999' };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/leads/lead-123/assign')
        .send(assignDto)
        .expect(400);
    });
  });

  describe('POST /leads/:id/convert', () => {
    it('should convert a lead to a deal', async () => {
      const convertDto = {
        dealValueCents: 3000000,
        vehicleId: 'vehicle-123',
        notes: 'Converted',
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLeadWithRelations);
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          deal: {
            create: jest.fn().mockResolvedValue({
              id: 'deal-123',
              customerId: 'customer-123',
              vehicleId: 'vehicle-123',
              dealValueCents: 3000000,
              status: 'pending',
            }),
          },
          lead: {
            update: jest.fn().mockResolvedValue({
              ...mockLeadWithRelations,
              status: 'converted',
            }),
          },
        });
      });

      const response = await request(app.getHttpServer())
        .post('/leads/lead-123/convert')
        .send(convertDto)
        .expect(201);

      const data = response.body.data || response.body;
      expect(data.lead.status).toBe('converted');
      expect(data.deal).toBeDefined();
    });

    it('should return 409 if lead already converted', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        ...mockLeadWithRelations,
        status: 'converted',
      });

      await request(app.getHttpServer())
        .post('/leads/lead-123/convert')
        .send({
          dealValueCents: 3000000,
          vehicleId: 'vehicle-123',
        })
        .expect(409);
    });
  });
});
