import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { VerifyKycDto } from './dto/verify-kyc.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new LoggerService('CustomerService');

  constructor(private prisma: PrismaService) {}

  private async getScopedCustomer(id: string, organizationId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
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

    if (!customer) {
      this.logger.warn('Customer not found or unauthorized', {
        customerId: id,
        organizationId,
      });
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (customer.organizationId !== organizationId) {
      this.logger.warn('Customer access denied for organization', {
        customerId: id,
        organizationId,
      });
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Creating new customer', {
      email: createCustomerDto.email,
    });

    try {
      // Check if customer with this email already exists
      const existingCustomer = await this.prisma.customer.findUnique({
        where: {
          organizationId_email: {
            organizationId,
            email: createCustomerDto.email,
          },
        },
      });

      if (existingCustomer) {
        this.logger.warn('Customer with this email already exists', {
          email: createCustomerDto.email,
        });
        throw new ConflictException(
          `Customer with email ${createCustomerDto.email} already exists`,
        );
      }

      // Convert date strings to Date objects
      const data: any = {
        ...createCustomerDto,
        organizationId,
      };

      if (createCustomerDto.dateOfBirth) {
        data.dateOfBirth = new Date(createCustomerDto.dateOfBirth);
      }

      if (createCustomerDto.driverLicenseExpiry) {
        data.driverLicenseExpiry = new Date(
          createCustomerDto.driverLicenseExpiry,
        );
      }

      const customer = await this.prisma.customer.create({
        data,
      });

      this.logger.logWithFields('info', 'Customer created successfully', {
        customerId: customer.id,
        email: customer.email,
      });

      return customer;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Failed to create customer', String(error), {
        dto: createCustomerDto,
      });
      throw error;
    }
  }

  async findAll(query: CustomerQueryDto, organizationId: string) {
    const {
      search,
      kycStatus,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    this.logger.logWithFields('debug', 'Finding customers', { query });

    try {
      // Build where clause
      const where: any = { organizationId };

      // Add search filter (searches name, email, phone, license number)
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { driverLicenseNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add kycStatus filter
      if (kycStatus) {
        where.kycStatus = kycStatus;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
          include: {
            _count: {
              select: {
                bookings: true,
                leads: true,
                deals: true,
              },
            },
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Customers retrieved', {
        total,
        page,
        limit,
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Failed to find customers', String(error), { query });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    this.logger.logWithFields('debug', 'Finding customer by ID', {
      customerId: id,
    });

    try {
      const customer = await this.getScopedCustomer(id, organizationId);

      this.logger.logWithFields('debug', 'Customer retrieved', {
        customerId: id,
      });

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find customer', String(error), {
        customerId: id,
      });
      throw error;
    }
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Updating customer', { customerId: id });

    try {
      // First verify the customer exists and belongs to org
      const existingCustomer = await this.getScopedCustomer(
        id,
        organizationId,
      );

      // If email is being updated, check for uniqueness
      if (
        updateCustomerDto.email &&
        updateCustomerDto.email !== existingCustomer.email
      ) {
        const existingEmail = await this.prisma.customer.findUnique({
          where: {
            organizationId_email: {
              organizationId,
              email: updateCustomerDto.email,
            },
          },
        });

        if (existingEmail && existingEmail.id !== id) {
          this.logger.warn('Email already in use by another customer', {
            email: updateCustomerDto.email,
          });
          throw new ConflictException(
            `Email ${updateCustomerDto.email} is already in use`,
          );
        }
      }

      // Convert date strings to Date objects
      const data: any = {
        ...updateCustomerDto,
      };

      if (updateCustomerDto.dateOfBirth) {
        data.dateOfBirth = new Date(updateCustomerDto.dateOfBirth);
      }

      if (updateCustomerDto.driverLicenseExpiry) {
        data.driverLicenseExpiry = new Date(
          updateCustomerDto.driverLicenseExpiry,
        );
      }

      if (updateCustomerDto.kycVerifiedAt) {
        data.kycVerifiedAt = new Date(updateCustomerDto.kycVerifiedAt);
      }

      const customer = await this.prisma.customer.update({
        where: { id },
        data,
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

      this.logger.logWithFields('info', 'Customer updated successfully', {
        customerId: id,
      });

      return customer;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to update customer', String(error), {
        customerId: id,
        dto: updateCustomerDto,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    this.logger.logWithFields('info', 'Deleting customer', { customerId: id });

    try {
      // First verify the customer exists
      await this.getScopedCustomer(id, organizationId);

      // Check for active bookings
      const activeBookingsCount = await this.prisma.booking.count({
        where: {
          customerId: id,
          status: {
            in: ['pending', 'confirmed', 'active'],
          },
        },
      });

      if (activeBookingsCount > 0) {
        this.logger.warn('Cannot delete customer with active bookings', {
          customerId: id,
          activeBookingsCount,
        });
        throw new BadRequestException(
          `Cannot delete customer with ${activeBookingsCount} active booking(s). Please complete or cancel bookings first.`,
        );
      }

      await this.prisma.customer.delete({
        where: { id },
      });

      this.logger.logWithFields('info', 'Customer deleted successfully', {
        customerId: id,
      });

      return { message: 'Customer deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to delete customer', String(error), {
        customerId: id,
      });
      throw error;
    }
  }

  async updateKycStatus(
    id: string,
    verifyKycDto: VerifyKycDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Updating KYC status', {
      customerId: id,
      newStatus: verifyKycDto.status,
    });

    try {
      // First verify the customer exists
      await this.getScopedCustomer(id, organizationId);

      const updateData: any = {
        kycStatus: verifyKycDto.status,
      };

      // Set kycVerifiedAt to now if status is approved
      if (verifyKycDto.status === 'approved') {
        updateData.kycVerifiedAt = new Date();
      }

      // Store inquiry ID if provided
      if (verifyKycDto.inquiryId) {
        updateData.kycInquiryId = verifyKycDto.inquiryId;
      }

      const customer = await this.prisma.customer.update({
        where: { id },
        data: updateData,
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

      this.logger.logWithFields('info', 'KYC status updated successfully', {
        customerId: id,
        kycStatus: customer.kycStatus,
        kycVerifiedAt: customer.kycVerifiedAt,
      });

      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update KYC status', String(error), {
        customerId: id,
        dto: verifyKycDto,
      });
      throw error;
    }
  }
}
