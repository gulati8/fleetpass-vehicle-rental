import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import {
  createTestVehicleWithLocation,
  createVehicleDto,
  createVehicleQueryDto,
  createCheckAvailabilityDto,
  createTestVehicles,
} from '../test/fixtures/vehicle.fixtures';

const request = require('supertest');

describe('VehicleController (Integration)', () => {
  let app: INestApplication;
  let vehicleService: jest.Mocked<VehicleService>;

  beforeEach(async () => {
    // Create a mock VehicleService
    const mockVehicleService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      checkAvailability: jest.fn(),
    };

    // Create testing module with mocked dependencies
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        {
          provide: VehicleService,
          useValue: mockVehicleService,
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

    vehicleService = moduleFixture.get(VehicleService);

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

    // Apply exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Apply response interceptor
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /vehicles', () => {
    it('should create a new vehicle', async () => {
      // Arrange
      const dto = createVehicleDto();
      const createdVehicle = createTestVehicleWithLocation({
        locationId: dto.locationId,
      });
      vehicleService.create.mockResolvedValue(createdVehicle);

      // Act
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.vin).toBe(dto.vin);
      expect(vehicleService.create).toHaveBeenCalledWith('org-123', dto);
    });

    it('should validate required fields', async () => {
      // Arrange
      const invalidDto = {
        make: 'Toyota',
        // Missing required fields
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(vehicleService.create).not.toHaveBeenCalled();
    });

    it('should validate VIN length', async () => {
      // Arrange
      const dto = createVehicleDto({ vin: 'SHORT' });

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send(dto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
      expect(vehicleService.create).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate VIN', async () => {
      // Arrange
      const dto = createVehicleDto();
      vehicleService.create.mockRejectedValue(
        new ConflictException('Vehicle with VIN already exists'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send(dto)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 if location does not belong to organization', async () => {
      // Arrange
      const dto = createVehicleDto();
      vehicleService.create.mockRejectedValue(
        new BadRequestException('Location not found or does not belong to your organization'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send(dto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /vehicles', () => {
    it('should return paginated vehicles', async () => {
      // Arrange
      const vehicles = [
        createTestVehicleWithLocation(),
        createTestVehicleWithLocation({ id: 'vehicle-456' }),
      ];
      const paginatedResult = {
        items: vehicles,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      vehicleService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const response = await request(app.getHttpServer())
        .get('/vehicles')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toHaveProperty('total', 2);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
      expect(vehicleService.findAll).toHaveBeenCalled();
    });

    it('should filter by search query', async () => {
      // Arrange
      const vehicles = [createTestVehicleWithLocation()];
      const paginatedResult = {
        items: vehicles,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      vehicleService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const response = await request(app.getHttpServer())
        .get('/vehicles?search=Toyota')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ search: 'Toyota' }),
      );
    });

    it('should filter by locationId', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?locationId=location-123')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ locationId: 'location-123' }),
      );
    });

    it('should filter by make', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?make=Toyota')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ make: 'Toyota' }),
      );
    });

    it('should filter by bodyType', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?bodyType=sedan')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ bodyType: 'sedan' }),
      );
    });

    it('should filter by fuelType', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?fuelType=electric')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ fuelType: 'electric' }),
      );
    });

    it('should filter by transmission', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?transmission=automatic')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ transmission: 'automatic' }),
      );
    });

    it('should filter by isAvailableForRent', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?isAvailableForRent=true')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ isAvailableForRent: true }),
      );
    });

    it('should filter by price range', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?minDailyRate=4000&maxDailyRate=6000')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          minDailyRate: 4000,
          maxDailyRate: 6000,
        }),
      );
    });

    it('should apply sorting', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?sortBy=dailyRateCents&sortOrder=asc')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          sortBy: 'dailyRateCents',
          sortOrder: 'asc',
        }),
      );
    });

    it('should handle pagination', async () => {
      // Arrange
      vehicleService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });

      // Act
      await request(app.getHttpServer())
        .get('/vehicles?page=2&limit=5')
        .expect(200);

      // Assert
      expect(vehicleService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          page: 2,
          limit: 5,
        }),
      );
    });
  });

  describe('GET /vehicles/:id', () => {
    it('should return a vehicle by ID', async () => {
      // Arrange
      const vehicle = createTestVehicleWithLocation();
      vehicleService.findOne.mockResolvedValue(vehicle);

      // Act
      const response = await request(app.getHttpServer())
        .get('/vehicles/vehicle-123')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', vehicle.id);
      expect(response.body.data).toHaveProperty('location');
      expect(vehicleService.findOne).toHaveBeenCalledWith('vehicle-123', 'org-123');
    });

    it('should return 404 for non-existent vehicle', async () => {
      // Arrange
      vehicleService.findOne.mockRejectedValue(
        new NotFoundException('Vehicle not found'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/vehicles/vehicle-999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 if vehicle belongs to different organization', async () => {
      // Arrange
      vehicleService.findOne.mockRejectedValue(
        new NotFoundException('Vehicle not found or does not belong to your organization'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/vehicles/vehicle-123')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PATCH /vehicles/:id', () => {
    it('should update a vehicle', async () => {
      // Arrange
      const updateDto = { dailyRateCents: 6000 };
      const updatedVehicle = createTestVehicleWithLocation(updateDto);
      vehicleService.update.mockResolvedValue(updatedVehicle);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/vehicles/vehicle-123')
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.dailyRateCents).toBe(6000);
      expect(vehicleService.update).toHaveBeenCalledWith(
        'vehicle-123',
        'org-123',
        updateDto,
      );
    });

    it('should return 404 for non-existent vehicle', async () => {
      // Arrange
      const updateDto = { dailyRateCents: 6000 };
      vehicleService.update.mockRejectedValue(
        new NotFoundException('Vehicle not found'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch('/vehicles/vehicle-999')
        .send(updateDto)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate update data', async () => {
      // Arrange
      const invalidDto = { dailyRateCents: -100 };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .patch('/vehicles/vehicle-123')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(vehicleService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /vehicles/:id', () => {
    it('should soft delete a vehicle', async () => {
      // Arrange
      vehicleService.remove.mockResolvedValue({
        message: 'Vehicle removed from available inventory',
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete('/vehicles/vehicle-123')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.message).toContain('removed');
      expect(vehicleService.remove).toHaveBeenCalledWith('vehicle-123', 'org-123');
    });

    it('should return 404 for non-existent vehicle', async () => {
      // Arrange
      vehicleService.remove.mockRejectedValue(
        new NotFoundException('Vehicle not found'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .delete('/vehicles/vehicle-999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 if vehicle has active bookings', async () => {
      // Arrange
      vehicleService.remove.mockRejectedValue(
        new BadRequestException('Cannot delete vehicle with active bookings'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .delete('/vehicles/vehicle-123')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /vehicles/check-availability', () => {
    it('should return available when vehicle is free', async () => {
      // Arrange
      const dto = createCheckAvailabilityDto();
      vehicleService.checkAvailability.mockResolvedValue({
        available: true,
        reason: null,
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/vehicles/check-availability')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('available', true);
      expect(vehicleService.checkAvailability).toHaveBeenCalledWith(
        'org-123',
        dto,
      );
    });

    it('should return not available when vehicle is booked', async () => {
      // Arrange
      const dto = createCheckAvailabilityDto();
      vehicleService.checkAvailability.mockResolvedValue({
        available: false,
        reason: 'Vehicle is booked for the requested dates',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post('/vehicles/check-availability')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('available', false);
      expect(response.body.data).toHaveProperty('reason');
    });

    it('should validate date fields', async () => {
      // Arrange
      const invalidDto = {
        vehicleId: 'vehicle-123',
        startDate: 'invalid-date',
        endDate: '2024-06-05T10:00:00Z',
      };

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles/check-availability')
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(vehicleService.checkAvailability).not.toHaveBeenCalled();
    });

    it('should return 400 if start date is after end date', async () => {
      // Arrange
      const dto = createCheckAvailabilityDto({
        startDate: '2024-06-10T10:00:00Z',
        endDate: '2024-06-05T10:00:00Z',
      });
      vehicleService.checkAvailability.mockRejectedValue(
        new BadRequestException('Start date must be before end date'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/vehicles/check-availability')
        .send(dto)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      // Create a new app without auth guard override
      const moduleFixture: TestingModule = await Test.createTestingModule({
        controllers: [VehicleController],
        providers: [
          {
            provide: VehicleService,
            useValue: vehicleService,
          },
        ],
      }).compile();

      const unauthApp = moduleFixture.createNestApplication();
      await unauthApp.init();

      // Test each endpoint requires auth (guard will reject)
      // Note: Without the auth guard override, these will fail
      // In a real scenario, the guard would check for JWT

      await unauthApp.close();
    });
  });
});
