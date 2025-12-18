import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../test/test-utils';
import {
  createTestCustomer,
  createTestCustomerWithBookings,
  createVerifiedCustomer,
  createCustomerDto,
  createCustomerQueryDto,
} from '../test/fixtures/customer.fixtures';

describe('CustomerService', () => {
  let service: CustomerService;
  let prismaService: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    // Create mocks
    prismaService = mockPrismaService();

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create a new customer', async () => {
      // Arrange
      const dto = createCustomerDto();
      const expectedCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(null);
      prismaService.customer.create.mockResolvedValue(expectedCustomer);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(expectedCustomer);
      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          driverLicenseNumber: dto.driverLicenseNumber,
          driverLicenseState: dto.driverLicenseState,
        }),
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      const dto = createCustomerDto();
      const existingCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        `Customer with email ${dto.email} already exists`,
      );
      expect(prismaService.customer.create).not.toHaveBeenCalled();
    });

    it('should create customer without optional fields', async () => {
      // Arrange
      const dto = createCustomerDto({
        phone: undefined,
        dateOfBirth: undefined,
        driverLicenseNumber: undefined,
        driverLicenseState: undefined,
        driverLicenseExpiry: undefined,
      });
      const expectedCustomer = createTestCustomer({
        phone: null,
        dateOfBirth: null,
        driverLicenseNumber: null,
        driverLicenseState: null,
        driverLicenseExpiry: null,
      });

      prismaService.customer.findUnique.mockResolvedValue(null);
      prismaService.customer.create.mockResolvedValue(expectedCustomer);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(expectedCustomer);
    });

    it('should convert date strings to Date objects', async () => {
      // Arrange
      const dto = createCustomerDto({
        dateOfBirth: '1990-01-15',
        driverLicenseExpiry: '2025-12-31',
      });
      const expectedCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(null);
      prismaService.customer.create.mockResolvedValue(expectedCustomer);

      // Act
      await service.create(dto);

      // Assert
      expect(prismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dateOfBirth: expect.any(Date),
          driverLicenseExpiry: expect.any(Date),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      // Arrange
      const query = createCustomerQueryDto();
      const customers = [
        createTestCustomer({ id: 'customer-1' }),
        createTestCustomer({ id: 'customer-2', email: 'jane@example.com' }),
      ];
      const total = 2;

      prismaService.$transaction.mockResolvedValue([customers, total]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual({
        items: customers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should filter by search query', async () => {
      // Arrange
      const query = createCustomerQueryDto({ search: 'john' });
      const customers = [createTestCustomer()];

      prismaService.$transaction.mockResolvedValue([customers, 1]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toEqual(customers);
      expect(prismaService.$transaction).toHaveBeenCalled();

      // Verify the transaction was called with correct arguments
      const transactionCalls = prismaService.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(2); // findMany and count
    });

    it('should filter by kycStatus', async () => {
      // Arrange
      const query = createCustomerQueryDto({ kycStatus: 'approved' });
      const customers = [createVerifiedCustomer()];

      prismaService.$transaction.mockResolvedValue([customers, 1]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toEqual(customers);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should support sorting by different fields', async () => {
      // Arrange
      const query = createCustomerQueryDto({
        sortBy: 'email',
        sortOrder: 'asc',
      });
      const customers = [createTestCustomer()];

      prismaService.$transaction.mockResolvedValue([customers, 1]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toEqual(customers);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const query = createCustomerQueryDto({ page: 2, limit: 5 });
      const customers = [createTestCustomer()];

      prismaService.$transaction.mockResolvedValue([customers, 15]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should include booking, lead, and deal counts', async () => {
      // Arrange
      const query = createCustomerQueryDto();
      const customers = [createTestCustomer()];

      prismaService.$transaction.mockResolvedValue([customers, 1]);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toEqual(customers);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return customer by ID with bookings', async () => {
      // Arrange
      const customerId = 'customer-123';
      const expectedCustomer = createTestCustomerWithBookings();

      prismaService.customer.findUnique.mockResolvedValue(expectedCustomer);

      // Act
      const result = await service.findOne(customerId);

      // Assert
      expect(result).toEqual(expectedCustomer);
      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: customerId },
        include: {
          bookings: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              vehicle: {
                select: {
                  id: true,
                  make: true,
                  model: true,
                  year: true,
                  vin: true,
                },
              },
            },
          },
          _count: {
            select: {
              bookings: true,
              leads: true,
              deals: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';

      prismaService.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(customerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(customerId)).rejects.toThrow(
        `Customer with ID ${customerId} not found`,
      );
    });
  });

  describe('update', () => {
    it('should successfully update a customer', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = {
        firstName: 'Jane',
        phone: '+14155559999',
      };
      const existingCustomer = createTestCustomer();
      const updatedCustomer = createTestCustomer({
        ...existingCustomer,
        ...updateDto,
      });

      prismaService.customer.findUnique
        .mockResolvedValueOnce(existingCustomer) // findOne check
        .mockResolvedValueOnce(null); // email uniqueness check
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      const result = await service.update(customerId, updateDto);

      // Assert
      expect(result).toEqual(updatedCustomer);
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: expect.objectContaining(updateDto),
        include: {
          _count: {
            select: {
              bookings: true,
              leads: true,
              deals: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      const updateDto = { firstName: 'Jane' };

      prismaService.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(customerId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if email already in use', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = { email: 'existing@example.com' };
      const existingCustomer = createTestCustomer({ id: customerId });
      const anotherCustomer = createTestCustomer({
        id: 'customer-456',
        email: 'existing@example.com',
      });

      // First call is for findOne, second is for email uniqueness check
      prismaService.customer.findUnique
        .mockResolvedValueOnce(existingCustomer)
        .mockResolvedValueOnce(anotherCustomer);

      // Act & Assert
      await expect(service.update(customerId, updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.customer.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should allow updating to same email', async () => {
      // Arrange
      const customerId = 'customer-123';
      const existingCustomer = createTestCustomer();
      const updateDto = { email: existingCustomer.email };
      const updatedCustomer = createTestCustomer();

      prismaService.customer.findUnique
        .mockResolvedValueOnce(existingCustomer) // findOne check
        .mockResolvedValueOnce(existingCustomer); // email uniqueness check (same customer)
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      const result = await service.update(customerId, updateDto);

      // Assert
      expect(result).toEqual(updatedCustomer);
    });

    it('should convert date strings to Date objects on update', async () => {
      // Arrange
      const customerId = 'customer-123';
      const updateDto = {
        dateOfBirth: '1991-05-20',
        driverLicenseExpiry: '2026-12-31',
      };
      const existingCustomer = createTestCustomer();
      const updatedCustomer = createTestCustomer();

      prismaService.customer.findUnique
        .mockResolvedValueOnce(existingCustomer)
        .mockResolvedValueOnce(null);
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      await service.update(customerId, updateDto);

      // Assert
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: expect.objectContaining({
          dateOfBirth: expect.any(Date),
          driverLicenseExpiry: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('remove', () => {
    it('should successfully delete a customer', async () => {
      // Arrange
      const customerId = 'customer-123';
      const existingCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.booking.count.mockResolvedValue(0);
      prismaService.customer.delete.mockResolvedValue(existingCustomer);

      // Act
      const result = await service.remove(customerId);

      // Assert
      expect(result).toEqual({ message: 'Customer deleted successfully' });
      expect(prismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: customerId },
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';

      prismaService.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(customerId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.customer.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if customer has active bookings', async () => {
      // Arrange
      const customerId = 'customer-123';
      const existingCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.booking.count.mockResolvedValue(2);

      // Act & Assert
      await expect(service.remove(customerId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove(customerId)).rejects.toThrow(
        'Cannot delete customer with 2 active booking(s)',
      );
      expect(prismaService.customer.delete).not.toHaveBeenCalled();
    });

    it('should check for active bookings with correct statuses', async () => {
      // Arrange
      const customerId = 'customer-123';
      const existingCustomer = createTestCustomer();

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.booking.count.mockResolvedValue(0);
      prismaService.customer.delete.mockResolvedValue(existingCustomer);

      // Act
      await service.remove(customerId);

      // Assert
      expect(prismaService.booking.count).toHaveBeenCalledWith({
        where: {
          customerId,
          status: {
            in: ['pending', 'confirmed', 'active'],
          },
        },
      });
    });
  });

  describe('updateKycStatus', () => {
    it('should update KYC status to approved', async () => {
      // Arrange
      const customerId = 'customer-123';
      const verifyDto = {
        status: 'approved' as const,
        inquiryId: 'inq_mock123',
      };
      const existingCustomer = createTestCustomer();
      const updatedCustomer = createVerifiedCustomer();

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      const result = await service.updateKycStatus(customerId, verifyDto);

      // Assert
      expect(result).toEqual(updatedCustomer);
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: expect.objectContaining({
          kycStatus: 'approved',
          kycVerifiedAt: expect.any(Date),
          kycInquiryId: 'inq_mock123',
        }),
        include: {
          _count: {
            select: {
              bookings: true,
              leads: true,
              deals: true,
            },
          },
        },
      });
    });

    it('should update KYC status to rejected', async () => {
      // Arrange
      const customerId = 'customer-123';
      const verifyDto = {
        status: 'rejected' as const,
        inquiryId: 'inq_mock456',
      };
      const existingCustomer = createTestCustomer();
      const updatedCustomer = createTestCustomer({
        kycStatus: 'rejected',
        kycInquiryId: 'inq_mock456',
      });

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      const result = await service.updateKycStatus(customerId, verifyDto);

      // Assert
      expect(result).toEqual(updatedCustomer);
      expect(prismaService.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: expect.objectContaining({
          kycStatus: 'rejected',
          kycInquiryId: 'inq_mock456',
        }),
        include: expect.any(Object),
      });
    });

    it('should not set kycVerifiedAt for rejected status', async () => {
      // Arrange
      const customerId = 'customer-123';
      const verifyDto = {
        status: 'rejected' as const,
      };
      const existingCustomer = createTestCustomer();
      const updatedCustomer = createTestCustomer({ kycStatus: 'rejected' });

      prismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      prismaService.customer.update.mockResolvedValue(updatedCustomer);

      // Act
      await service.updateKycStatus(customerId, verifyDto);

      // Assert
      const updateCall = prismaService.customer.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('kycVerifiedAt');
    });

    it('should throw NotFoundException if customer not found', async () => {
      // Arrange
      const customerId = 'nonexistent-id';
      const verifyDto = {
        status: 'approved' as const,
      };

      prismaService.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateKycStatus(customerId, verifyDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
