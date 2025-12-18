import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { User, Organization } from '@prisma/client';

// Type for User with Organization included
type UserWithOrganization = User & {
  organization: Organization;
};

@Injectable()
export class AuthService {
  private readonly USER_CACHE_TTL = 900; // 15 minutes
  private readonly USER_CACHE_PREFIX = 'user:';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async signup(signupDto: SignupDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(signupDto.password, 12);

    // Create organization and user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: signupDto.organizationName,
          slug: this.generateSlug(signupDto.organizationName),
          billingEmail: signupDto.email,
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email: signupDto.email,
          passwordHash,
          firstName: signupDto.firstName,
          lastName: signupDto.lastName,
          role: 'admin',
          organizationId: organization.id,
        },
        include: {
          organization: true,
        },
      });

      return { user, organization };
    });

    // Generate JWT
    const accessToken = this.generateToken(result.user);

    return {
      user: this.sanitizeUser(result.user),
      organization: result.organization,
      access_token: accessToken,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Cache user data for quick access
    await this.cacheUserData(user);

    // Generate JWT
    const accessToken = this.generateToken(user);

    return {
      user: this.sanitizeUser(user),
      organization: user.organization,
      access_token: accessToken,
    };
  }

  async getMe(userId: string) {
    // Try to get from cache first
    const cacheKey = `${this.USER_CACHE_PREFIX}${userId}`;
    const cachedData = await this.redis.getJson<{
      user: Omit<User, 'passwordHash'>;
      organization: Organization;
    }>(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const result = {
      user: this.sanitizeUser(user),
      organization: user.organization,
    };

    // Cache the result
    await this.redis.setJson(cacheKey, result, this.USER_CACHE_TTL);

    return result;
  }

  private generateToken(user: User | UserWithOrganization): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User | UserWithOrganization) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50) +
      '-' +
      Date.now().toString(36)
    );
  }

  private async cacheUserData(user: UserWithOrganization): Promise<void> {
    const cacheKey = `${this.USER_CACHE_PREFIX}${user.id}`;
    const data = {
      user: this.sanitizeUser(user),
      organization: user.organization,
    };
    await this.redis.setJson(cacheKey, data, this.USER_CACHE_TTL);
  }
}
