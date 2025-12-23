import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(private refreshTokenService: RefreshTokenService) {}

  /**
   * Clean up expired and old revoked refresh tokens daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('Starting refresh token cleanup job...');

    try {
      const deletedCount = await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log(
        `Refresh token cleanup completed. Deleted ${deletedCount} tokens.`,
      );
    } catch (error) {
      this.logger.error('Refresh token cleanup failed:', error);
    }
  }
}
