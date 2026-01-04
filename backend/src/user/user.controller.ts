import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /api/v1/users
   * Get all users in the organization
   * Used for assignment dropdowns in leads, bookings, etc.
   */
  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.userService.findAllInOrganization(user.organizationId);
  }
}
