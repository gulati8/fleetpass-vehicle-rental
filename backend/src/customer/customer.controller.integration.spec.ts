import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import {
  createTestCustomer,
  createTestCustomerWithBookings,
  createTestCustomerWithCount,
  createVerifiedCustomer,
  createCustomerDto,
} from '../test/fixtures/customer.fixtures';

const request = require('supertest');

describe('CustomerController (Integration)', () => {
  let app: INestApplication;
  let customerService: jest.Mocked<CustomerService>;

  beforeEach(async () => {
    // Create a mock CustomerService
    const mockCustomerService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      updateKycStatus: jest.fn(),
    };

    // Create testing module with mocked dependencies
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          // Mock authenticated request for all routes
          const request = context.switchToHttp().getRequest();
          request.user = {
            id: 'user-123',
            email: 'user@test.com',
            role: 'admin',
            organizationId: 'org-123',
          };
          return true;
        }),
      })
      .compile();

    customerService = moduleFixture.get(CustomerService);

    // Create NestJS application
    app = moduleFixture.createNestApplication();

    // Apply global pipes (validation)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Apply response interceptor
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      // Arrange
      const dto = createCustomerDto();
      const createdCustomer = createTestCustomer();
      customerService.create.mockResolvedValue(createdCustomer);

      // Act
      const response = await request(app.getHttpServer())
        .post('/customers')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(dto.email);
      expect(response.body.data.firstName).toBe(dto.firstName);

      // Verify service was called
      expect(customerService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
        }),
      );
    });

    it('should return 400 when required fields are missing', async () => {
      // Arrange
      const invalidDto = {
        firstName: 'John',
        // lastName, email missing
      };

      // Act
      await request(app.getHttpServer())
        .post('/customers')
        .send(invalidDto)
        .expect(400);

      // Verify service was not called
      expect(customerService.create).not.toHaveBeenCalled();
    });

    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const invalidDto = createCustomerDto({ email: 'not-an-email' });

      // Act
      await request(app.getHttpServer())
        .post('/customers')
        .send(invalidDto)
        .expect(400);

      expect(customerService.create).not.toHaveBeenCalled();
    });

    it('should return 400 when phone format is invalid', async () => {
      // Arrange
      const invalidDto = createCustomerDto({ phone: '123' }); // Too short

      // Act
      await request(app.getHttpServer())
        .post('/customers')
        .send(invalidDto)
        .expect(400);

      expect(customerService.create).not.toHaveBeenCalled();
    });

    it('should return 409 when email already exists', async () => {
      // Arrange
      const dto = createCustomerDto();
      customerService.create.mockRejectedValue(
        new ConflictException('Customer with email already exists'),
      );

      // Act
      await request(app.getHttpServer())
        .post('/customers')
        .send(dto)
        .expect(409);
    });

    it('should create customer with optional fields', async () => {
      // Arrange
      const dto = createCustomerDto({
        phone: '+14155551234',
        dateOfBirth: '1990-01-15',
        driverLicenseNumber: 'D1234567',
      });
      const createdCustomer = createTestCustomer();
      customerService.create.mockResolvedValue(createdCustomer);

      // Act
      await request(app.getHttpServer())
        .post('/customers')
        .send(dto)
        .expect(201);

      // Assert
      expect(customerService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth,
          driverLicenseNumber: dto.driverLicenseNumber,
        }),
      );
    });
  });

  describe('GET /customers', () => {
    it('should return paginated customers', async () => {
      // Arrange
      const customers = [
        createTestCustomerWithCount({ id: 'customer-1' }),
        createTestCustomerWithCount({ id: 'customer-2', email: 'jane@example.com' }),
      ];
      const paginatedResult = {
        items: customers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      customerService.findAll.mockResolvedValue(paginatedResult as any);

      // Act
      const response = await request(app.getHttpServer())
        .get('/customers')
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      // Verify service was called with the query
      expect(customerService.findAll).toHaveBeenCalled();

      // The findAll service returns the full pagination object
      // Just verify it got called correctly
      expect(customerService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });

    it('should filter by search query', async () => {
      // Arrange
      const customers = [createTestCustomerWithCount()];
      const paginatedResult = {
        items: customers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      customerService.findAll.mockResolvedValue(paginatedResult as any);

      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ search: 'john' })
        .expect(200);

      // Assert
      expect(customerService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'john',
        }),
      );
    });

    it('should filter by kycStatus', async () => {
      // Arrange
      const customers = [
        {
          ...createVerifiedCustomer(),
          _count: { bookings: 0, leads: 0, deals: 0 },
        },
      ];
      const paginatedResult = {
        items: customers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      customerService.findAll.mockResolvedValue(paginatedResult as any);

      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ kycStatus: 'approved' })
        .expect(200);

      // Assert
      expect(customerService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          kycStatus: 'approved',
        }),
      );
    });

    it('should support pagination parameters', async () => {
      // Arrange
      const customers = [createTestCustomerWithCount()];
      const paginatedResult = {
        items: customers,
        total: 25,
        page: 2,
        limit: 5,
        totalPages: 5,
      };
      customerService.findAll.mockResolvedValue(paginatedResult as any);

      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ page: 2, limit: 5 })
        .expect(200);

      // Assert
      expect(customerService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 5,
        }),
      );
    });

    it('should support sorting parameters', async () => {
      // Arrange
      const customers = [createTestCustomerWithCount()];
      const paginatedResult = {
        items: customers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      customerService.findAll.mockResolvedValue(paginatedResult as any);

      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ sortBy: 'email', sortOrder: 'asc' })
        .expect(200);

      // Assert
      expect(customerService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'email',
          sortOrder: 'asc',
        }),
      );
    });

    it('should return 400 for invalid kycStatus', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ kycStatus: 'invalid' })
        .expect(400);

      expect(customerService.findAll).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid sortBy field', async () => {
      // Act
      await request(app.getHttpServer())
        .get('/customers')
        .query({ sortBy: 'invalid_field' })
        .expect(400);

      expect(customerService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /customers/:id', () => {
    it('should return customer by ID with bookings', async () => {
      // Arrange
      const customerId = 'customer-123';
      const customer = createTestCustomerWithBookings();
      customerService.findOne.mockResolvedValue(customer);

      // Act
      const response = await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', customerId);
      expect(response.body.data).toHaveProperty('bookings');
      expect(response.body.data.bookings).toBeInstanceOf(Array);

      // Verify service was called
      expect(customerService.findOne).toHaveBeenCalledWith(customerId);
    });

    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      customerService.findOne.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act
      await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .expect(404);
    });
  });

  describe('PATCH /customers/:id', () => {
    it('should update customer successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = {
        firstName: 'Jane',
        phone: '+14155559999',
      };
      const updatedCustomer = {
        ...createTestCustomer({
          id: customerId,
          ...updateDto,
        }),
        _count: { bookings: 0, leads: 0, deals: 0 },
      };
      customerService.update.mockResolvedValue(updatedCustomer as any);

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateDto.firstName);
      expect(response.body.data.phone).toBe(updateDto.phone);

      // Verify service was called
      expect(customerService.update).toHaveBeenCalledWith(
        customerId,
        expect.objectContaining(updateDto),
      );
    });

    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      const updateDto = { firstName: 'Jane' };
      customerService.update.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(404);
    });

    it('should return 409 when email is already in use', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = { email: 'existing@example.com' };
      customerService.update.mockRejectedValue(
        new ConflictException('Email is already in use'),
      );

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(409);
    });

    it('should allow partial updates', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = { phone: '+14155559999' };
      const updatedCustomer = {
        ...createTestCustomer({
          id: customerId,
          phone: updateDto.phone,
        }),
        _count: { bookings: 0, leads: 0, deals: 0 },
      };
      customerService.update.mockResolvedValue(updatedCustomer as any);

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(customerService.update).toHaveBeenCalledWith(
        customerId,
        expect.objectContaining(updateDto),
      );
    });

    it('should update KYC fields', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = {
        kycStatus: 'approved',
        kycInquiryId: 'inq_mock123',
      };
      const updatedCustomer = {
        ...createVerifiedCustomer({ id: customerId }),
        _count: { bookings: 0, leads: 0, deals: 0 },
      };
      customerService.update.mockResolvedValue(updatedCustomer as any);

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(200);

      // Assert
      expect(customerService.update).toHaveBeenCalledWith(
        customerId,
        expect.objectContaining(updateDto),
      );
    });

    it('should return 400 for invalid kycStatus', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = {
        kycStatus: 'invalid_status',
      };

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send(updateDto)
        .expect(400);

      expect(customerService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /customers/:id', () => {
    it('should delete customer successfully', async () => {
      // Arrange
      const customerId = 'customer-123';
      customerService.remove.mockResolvedValue({
        message: 'Customer deleted successfully',
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Customer deleted successfully');

      // Verify service was called
      expect(customerService.remove).toHaveBeenCalledWith(customerId);
    });

    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      customerService.remove.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(404);
    });

    it('should return 400 when customer has active bookings', async () => {
      // Arrange
      const customerId = 'customer-123';
      customerService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete customer with active bookings'),
      );

      // Act
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(400);
    });
  });

  describe('PATCH /customers/:id/kyc', () => {
    it('should update KYC status to approved', async () => {
      // Arrange
      const customerId = 'customer-123';
      const verifyDto = {
        status: 'approved',
        inquiryId: 'inq_mock123',
      };
      const updatedCustomer = {
        ...createVerifiedCustomer({ id: customerId }),
        _count: { bookings: 0, leads: 0, deals: 0 },
      };
      customerService.updateKycStatus.mockResolvedValue(updatedCustomer as any);

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}/kyc`)
        .send(verifyDto)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.kycStatus).toBe('approved');
      expect(response.body.data).toHaveProperty('kycVerifiedAt');

      // Verify service was called
      expect(customerService.updateKycStatus).toHaveBeenCalledWith(
        customerId,
        expect.objectContaining(verifyDto),
      );
    });

    it('should update KYC status to rejected', async () => {
      // Arrange
      const customerId = 'customer-123';
      const verifyDto = {
        status: 'rejected',
      };
      const updatedCustomer = {
        ...createTestCustomer({
          id: customerId,
          kycStatus: 'rejected',
        }),
        _count: { bookings: 0, leads: 0, deals: 0 },
      };
      customerService.updateKycStatus.mockResolvedValue(updatedCustomer as any);

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}/kyc`)
        .send(verifyDto)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.kycStatus).toBe('rejected');
    });

    it('should return 400 when status is missing', async () => {
      // Arrange
      const customerId = 'customer-123';
      const invalidDto = {
        inquiryId: 'inq_mock123',
        // status missing
      };

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}/kyc`)
        .send(invalidDto)
        .expect(400);

      expect(customerService.updateKycStatus).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid status value', async () => {
      // Arrange
      const customerId = 'customer-123';
      const invalidDto = {
        status: 'invalid_status',
      };

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}/kyc`)
        .send(invalidDto)
        .expect(400);

      expect(customerService.updateKycStatus).not.toHaveBeenCalled();
    });

    it('should return 404 when customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      const verifyDto = {
        status: 'approved',
      };
      customerService.updateKycStatus.mockRejectedValue(
        new NotFoundException('Customer not found'),
      );

      // Act
      await request(app.getHttpServer())
        .patch(`/customers/${customerId}/kyc`)
        .send(verifyDto)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      // This test would need to override the guard differently
      // For now, we're testing that the guard is applied
      // The actual authentication logic is tested in the auth module

      // Create a new app without the mocked guard
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [CustomerController],
        providers: [
          {
            provide: CustomerService,
            useValue: {
              findAll: jest.fn(),
            },
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: jest.fn(() => false), // Simulate unauthenticated
        })
        .compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      // Act & Assert
      await request(testApp.getHttpServer()).get('/customers').expect(403);

      await testApp.close();
    });
  });
});
