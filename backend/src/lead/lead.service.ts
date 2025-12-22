import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';

@Injectable()
export class LeadService {
  private readonly logger = new LoggerService('LeadService');

  constructor(private prisma: PrismaService) {}

  private async getScopedLead(id: string, organizationId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deals: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lead || lead.organizationId !== organizationId) {
      this.logger.warn('Lead not found or unauthorized', {
        leadId: id,
        organizationId,
      });
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async create(
    createLeadDto: CreateLeadDto,
    createdById: string,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Creating new lead', {
      customerEmail: createLeadDto.customerEmail,
      customerId: createLeadDto.customerId,
    });

    try {
      // Validate customer exists if customerId provided
      if (createLeadDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: {
            id: createLeadDto.customerId,
            organizationId,
          },
        });

        if (!customer) {
          this.logger.warn('Customer not found', {
            customerId: createLeadDto.customerId,
          });
          throw new BadRequestException('Customer not found');
        }
      }

      // Validate vehicle exists if vehicleInterestId provided
      if (createLeadDto.vehicleInterestId) {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: {
            id: createLeadDto.vehicleInterestId,
            location: { organizationId },
          },
        });

        if (!vehicle) {
          this.logger.warn('Vehicle not found', {
            vehicleId: createLeadDto.vehicleInterestId,
          });
          throw new BadRequestException('Vehicle not found');
        }
      }

      const lead = await this.prisma.lead.create({
        data: {
          ...createLeadDto,
          organizationId,
          createdById,
          status: 'new',
        },
        include: {
          customer: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Lead created successfully', {
        leadId: lead.id,
      });

      return lead;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create lead', String(error), {
        dto: createLeadDto,
      });
      throw error;
    }
  }

  async findAll(query: LeadQueryDto, organizationId: string) {
    const {
      search,
      status,
      source,
      assignedToId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    this.logger.logWithFields('debug', 'Finding leads', { query });

    try {
      // Build where clause
      const where: any = { organizationId };

      // Search filter (customer name, email, phone)
      if (search) {
        where.OR = [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by source
      if (source) {
        where.source = source;
      }

      // Filter by assigned user
      if (assignedToId) {
        where.assignedToId = assignedToId;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            deals: {
              select: {
                id: true,
                dealValueCents: true,
                status: true,
                createdAt: true,
              },
            },
          },
        }),
        this.prisma.lead.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Leads retrieved', {
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
      this.logger.error('Failed to find leads', String(error), { query });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    this.logger.logWithFields('debug', 'Finding lead by ID', { leadId: id });

    try {
      const lead = await this.getScopedLead(id, organizationId);

      this.logger.logWithFields('debug', 'Lead retrieved', { leadId: id });

      return lead;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find lead', String(error), { leadId: id });
      throw error;
    }
  }

  async update(
    id: string,
    updateLeadDto: UpdateLeadDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Updating lead', { leadId: id });

    try {
      // Verify lead exists
      const existingLead = await this.getScopedLead(id, organizationId);

      // Validate status transitions
      if (updateLeadDto.status) {
        this.validateStatusTransition(existingLead.status, updateLeadDto.status);
      }

      // If customer is being changed, validate
      if (updateLeadDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: {
            id: updateLeadDto.customerId,
            organizationId,
          },
        });

        if (!customer) {
          throw new BadRequestException('Customer not found');
        }
      }

      // If vehicle interest is being changed, validate
      if (updateLeadDto.vehicleInterestId) {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: {
            id: updateLeadDto.vehicleInterestId,
            location: { organizationId },
          },
        });

        if (!vehicle) {
          throw new BadRequestException('Vehicle not found');
        }
      }

      // Log status changes
      if (updateLeadDto.status && updateLeadDto.status !== existingLead.status) {
        this.logger.logWithFields('info', 'Lead status changing', {
          leadId: id,
          oldStatus: existingLead.status,
          newStatus: updateLeadDto.status,
        });
      }

      const lead = await this.prisma.lead.update({
        where: { id },
        data: updateLeadDto,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          deals: true,
        },
      });

      this.logger.logWithFields('info', 'Lead updated successfully', {
        leadId: id,
      });

      return lead;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to update lead', String(error), {
        leadId: id,
        dto: updateLeadDto,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    this.logger.logWithFields('info', 'Deleting lead', { leadId: id });

    try {
      // Verify lead exists
      await this.getScopedLead(id, organizationId);

      await this.prisma.lead.delete({
        where: { id },
      });

      this.logger.logWithFields('info', 'Lead deleted successfully', {
        leadId: id,
      });

      return { message: 'Lead deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete lead', String(error), {
        leadId: id,
      });
      throw error;
    }
  }

  async assign(
    id: string,
    assignLeadDto: AssignLeadDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Assigning lead', {
      leadId: id,
      assignedToId: assignLeadDto.assignedToId,
    });

    try {
      // Verify lead exists
      await this.getScopedLead(id, organizationId);

      // Validate user exists
      const user = await this.prisma.user.findFirst({
        where: {
          id: assignLeadDto.assignedToId,
          organizationId,
        },
      });

      if (!user || !user.isActive) {
        this.logger.warn('User not found or inactive', {
          userId: assignLeadDto.assignedToId,
        });
        throw new BadRequestException('User not found or inactive');
      }

      const lead = await this.prisma.lead.update({
        where: { id },
        data: {
          assignedToId: assignLeadDto.assignedToId,
        },
        include: {
          customer: true,
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Lead assigned successfully', {
        leadId: id,
        assignedToId: assignLeadDto.assignedToId,
      });

      return lead;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to assign lead', String(error), {
        leadId: id,
        dto: assignLeadDto,
      });
      throw error;
    }
  }

  async convert(
    id: string,
    convertLeadDto: ConvertLeadDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Converting lead to deal', {
      leadId: id,
    });

    try {
      // Verify lead exists
      const lead = await this.getScopedLead(id, organizationId);

      // Cannot convert already converted lead
      if (lead.status === 'converted') {
        throw new ConflictException('Lead has already been converted');
      }

      // Cannot convert lost lead
      if (lead.status === 'lost') {
        throw new BadRequestException('Cannot convert a lost lead');
      }

      // Validate vehicle exists
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: convertLeadDto.vehicleId,
          location: { organizationId },
        },
      });

      if (!vehicle) {
        throw new BadRequestException('Vehicle not found');
      }

      // Determine customerId (from lead or create placeholder)
      const customerId = lead.customerId;
      if (!customerId) {
        // If lead doesn't have a customer, we need one for the deal
        // In a real system, this would create a customer from lead info
        throw new BadRequestException(
          'Lead must have an associated customer before conversion',
        );
      }

      // Create deal in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create deal
        const deal = await tx.deal.create({
          data: {
            leadId: id,
            customerId,
            vehicleId: convertLeadDto.vehicleId,
            dealValueCents: convertLeadDto.dealValueCents,
            status: 'pending',
            notes: convertLeadDto.notes,
            organizationId,
          },
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            lead: true,
          },
        });

        // Update lead status to converted
        const updatedLead = await tx.lead.update({
          where: { id },
          data: { status: 'converted' },
          include: {
            customer: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        return { lead: updatedLead, deal };
      });

      this.logger.logWithFields('info', 'Lead converted to deal successfully', {
        leadId: id,
        dealId: result.deal.id,
      });

      return result;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Failed to convert lead', String(error), {
        leadId: id,
        dto: convertLeadDto,
      });
      throw error;
    }
  }

  /**
   * Validate status transition logic
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      new: ['contacted', 'qualified', 'lost'],
      contacted: ['qualified', 'lost'],
      qualified: ['converted', 'lost'],
      converted: [], // Cannot transition from converted
      lost: [], // Cannot transition from lost
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus) && currentStatus !== newStatus) {
      throw new BadRequestException(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }
  }
}
