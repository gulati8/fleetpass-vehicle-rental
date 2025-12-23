import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, Organization } from '@prisma/client';

// Type for validation result
type RefreshTokenValidation = {
  valid: boolean;
  user?: User & { organization: Organization };
};

@Injectable()
export class RefreshTokenService {
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private readonly BCRYPT_COST_FACTOR = 10; // Lower than password hashing for performance

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a cryptographically secure random refresh token
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Create and store a new refresh token in the database
   */
  async createRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Generate token
    const token = this.generateRefreshToken();

    // Hash token before storing
    const tokenHash = await bcrypt.hash(token, this.BCRYPT_COST_FACTOR);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Store in database
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    // Return plain token (only time it's available)
    return token;
  }

  /**
   * Validate a refresh token and return user if valid
   */
  async validateRefreshToken(
    token: string,
  ): Promise<RefreshTokenValidation> {
    // Find all non-revoked tokens for potential matching
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        user: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Check each token hash (since we can't query by hash directly)
    for (const refreshToken of refreshTokens) {
      const isMatch = await bcrypt.compare(token, refreshToken.tokenHash);

      if (isMatch) {
        // Verify user is still active
        if (!refreshToken.user.isActive) {
          throw new UnauthorizedException('Account is inactive');
        }

        return {
          valid: true,
          user: refreshToken.user,
        };
      }
    }

    // No matching token found
    return { valid: false };
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    // Find all non-revoked tokens for potential matching
    const refreshTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
    });

    // Check each token hash to find the matching one
    for (const refreshToken of refreshTokens) {
      const isMatch = await bcrypt.compare(token, refreshToken.tokenHash);

      if (isMatch) {
        // Revoke this token
        await this.prisma.refreshToken.update({
          where: { id: refreshToken.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }

    // Token not found - this is okay, may have already been revoked or expired
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Clean up expired and old revoked tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - (process.env.REFRESH_TOKEN_CLEANUP_DAYS ? parseInt(process.env.REFRESH_TOKEN_CLEANUP_DAYS) : 7),
    );

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          // Expired tokens
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          // Old revoked tokens
          {
            revokedAt: {
              lt: cutoffDate,
            },
          },
        ],
      },
    });

    return result.count;
  }
}
