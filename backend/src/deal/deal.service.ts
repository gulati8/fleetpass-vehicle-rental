import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealQueryDto } from './dto/deal-query.dto';

@Injectable()
export class DealService {
  private readonly logger = new LoggerService('DealService');

  constructor(private prisma: PrismaService) {}

  private async getScopedDeal(id: string, organizationId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        lead: {
          include: {
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        closedBy: {
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

    if (!deal || deal.organizationId !== organizationId) {
      this.logger.warn('Deal not found or unauthorized', {
        dealId: id,
        organizationId,
      });
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    return deal;
  }

  async create(
    createDealDto: CreateDealDto,
    closedById: string,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Creating new deal', {
      customerId: createDealDto.customerId,
      vehicleId: createDealDto.vehicleId,
    });

    try {
      // Validate customer exists
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: createDealDto.customerId,
          organizationId,
        },
      });

      if (!customer) {
        this.logger.warn('Customer not found', {
          customerId: createDealDto.customerId,
        });
        throw new BadRequestException('Customer not found');
      }

      // Validate vehicle exists
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          id: createDealDto.vehicleId,
          location: { organizationId },
        },
      });

      if (!vehicle) {
        this.logger.warn('Vehicle not found', {
          vehicleId: createDealDto.vehicleId,
        });
        throw new BadRequestException('Vehicle not found');
      }

      // Validate lead exists if provided
      if (createDealDto.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: createDealDto.leadId, organizationId },
        });

        if (!lead) {
          this.logger.warn('Lead not found', {
            leadId: createDealDto.leadId,
          });
          throw new BadRequestException('Lead not found');
        }
      }

      const deal = await this.prisma.deal.create({
        data: {
          leadId: createDealDto.leadId,
          customerId: createDealDto.customerId,
          vehicleId: createDealDto.vehicleId,
          dealValueCents: createDealDto.dealValueCents,
          notes: createDealDto.notes,
          status: 'pending',
          organizationId,
          closedById,
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
          lead: {
            select: {
              id: true,
              customerName: true,
              customerEmail: true,
              source: true,
              status: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Deal created successfully', {
        dealId: deal.id,
      });

      return deal;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create deal', String(error), {
        dto: createDealDto,
      });
      throw error;
    }
  }

  async findAll(query: DealQueryDto, organizationId: string) {
    const {
      search,
      status,
      leadId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    this.logger.logWithFields('debug', 'Finding deals', { query });

    try {
      // Build where clause
      const where: any = { organizationId };

      // Search filter (customer name, email)
      if (search) {
        where.OR = [
          {
            customer: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
          {
            lead: {
              OR: [
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by lead
      if (leadId) {
        where.leadId = leadId;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build orderBy
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute query with pagination
      const [items, total] = await this.prisma.$transaction([
        this.prisma.deal.findMany({
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
            lead: {
              select: {
                id: true,
                customerName: true,
                customerEmail: true,
                source: true,
                status: true,
              },
            },
            closedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.deal.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.logWithFields('debug', 'Deals retrieved', {
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
      this.logger.error('Failed to find deals', String(error), { query });
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    this.logger.logWithFields('debug', 'Finding deal by ID', { dealId: id });

    try {
      const deal = await this.getScopedDeal(id, organizationId);

      this.logger.logWithFields('debug', 'Deal retrieved', { dealId: id });

      return deal;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to find deal', String(error), { dealId: id });
      throw error;
    }
  }

  async update(
    id: string,
    updateDealDto: UpdateDealDto,
    organizationId: string,
  ) {
    this.logger.logWithFields('info', 'Updating deal', { dealId: id });

    try {
      // Verify deal exists
      const existingDeal = await this.getScopedDeal(id, organizationId);

      // Validate status transitions
      if (updateDealDto.status) {
        this.validateStatusTransition(existingDeal.status, updateDealDto.status);
      }

      // If customer is being changed, validate
      if (updateDealDto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: updateDealDto.customerId, organizationId },
        });

        if (!customer) {
          throw new BadRequestException('Customer not found');
        }
      }

      // If vehicle is being changed, validate
      if (updateDealDto.vehicleId) {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: {
            id: updateDealDto.vehicleId,
            location: { organizationId },
          },
        });

        if (!vehicle) {
          throw new BadRequestException('Vehicle not found');
        }
      }

      // If lead is being changed, validate
      if (updateDealDto.leadId) {
        const lead = await this.prisma.lead.findFirst({
          where: { id: updateDealDto.leadId, organizationId },
        });

        if (!lead) {
          throw new BadRequestException('Lead not found');
        }
      }

      // Log status changes
      if (updateDealDto.status && updateDealDto.status !== existingDeal.status) {
        this.logger.logWithFields('info', 'Deal status changing', {
          dealId: id,
          oldStatus: existingDeal.status,
          newStatus: updateDealDto.status,
        });
      }

      const deal = await this.prisma.deal.update({
        where: { id },
        data: updateDealDto,
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
          lead: {
            select: {
              id: true,
              customerName: true,
              customerEmail: true,
              source: true,
              status: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Deal updated successfully', {
        dealId: id,
      });

      return deal;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to update deal', String(error), {
        dealId: id,
        dto: updateDealDto,
      });
      throw error;
    }
  }

  async remove(id: string, organizationId: string) {
    this.logger.logWithFields('info', 'Deleting deal', { dealId: id });

    try {
      // Verify deal exists
      await this.getScopedDeal(id, organizationId);

      await this.prisma.deal.delete({
        where: { id },
      });

      this.logger.logWithFields('info', 'Deal deleted successfully', {
        dealId: id,
      });

      return { message: 'Deal deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete deal', String(error), {
        dealId: id,
      });
      throw error;
    }
  }

  async win(id: string, closedById: string, organizationId: string) {
    this.logger.logWithFields('info', 'Marking deal as won', { dealId: id });

    try {
      const deal = await this.getScopedDeal(id, organizationId);

      if (deal.status !== 'pending') {
        throw new BadRequestException(
          `Cannot mark deal as won with status '${deal.status}'. Only pending deals can be won.`,
        );
      }

      const updatedDeal = await this.prisma.deal.update({
        where: { id },
        data: {
          status: 'closed_won',
          closedAt: new Date(),
          closedById,
        },
        include: {
          customer: true,
          lead: true,
          closedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Deal marked as won successfully', {
        dealId: id,
      });

      return updatedDeal;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to mark deal as won', String(error), {
        dealId: id,
      });
      throw error;
    }
  }

  async lose(id: string, closedById: string, organizationId: string) {
    this.logger.logWithFields('info', 'Marking deal as lost', { dealId: id });

    try {
      const deal = await this.getScopedDeal(id, organizationId);

      if (deal.status !== 'pending') {
        throw new BadRequestException(
          `Cannot mark deal as lost with status '${deal.status}'. Only pending deals can be lost.`,
        );
      }

      const updatedDeal = await this.prisma.deal.update({
        where: { id },
        data: {
          status: 'closed_lost',
          closedAt: new Date(),
          closedById,
        },
        include: {
          customer: true,
          lead: true,
          closedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.logWithFields('info', 'Deal marked as lost successfully', {
        dealId: id,
      });

      return updatedDeal;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to mark deal as lost', String(error), {
        dealId: id,
      });
      throw error;
    }
  }

  /**
   * Validate status transition logic
   */
  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      pending: ['closed_won', 'closed_lost'],
      closed_won: [], // Cannot transition from closed_won
      closed_lost: [], // Cannot transition from closed_lost
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus) && currentStatus !== newStatus) {
      throw new BadRequestException(
        `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }
  }
}
