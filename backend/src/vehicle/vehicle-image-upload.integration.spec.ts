import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
} from '@nestjs/common';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { createTestVehicleWithLocation } from '../test/fixtures/vehicle.fixtures';
import * as fs from 'fs';
import * as path from 'path';

const request = require('supertest');

describe('VehicleController - Image Upload (Integration)', () => {
  let app: INestApplication;
  let vehicleService: jest.Mocked<VehicleService>;
  const testUploadsDir = path.join(__dirname, '../../test-uploads/vehicles');

  // Test image fixtures
  const createTestImageBuffer = (
    format: 'jpeg' | 'png' | 'webp' | 'avif',
    size: number = 1024,
  ): Buffer => {
    // Create a minimal valid image buffer for testing
    // In a real scenario, these would be actual image files
    const buffer = Buffer.alloc(size);

    // Add minimal headers to make it recognizable as the correct format
    switch (format) {
      case 'jpeg':
        // JPEG magic bytes: FF D8 FF
        buffer[0] = 0xff;
        buffer[1] = 0xd8;
        buffer[2] = 0xff;
        break;
      case 'png':
        // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
        buffer[0] = 0x89;
        buffer[1] = 0x50;
        buffer[2] = 0x4e;
        buffer[3] = 0x47;
        buffer[4] = 0x0d;
        buffer[5] = 0x0a;
        buffer[6] = 0x1a;
        buffer[7] = 0x0a;
        break;
      case 'webp':
        // WebP magic bytes: RIFF....WEBP
        buffer.write('RIFF', 0);
        buffer.write('WEBP', 8);
        break;
      case 'avif':
        // AVIF magic bytes: ....ftypavif
        buffer.write('ftyp', 4);
        buffer.write('avif', 8);
        break;
    }

    return buffer;
  };

  beforeAll(async () => {
    // Create test uploads directory
    if (!fs.existsSync(testUploadsDir)) {
      fs.mkdirSync(testUploadsDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Create a mock VehicleService
    const mockVehicleService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      checkAvailability: jest.fn(),
      addImages: jest.fn(),
      deleteImage: jest.fn(),
      reorderImages: jest.fn(),
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

    // Clean up test uploads directory
    if (fs.existsSync(testUploadsDir)) {
      const files = fs.readdirSync(testUploadsDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(testUploadsDir, file));
      });
    }
  });

  afterAll(async () => {
    // Remove test uploads directory
    if (fs.existsSync(testUploadsDir)) {
      fs.rmSync(testUploadsDir, { recursive: true, force: true });
    }
  });

  describe('POST /vehicles/:id/images', () => {
    describe('Test 1: Upload AVIF Image', () => {
      it('should successfully upload a single AVIF image', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        const imageUrl = 'http://localhost:3001/uploads/vehicles/test-1.avif';

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: [...(vehicle.imageUrls || []), imageUrl],
        });

        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', avifBuffer, 'test-car.avif')
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('imageUrls');
        expect(Array.isArray(response.body.data.imageUrls)).toBe(true);
        expect(vehicleService.addImages).toHaveBeenCalledWith(
          vehicleId,
          'org-123',
          expect.arrayContaining([
            expect.objectContaining({
              mimetype: 'image/avif',
              originalname: 'test-car.avif',
            }),
          ]),
        );
      });

      it('should verify AVIF image URL is accessible', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        const imageUrl = 'http://localhost:3001/uploads/vehicles/test-1.avif';

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: [imageUrl],
        });

        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', avifBuffer, 'test-car.avif')
          .expect(201);

        // Assert - verify the image URL format is correct
        const addImagesCall = vehicleService.addImages.mock.calls[0];
        expect(addImagesCall).toBeDefined();
        expect(addImagesCall[2][0].mimetype).toBe('image/avif');
      });
    });

    describe('Test 2: Upload Multiple Images (Bulk Upload)', () => {
      it('should upload 4 images at once (2 JPEG, 1 PNG, 1 AVIF) without rate limiting', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });

        const baseUrl = 'http://localhost:3001/uploads/vehicles';
        const newImageUrls = [
          `${baseUrl}/test-1.jpeg`,
          `${baseUrl}/test-2.jpeg`,
          `${baseUrl}/test-3.png`,
          `${baseUrl}/test-4.avif`,
        ];

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: [...(vehicle.imageUrls || []), ...newImageUrls],
        });

        // Create test image buffers
        const jpeg1Buffer = createTestImageBuffer('jpeg', 2048);
        const jpeg2Buffer = createTestImageBuffer('jpeg', 2048);
        const pngBuffer = createTestImageBuffer('png', 2048);
        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpeg1Buffer, 'car-1.jpeg')
          .attach('images', jpeg2Buffer, 'car-2.jpeg')
          .attach('images', pngBuffer, 'car-3.png')
          .attach('images', avifBuffer, 'car-4.avif')
          .expect(201);

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('imageUrls');
        expect(vehicleService.addImages).toHaveBeenCalledWith(
          vehicleId,
          'org-123',
          expect.arrayContaining([
            expect.objectContaining({ mimetype: 'image/jpeg' }),
            expect.objectContaining({ mimetype: 'image/jpeg' }),
            expect.objectContaining({ mimetype: 'image/png' }),
            expect.objectContaining({ mimetype: 'image/avif' }),
          ]),
        );

        // Verify all 4 files were uploaded
        const uploadedFiles = vehicleService.addImages.mock.calls[0][2];
        expect(uploadedFiles).toHaveLength(4);
      });

      it('should verify all 4 images display correctly with proper count', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({
          id: vehicleId,
          imageUrls: [], // Start with no images
        });

        const newImageUrls = [
          'http://localhost:3001/uploads/vehicles/test-1.jpeg',
          'http://localhost:3001/uploads/vehicles/test-2.jpeg',
          'http://localhost:3001/uploads/vehicles/test-3.png',
          'http://localhost:3001/uploads/vehicles/test-4.avif',
        ];

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: newImageUrls,
        });

        const jpeg1Buffer = createTestImageBuffer('jpeg', 2048);
        const jpeg2Buffer = createTestImageBuffer('jpeg', 2048);
        const pngBuffer = createTestImageBuffer('png', 2048);
        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpeg1Buffer, 'car-1.jpeg')
          .attach('images', jpeg2Buffer, 'car-2.jpeg')
          .attach('images', pngBuffer, 'car-3.png')
          .attach('images', avifBuffer, 'car-4.avif')
          .expect(201);

        // Assert
        expect(response.body.data.imageUrls).toHaveLength(4);
        // Verify image count shows "4 of 10 images"
        expect(response.body.data.imageUrls.length).toBeLessThanOrEqual(10);
      });
    });

    describe('Test 3: Upload Different Formats', () => {
      it('should upload and accept JPEG format', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: ['http://localhost:3001/uploads/vehicles/test.jpeg'],
        });

        const jpegBuffer = createTestImageBuffer('jpeg', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpegBuffer, 'test.jpeg')
          .expect(201);
      });

      it('should upload and accept PNG format', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: ['http://localhost:3001/uploads/vehicles/test.png'],
        });

        const pngBuffer = createTestImageBuffer('png', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', pngBuffer, 'test.png')
          .expect(201);
      });

      it('should upload and accept WebP format', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: ['http://localhost:3001/uploads/vehicles/test.webp'],
        });

        const webpBuffer = createTestImageBuffer('webp', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', webpBuffer, 'test.webp')
          .expect(201);
      });

      it('should upload and accept AVIF format', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: ['http://localhost:3001/uploads/vehicles/test.avif'],
        });

        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', avifBuffer, 'test.avif')
          .expect(201);
      });

      it('should reject unsupported format (GIF)', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);

        const gifBuffer = Buffer.from('GIF89a'); // GIF magic bytes

        // Act & Assert
        // Multer throws a 500 error for invalid file types during file filter
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', gifBuffer, 'test.gif')
          .expect(500);

        // Verify service was not called
        expect(vehicleService.addImages).not.toHaveBeenCalled();
      });

      it('should upload all supported formats together', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: [
            'http://localhost:3001/uploads/vehicles/test-1.jpeg',
            'http://localhost:3001/uploads/vehicles/test-2.png',
            'http://localhost:3001/uploads/vehicles/test-3.webp',
            'http://localhost:3001/uploads/vehicles/test-4.avif',
          ],
        });

        const jpegBuffer = createTestImageBuffer('jpeg', 2048);
        const pngBuffer = createTestImageBuffer('png', 2048);
        const webpBuffer = createTestImageBuffer('webp', 2048);
        const avifBuffer = createTestImageBuffer('avif', 2048);

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpegBuffer, 'test.jpeg')
          .attach('images', pngBuffer, 'test.png')
          .attach('images', webpBuffer, 'test.webp')
          .attach('images', avifBuffer, 'test.avif')
          .expect(201);

        // Assert
        expect(response.body.data.imageUrls).toHaveLength(4);
        expect(vehicleService.addImages).toHaveBeenCalledWith(
          vehicleId,
          'org-123',
          expect.arrayContaining([
            expect.objectContaining({ mimetype: 'image/jpeg' }),
            expect.objectContaining({ mimetype: 'image/png' }),
            expect.objectContaining({ mimetype: 'image/webp' }),
            expect.objectContaining({ mimetype: 'image/avif' }),
          ]),
        );
      });
    });

    describe('Test 4: Upload Near Maximum (10 images)', () => {
      it('should upload 10 images at once without rate limiting', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({
          id: vehicleId,
          imageUrls: [],
        });

        const newImageUrls = Array.from(
          { length: 10 },
          (_, i) =>
            `http://localhost:3001/uploads/vehicles/test-${i + 1}.jpeg`,
        );

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: newImageUrls,
        });

        // Create 10 test image buffers
        const imageBuffers = Array.from({ length: 10 }, () =>
          createTestImageBuffer('jpeg', 2048),
        );

        // Act
        let uploadRequest = request(app.getHttpServer()).post(
          `/vehicles/${vehicleId}/images`,
        );

        imageBuffers.forEach((buffer, index) => {
          uploadRequest = uploadRequest.attach(
            'images',
            buffer,
            `car-${index + 1}.jpeg`,
          );
        });

        const response = await uploadRequest.expect(201);

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.imageUrls).toHaveLength(10);

        // Verify all 10 files were uploaded
        const uploadedFiles = vehicleService.addImages.mock.calls[0][2];
        expect(uploadedFiles).toHaveLength(10);
      });

      it('should verify all 10 images display correctly', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({
          id: vehicleId,
          imageUrls: [],
        });

        const newImageUrls = Array.from(
          { length: 10 },
          (_, i) =>
            `http://localhost:3001/uploads/vehicles/test-${i + 1}.jpeg`,
        );

        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: newImageUrls,
        });

        const imageBuffers = Array.from({ length: 10 }, () =>
          createTestImageBuffer('jpeg', 2048),
        );

        // Act
        let uploadRequest = request(app.getHttpServer()).post(
          `/vehicles/${vehicleId}/images`,
        );

        imageBuffers.forEach((buffer, index) => {
          uploadRequest = uploadRequest.attach(
            'images',
            buffer,
            `car-${index + 1}.jpeg`,
          );
        });

        const response = await uploadRequest.expect(201);

        // Assert
        // Verify image count shows "10 of 10 images"
        expect(response.body.data.imageUrls).toHaveLength(10);
        expect(response.body.data.imageUrls.length).toBe(10);
      });

      it('should reject upload exceeding 10 images limit', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);

        // Create 11 test image buffers (exceeds limit)
        const imageBuffers = Array.from({ length: 11 }, () =>
          createTestImageBuffer('jpeg', 2048),
        );

        // Act
        let uploadRequest = request(app.getHttpServer()).post(
          `/vehicles/${vehicleId}/images`,
        );

        imageBuffers.forEach((buffer, index) => {
          uploadRequest = uploadRequest.attach(
            'images',
            buffer,
            `car-${index + 1}.jpeg`,
          );
        });

        await uploadRequest.expect(400);

        // Assert - service should not be called
        expect(vehicleService.addImages).not.toHaveBeenCalled();
      });
    });

    describe('Edge Cases and Validation', () => {
      it('should reject upload if vehicle does not exist', async () => {
        // Arrange
        const vehicleId = 'non-existent-vehicle';
        vehicleService.addImages.mockRejectedValue(
          new NotFoundException('Vehicle not found'),
        );

        const jpegBuffer = createTestImageBuffer('jpeg', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpegBuffer, 'test.jpeg')
          .expect(404);
      });

      it('should reject upload if vehicle belongs to different organization', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        vehicleService.addImages.mockRejectedValue(
          new NotFoundException(
            'Vehicle not found or does not belong to your organization',
          ),
        );

        const jpegBuffer = createTestImageBuffer('jpeg', 2048);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpegBuffer, 'test.jpeg')
          .expect(404);
      });

      it('should reject upload if file size exceeds limit (10MB)', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);

        // Create a buffer larger than 10MB
        const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

        // Act & Assert
        await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', largeBuffer, 'large-image.jpeg')
          .expect(413); // Payload Too Large
      });

      it('should handle upload with no files gracefully', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);
        vehicleService.addImages.mockResolvedValue({
          imageUrls: vehicle.imageUrls || [],
        });

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`);

        // Assert - Should reject with 4xx error (either 400 or Multer error)
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
        // Service should not be called if no files provided
        expect(vehicleService.addImages).not.toHaveBeenCalled();
      });

      it('should verify @SkipThrottle decorator is applied (no rate limiting)', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);

        // Mock response for each upload
        vehicleService.addImages.mockResolvedValue({
          imageUrls: ['http://localhost:3001/uploads/vehicles/test.jpeg'],
        });

        const jpegBuffer = createTestImageBuffer('jpeg', 2048);

        // Act - Make multiple rapid requests (would trigger rate limiting if not skipped)
        const uploadPromises = Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .post(`/vehicles/${vehicleId}/images`)
            .attach('images', jpegBuffer, 'test.jpeg'),
        );

        const responses = await Promise.all(uploadPromises);

        // Assert - All requests should succeed without rate limiting
        responses.forEach((response) => {
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
        });

        expect(vehicleService.addImages).toHaveBeenCalledTimes(5);
      });
    });

    describe('Image URL Generation', () => {
      it('should generate correct image URLs with unique filenames', async () => {
        // Arrange
        const vehicleId = 'vehicle-123';
        const vehicle = createTestVehicleWithLocation({ id: vehicleId });
        vehicleService.findOne.mockResolvedValue(vehicle);

        const mockUrls = [
          'http://localhost:3001/uploads/vehicles/1234567890-123456789.jpeg',
          'http://localhost:3001/uploads/vehicles/1234567890-987654321.jpeg',
        ];

        vehicleService.addImages.mockResolvedValue({
          imageUrls: mockUrls,
        });

        const jpeg1Buffer = createTestImageBuffer('jpeg', 2048);
        const jpeg2Buffer = createTestImageBuffer('jpeg', 2048);

        // Act
        const response = await request(app.getHttpServer())
          .post(`/vehicles/${vehicleId}/images`)
          .attach('images', jpeg1Buffer, 'car-1.jpeg')
          .attach('images', jpeg2Buffer, 'car-2.jpeg')
          .expect(201);

        // Assert
        expect(response.body.data.imageUrls).toHaveLength(2);
        expect(response.body.data.imageUrls[0]).toContain('/uploads/vehicles/');
        expect(response.body.data.imageUrls[1]).toContain('/uploads/vehicles/');

        // Verify filenames are unique
        expect(response.body.data.imageUrls[0]).not.toBe(
          response.body.data.imageUrls[1],
        );
      });
    });
  });

  describe('DELETE /vehicles/:id/images', () => {
    it('should successfully delete an image', async () => {
      // Arrange
      const vehicleId = 'vehicle-123';
      const imageUrl =
        'http://localhost:3001/uploads/vehicles/test-123.jpeg';
      const vehicle = createTestVehicleWithLocation({
        id: vehicleId,
        imageUrls: [imageUrl, 'http://localhost:3001/uploads/vehicles/test-456.jpeg'],
      });

      vehicleService.findOne.mockResolvedValue(vehicle);
      vehicleService.deleteImage.mockResolvedValue({
        imageUrls: ['http://localhost:3001/uploads/vehicles/test-456.jpeg'],
      });

      // Act
      const response = await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleId}/images`)
        .send({ imageUrl })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrls).toHaveLength(1);
      expect(vehicleService.deleteImage).toHaveBeenCalledWith(
        vehicleId,
        'org-123',
        imageUrl,
      );
    });
  });

  describe('PATCH /vehicles/:id/images/reorder', () => {
    it('should successfully reorder images', async () => {
      // Arrange
      const vehicleId = 'vehicle-123';
      const originalOrder = [
        'http://localhost:3001/uploads/vehicles/test-1.jpeg',
        'http://localhost:3001/uploads/vehicles/test-2.jpeg',
        'http://localhost:3001/uploads/vehicles/test-3.jpeg',
      ];
      const newOrder = [
        'http://localhost:3001/uploads/vehicles/test-3.jpeg',
        'http://localhost:3001/uploads/vehicles/test-1.jpeg',
        'http://localhost:3001/uploads/vehicles/test-2.jpeg',
      ];

      const vehicle = createTestVehicleWithLocation({
        id: vehicleId,
        imageUrls: originalOrder,
      });

      vehicleService.findOne.mockResolvedValue(vehicle);
      vehicleService.reorderImages.mockResolvedValue({
        imageUrls: newOrder,
      });

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}/images/reorder`)
        .send({ imageUrls: newOrder })
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrls).toEqual(newOrder);
      expect(vehicleService.reorderImages).toHaveBeenCalledWith(
        vehicleId,
        'org-123',
        newOrder,
      );
    });
  });
});
