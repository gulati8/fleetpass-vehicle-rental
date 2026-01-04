import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users in the organization
   * Used for dropdowns and assignment features
   */
  async findAllInOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true, // Only return active users
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });
  }
}
