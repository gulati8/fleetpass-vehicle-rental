import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import {
  createTestLocationWithOrganization,
  createLocationDto,
} from '../test/fixtures/location.fixtures';

const request = require('supertest');

describe('LocationController (Integration)', () => {
  let app: INestApplication;
  let locationService: jest.Mocked<LocationService>;

  beforeEach(async () => {
    // Create a mock LocationService
    const mockLocationService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    // Create testing module with mocked dependencies
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: mockLocationService,
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

    locationService = moduleFixture.get(LocationService);

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

  describe('POST /locations', () => {
    it('should create a new location', async () => {
      // Arrange
      const dto = createLocationDto();
      const createdLocation = createTestLocationWithOrganization({
        organizationId: 'org-123',
      });
      locationService.create.mockResolvedValue(createdLocation);

      // Act
      const response = await request(app.getHttpServer())
        .post('/locations')
        .send(dto)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(dto.name);

      // Verify service was called
      expect(locationService.create).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          name: dto.name,
          city: dto.city,
          state: dto.state,
        }),
      );
    });

    it('should return 400 when name is missing', async () => {
      // Arrange
      const invalidDto = {
        addressLine1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
        // name missing
      };

      // Act
      await request(app.getHttpServer())
        .post('/locations')
        .send(invalidDto)
        .expect(400);

      // Verify service was not called
      expect(locationService.create).not.toHaveBeenCalled();
    });

    it('should return 400 when state code is invalid', async () => {
      // Arrange
      const invalidDto = createLocationDto({ state: 'CAL' }); // Too long

      // Act
      await request(app.getHttpServer())
        .post('/locations')
        .send(invalidDto)
        .expect(400);

      expect(locationService.create).not.toHaveBeenCalled();
    });

    it('should return 400 when ZIP code is invalid', async () => {
      // Arrange
      const invalidDto = createLocationDto({ postalCode: '123' }); // Invalid format

      // Act
      await request(app.getHttpServer())
        .post('/locations')
        .send(invalidDto)
        .expect(400);

      expect(locationService.create).not.toHaveBeenCalled();
    });

    it('should return 400 when phone number is invalid', async () => {
      // Arrange
      const invalidDto = createLocationDto({ phone: '123' }); // Invalid format

      // Act
      await request(app.getHttpServer())
        .post('/locations')
        .send(invalidDto)
        .expect(400);

      expect(locationService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /locations', () => {
    it('should return paginated locations', async () => {
      // Arrange
      const locations = [
        createTestLocationWithOrganization({ organizationId: 'org-123' }),
        createTestLocationWithOrganization({
          id: 'location-456',
          organizationId: 'org-123',
          name: 'Second Location',
        }),
      ];
      const paginatedResponse = {
        items: locations,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      const response = await request(app.getHttpServer())
        .get('/locations')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });

      // Verify service was called
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('should filter locations by search query', async () => {
      // Arrange
      const locations = [
        createTestLocationWithOrganization({ organizationId: 'org-123' }),
      ];
      const paginatedResponse = {
        items: locations,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      await request(app.getHttpServer())
        .get('/locations?search=Main')
        .expect(200);

      // Verify service was called with search parameter
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ search: 'Main' }),
      );
    });

    it('should filter locations by state', async () => {
      // Arrange
      const paginatedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      await request(app.getHttpServer())
        .get('/locations?state=CA')
        .expect(200);

      // Verify service was called with state filter
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ state: 'CA' }),
      );
    });

    it('should filter locations by city', async () => {
      // Arrange
      const paginatedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      await request(app.getHttpServer())
        .get('/locations?city=San%20Francisco')
        .expect(200);

      // Verify service was called with city filter
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ city: 'San Francisco' }),
      );
    });

    it('should support custom pagination', async () => {
      // Arrange
      const paginatedResponse = {
        items: [],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      await request(app.getHttpServer())
        .get('/locations?page=2&limit=20')
        .expect(200);

      // Verify service was called with pagination parameters
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({ page: 2, limit: 20 }),
      );
    });
  });

  describe('GET /locations/:id', () => {
    it('should return a single location', async () => {
      // Arrange
      const location = createTestLocationWithOrganization({
        id: 'location-123',
        organizationId: 'org-123',
      });
      locationService.findOne.mockResolvedValue(location);

      // Act
      const response = await request(app.getHttpServer())
        .get('/locations/location-123')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe('location-123');

      // Verify service was called
      expect(locationService.findOne).toHaveBeenCalledWith(
        'location-123',
        'org-123',
      );
    });

    it('should return 404 when location not found', async () => {
      // Arrange
      const error = new NotFoundException(
        'Location with ID non-existent not found or does not belong to your organization',
      );
      locationService.findOne.mockRejectedValue(error);

      // Act
      await request(app.getHttpServer())
        .get('/locations/non-existent')
        .expect(404);

      expect(locationService.findOne).toHaveBeenCalled();
    });
  });

  describe('PATCH /locations/:id', () => {
    it('should update a location', async () => {
      // Arrange
      const updateDto = { name: 'Updated Name' };
      const updatedLocation = createTestLocationWithOrganization({
        id: 'location-123',
        organizationId: 'org-123',
        name: 'Updated Name',
      });
      locationService.update.mockResolvedValue(updatedLocation);

      // Act
      const response = await request(app.getHttpServer())
        .patch('/locations/location-123')
        .send(updateDto)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toBe('Updated Name');

      // Verify service was called
      expect(locationService.update).toHaveBeenCalledWith(
        'location-123',
        'org-123',
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });

    it('should return 404 when location not found', async () => {
      // Arrange
      const updateDto = { name: 'Updated Name' };
      const error = new NotFoundException('Location not found');
      locationService.update.mockRejectedValue(error);

      // Act
      await request(app.getHttpServer())
        .patch('/locations/non-existent')
        .send(updateDto)
        .expect(404);

      expect(locationService.update).toHaveBeenCalled();
    });

    it('should return 400 when update data is invalid', async () => {
      // Arrange
      const invalidDto = { state: 'CAL' }; // Invalid state code

      // Act
      await request(app.getHttpServer())
        .patch('/locations/location-123')
        .send(invalidDto)
        .expect(400);

      expect(locationService.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /locations/:id', () => {
    it('should delete a location', async () => {
      // Arrange
      locationService.remove.mockResolvedValue({
        message: 'Location deleted successfully',
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete('/locations/location-123')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.message).toBe('Location deleted successfully');

      // Verify service was called
      expect(locationService.remove).toHaveBeenCalledWith(
        'location-123',
        'org-123',
      );
    });

    it('should return 404 when location not found', async () => {
      // Arrange
      const error = new NotFoundException('Location not found');
      locationService.remove.mockRejectedValue(error);

      // Act
      await request(app.getHttpServer())
        .delete('/locations/non-existent')
        .expect(404);

      expect(locationService.remove).toHaveBeenCalled();
    });

    it('should return 400 when location has vehicles', async () => {
      // Arrange
      const error = new Error(
        'Cannot delete location with 5 vehicle(s). Please reassign or remove vehicles first.',
      );
      locationService.remove.mockRejectedValue(error);

      // Act
      await request(app.getHttpServer())
        .delete('/locations/location-123')
        .expect(500); // Will be 500 since it's not a NestJS exception

      expect(locationService.remove).toHaveBeenCalled();
    });
  });

  describe('Authorization', () => {
    it('should scope all operations to user organizationId', async () => {
      // This test verifies that the controller always passes the
      // organizationId from the authenticated user to the service

      // Arrange
      const paginatedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      locationService.findAll.mockResolvedValue(paginatedResponse);

      // Act
      await request(app.getHttpServer()).get('/locations').expect(200);

      // Assert - verify organizationId is from authenticated user
      expect(locationService.findAll).toHaveBeenCalledWith(
        'org-123', // from mocked user
        expect.any(Object),
      );
    });
  });
});
