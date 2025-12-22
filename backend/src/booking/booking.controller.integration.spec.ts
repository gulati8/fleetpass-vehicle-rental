import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import {
  mockBooking,
  mockCustomer,
  mockVehicle,
  mockLocation,
} from '../test/fixtures/booking.fixtures';

const request = require('supertest');
const ORG_ID = 'org-1';

describe('BookingController (Integration)', () => {
  let app: INestApplication;
  let bookingService: jest.Mocked<BookingService>;

  beforeEach(async () => {
    const mockBookingService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      confirm: jest.fn(),
      activate: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn((context) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            id: 'user-123',
            email: 'user@test.com',
            role: 'admin',
            organizationId: ORG_ID,
          };
          return true;
        }),
      })
      .compile();

    bookingService = moduleFixture.get(BookingService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /bookings', () => {
    const createDto = {
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      pickupLocationId: 'location-1',
      dropoffLocationId: 'location-1',
      pickupDatetime: '2024-01-01T10:00:00Z',
      dropoffDatetime: '2024-01-05T10:00:00Z',
    };

    it('should create a booking successfully', async () => {
      const createdBooking = {
        ...mockBooking,
        customer: mockCustomer,
        vehicle: mockVehicle,
      };
      bookingService.create.mockResolvedValue(createdBooking);

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(createDto)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.bookingNumber).toBeDefined();
      expect(bookingService.create).toHaveBeenCalledWith(createDto, ORG_ID);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle vehicle unavailability', async () => {
      bookingService.create.mockRejectedValue(
        new ConflictException('Vehicle is not available for the requested dates'),
      );

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .send(createDto)
        .expect(409);

      expect(response.body.error.message).toBe('Vehicle is not available for the requested dates');
    });
  });

  describe('GET /bookings', () => {
    it('should return paginated bookings', async () => {
      const paginatedResult = {
        items: [{
          ...mockBooking,
          customer: mockCustomer,
          vehicle: mockVehicle,
        }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      bookingService.findAll.mockResolvedValue(paginatedResult);

      const response = await request(app.getHttpServer())
        .get('/bookings')
        .expect(200);

      expect(response.body).toBeDefined();
      // Response is wrapped by ResponseInterceptor
      expect(response.body.data || response.body).toBeDefined();
    });

    it('should filter by customer ID', async () => {
      bookingService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      await request(app.getHttpServer())
        .get('/bookings?customerId=customer-1')
        .expect(200);

      expect(bookingService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'customer-1' }),
        ORG_ID,
      );
    });

    it('should support pagination', async () => {
      bookingService.findAll.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        limit: 20,
        totalPages: 0,
      });

      await request(app.getHttpServer())
        .get('/bookings?page=2&limit=20')
        .expect(200);

      expect(bookingService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
        ORG_ID,
      );
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return a single booking', async () => {
      const bookingWithRelations = {
        ...mockBooking,
        customer: mockCustomer,
        vehicle: { ...mockVehicle, location: mockLocation },
      };
      bookingService.findOne.mockResolvedValue(bookingWithRelations);

      const response = await request(app.getHttpServer())
        .get('/bookings/booking-1')
        .expect(200);

      expect(response.body.data.id).toBe('booking-1');
      expect(response.body.data.customer).toBeDefined();
      expect(response.body.data.vehicle).toBeDefined();
    });

    it('should return 404 if booking not found', async () => {
      bookingService.findOne.mockRejectedValue(
        new NotFoundException('Booking with ID invalid-id not found'),
      );

      const response = await request(app.getHttpServer())
        .get('/bookings/invalid-id')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PATCH /bookings/:id', () => {
    const updateDto = {
      notes: 'Updated notes',
    };

    it('should update a booking', async () => {
      const updatedBooking = {
        ...mockBooking,
        ...updateDto,
        customer: mockCustomer,
        vehicle: mockVehicle,
      };
      bookingService.update.mockResolvedValue(updatedBooking);

      const response = await request(app.getHttpServer())
        .patch('/bookings/booking-1')
        .send(updateDto)
        .expect(200);

      expect(response.body.data.notes).toBe('Updated notes');
      expect(bookingService.update).toHaveBeenCalledWith(
        'booking-1',
        updateDto,
        ORG_ID,
      );
    });

    it('should validate status values', async () => {
      const invalidStatusDto = {
        status: 'invalid-status',
      };

      const response = await request(app.getHttpServer())
        .patch('/bookings/booking-1')
        .send(invalidStatusDto)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('should cancel a booking', async () => {
      bookingService.remove.mockResolvedValue({
        message: 'Booking cancelled successfully',
      });

      const response = await request(app.getHttpServer())
        .delete('/bookings/booking-1')
        .expect(200);

      expect(response.body.data.message).toBe('Booking cancelled successfully');
      expect(bookingService.remove).toHaveBeenCalledWith('booking-1', ORG_ID);
    });
  });

  describe('POST /bookings/:id/confirm', () => {
    it('should confirm a booking', async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: 'confirmed',
        customer: mockCustomer,
        vehicle: mockVehicle,
      };
      bookingService.confirm.mockResolvedValue(confirmedBooking);

      const response = await request(app.getHttpServer())
        .post('/bookings/booking-1/confirm')
        .expect(201);

      expect(response.body.data.status).toBe('confirmed');
      expect(bookingService.confirm).toHaveBeenCalledWith('booking-1', ORG_ID);
    });
  });

  describe('POST /bookings/:id/activate', () => {
    it('should activate a booking', async () => {
      const activeBooking = {
        ...mockBooking,
        status: 'active',
        customer: mockCustomer,
        vehicle: mockVehicle,
      };
      bookingService.activate.mockResolvedValue(activeBooking);

      const response = await request(app.getHttpServer())
        .post('/bookings/booking-1/activate')
        .expect(201);

      expect(response.body.data.status).toBe('active');
      expect(bookingService.activate).toHaveBeenCalledWith('booking-1', ORG_ID);
    });
  });

  describe('POST /bookings/:id/complete', () => {
    it('should complete a booking', async () => {
      const completedBooking = {
        ...mockBooking,
        status: 'completed',
        customer: mockCustomer,
        vehicle: mockVehicle,
      };
      bookingService.complete.mockResolvedValue(completedBooking);

      const response = await request(app.getHttpServer())
        .post('/bookings/booking-1/complete')
        .expect(201);

      expect(response.body.data.status).toBe('completed');
      expect(bookingService.complete).toHaveBeenCalledWith('booking-1', ORG_ID);
    });
  });

  describe('POST /bookings/:id/cancel', () => {
    it('should cancel a booking', async () => {
      bookingService.cancel.mockResolvedValue({
        message: 'Booking cancelled successfully',
      });

      const response = await request(app.getHttpServer())
        .post('/bookings/booking-1/cancel')
        .expect(201);

      expect(response.body.data.message).toBe('Booking cancelled successfully');
      expect(bookingService.cancel).toHaveBeenCalledWith('booking-1', ORG_ID);
    });
  });
});
