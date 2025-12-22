import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';
import {
  MockInquiry,
  MockVerification,
  GovernmentIdData,
  SelfieData,
  CreateInquiryParams,
  ListInquiriesParams,
  TEST_SCENARIOS,
  InquiryStatus,
  VerificationCheck,
  WebhookEvent,
  WebhookEventType,
} from './types/persona-mock.types';
import { randomUUID } from 'crypto';

/**
 * Persona Mock Service
 * Simulates Persona API behavior for KYC/identity verification
 * No actual network calls - all operations are in-memory
 */
@Injectable()
export class PersonaMockService {
  private readonly logger = new LoggerService('PersonaMockService');

  // In-memory stores
  private inquiries = new Map<string, MockInquiry>();
  private verifications = new Map<string, MockVerification>();
  private webhookCallbacks = new Map<string, (event: WebhookEvent) => void>();
  private scheduledTimeouts = new Set<NodeJS.Timeout>();

  /**
   * Create a new inquiry (verification session)
   */
  async createInquiry(params: CreateInquiryParams): Promise<MockInquiry> {
    this.logger.logWithFields('info', 'Creating mock Persona inquiry', {
      reference_id: params.reference_id,
      environment: params.environment || 'sandbox',
    });

    const id = `inq_mock_${randomUUID()}`;
    const now = new Date().toISOString();

    const inquiry: MockInquiry = {
      id,
      type: 'inquiry',
      attributes: {
        status: 'created',
        reference_id: params.reference_id,
        created_at: now,
        completed_at: null,
        failed_at: null,
        expired_at: null,
        fields: {},
      },
    };

    this.inquiries.set(id, inquiry);

    this.logger.logWithFields('info', 'Mock Persona inquiry created', {
      inquiryId: id,
      reference_id: params.reference_id,
    });

    // Emit webhook event
    await this.emitWebhook('inquiry.created', inquiry);

    return inquiry;
  }

  /**
   * Retrieve an inquiry by ID
   */
  async retrieveInquiry(inquiryId: string): Promise<MockInquiry> {
    const inquiry = this.inquiries.get(inquiryId);

    if (!inquiry) {
      throw new NotFoundException(`Inquiry ${inquiryId} not found`);
    }

    return inquiry;
  }

  /**
   * Update inquiry status
   */
  async updateInquiryStatus(
    inquiryId: string,
    status: InquiryStatus,
  ): Promise<MockInquiry> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Updating inquiry status', {
      inquiryId,
      oldStatus: inquiry.attributes.status,
      newStatus: status,
    });

    const now = new Date().toISOString();

    inquiry.attributes.status = status;

    if (status === 'completed') {
      inquiry.attributes.completed_at = now;
    } else if (status === 'failed') {
      inquiry.attributes.failed_at = now;
    } else if (status === 'expired') {
      inquiry.attributes.expired_at = now;
    }

    this.inquiries.set(inquiryId, inquiry);

    // Emit webhook event
    if (status === 'completed') {
      await this.emitWebhook('inquiry.completed', inquiry);
    } else if (status === 'failed') {
      await this.emitWebhook('inquiry.failed', inquiry);
    } else if (status === 'expired') {
      await this.emitWebhook('inquiry.expired', inquiry);
    }

    return inquiry;
  }

  /**
   * List inquiries with filters
   */
  async listInquiries(
    params: ListInquiriesParams = {},
  ): Promise<{ data: MockInquiry[] }> {
    let inquiries = Array.from(this.inquiries.values());

    // Apply filters
    if (params.filter?.reference_id) {
      inquiries = inquiries.filter(
        (i) => i.attributes.reference_id === params.filter!.reference_id,
      );
    }

    if (params.filter?.status) {
      inquiries = inquiries.filter(
        (i) => i.attributes.status === params.filter!.status,
      );
    }

    // Sort by created_at descending
    inquiries.sort(
      (a, b) =>
        new Date(b.attributes.created_at).getTime() -
        new Date(a.attributes.created_at).getTime(),
    );

    // Apply pagination
    const size = params.page?.size || 10;
    const paginatedInquiries = inquiries.slice(0, size);

    return { data: paginatedInquiries };
  }

  /**
   * Submit government ID for verification
   */
  async submitGovernmentId(
    inquiryId: string,
    document: GovernmentIdData,
  ): Promise<MockVerification> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Submitting government ID', {
      inquiryId,
      country: document.country,
      id_class: document.id_class,
    });

    if (!document.front_photo) {
      throw new BadRequestException('Front photo is required');
    }

    const verificationId = `ver_gov_id_${randomUUID()}`;
    const now = new Date().toISOString();

    // Simulate verification checks
    const checks: VerificationCheck[] = [
      {
        name: 'id-photo-quality',
        status: 'passed',
        reasons: [],
      },
      {
        name: 'id-authenticity',
        status: 'passed',
        reasons: [],
      },
      {
        name: 'id-number-match',
        status: 'passed',
        reasons: [],
      },
    ];

    const verification: MockVerification = {
      id: verificationId,
      type: 'verification/government-id',
      attributes: {
        status: 'submitted',
        created_at: now,
        submitted_at: now,
        completed_at: null,
        checks,
      },
    };

    this.verifications.set(verificationId, verification);

    // Update inquiry status to pending
    if (inquiry.attributes.status === 'created') {
      inquiry.attributes.status = 'pending';
      this.inquiries.set(inquiryId, inquiry);
    }

    this.logger.logWithFields('info', 'Government ID submitted', {
      inquiryId,
      verificationId,
    });

    return verification;
  }

  /**
   * Submit selfie for verification
   */
  async submitSelfie(
    inquiryId: string,
    selfieData: SelfieData,
  ): Promise<MockVerification> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Submitting selfie', { inquiryId });

    if (!selfieData.image) {
      throw new BadRequestException('Selfie image is required');
    }

    const verificationId = `ver_selfie_${randomUUID()}`;
    const now = new Date().toISOString();

    // Simulate verification checks
    const checks: VerificationCheck[] = [
      {
        name: 'selfie-quality',
        status: 'passed',
        reasons: [],
      },
      {
        name: 'liveness-check',
        status: 'passed',
        reasons: [],
      },
      {
        name: 'selfie-match',
        status: 'passed',
        reasons: [],
      },
    ];

    const verification: MockVerification = {
      id: verificationId,
      type: 'verification/selfie',
      attributes: {
        status: 'submitted',
        created_at: now,
        submitted_at: now,
        completed_at: null,
        checks,
      },
    };

    this.verifications.set(verificationId, verification);

    // Update inquiry status to pending
    if (inquiry.attributes.status === 'created') {
      inquiry.attributes.status = 'pending';
      this.inquiries.set(inquiryId, inquiry);
    }

    this.logger.logWithFields('info', 'Selfie submitted', {
      inquiryId,
      verificationId,
    });

    return verification;
  }

  /**
   * Check liveness (verify person is live)
   */
  async checkLiveness(inquiryId: string): Promise<MockVerification> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Checking liveness', { inquiryId });

    const verificationId = `ver_liveness_${randomUUID()}`;
    const now = new Date().toISOString();

    const checks: VerificationCheck[] = [
      {
        name: 'liveness-detected',
        status: 'passed',
        reasons: [],
      },
    ];

    const verification: MockVerification = {
      id: verificationId,
      type: 'verification/database',
      attributes: {
        status: 'passed',
        created_at: now,
        submitted_at: now,
        completed_at: now,
        checks,
      },
    };

    this.verifications.set(verificationId, verification);

    return verification;
  }

  /**
   * Auto-approve an inquiry (test helper)
   * Simulates successful verification
   */
  async autoApproveInquiry(inquiryId: string): Promise<MockInquiry> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Auto-approving inquiry', { inquiryId });

    // Update all fields with verified data
    inquiry.attributes.fields = {
      name_first: { type: 'string', value: 'John' },
      name_last: { type: 'string', value: 'Doe' },
      birthdate: { type: 'date', value: '1990-01-01' },
      address_street_1: { type: 'string', value: '123 Main St' },
      address_city: { type: 'string', value: 'San Francisco' },
      address_subdivision: { type: 'string', value: 'CA' },
      address_postal_code: { type: 'string', value: '94102' },
      identification_number: { type: 'string', value: 'D1234560000' },
    };

    // Simulate delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return this.updateInquiryStatus(inquiryId, 'completed');
  }

  /**
   * Auto-decline an inquiry (test helper)
   * Simulates failed verification
   */
  async autoDeclineInquiry(
    inquiryId: string,
    reason: string,
  ): Promise<MockInquiry> {
    const inquiry = await this.retrieveInquiry(inquiryId);

    this.logger.logWithFields('info', 'Auto-declining inquiry', {
      inquiryId,
      reason,
    });

    // Simulate delay (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return this.updateInquiryStatus(inquiryId, 'failed');
  }

  /**
   * Process automatic verification based on test scenarios
   * This simulates Persona's automatic processing
   */
  async processAutomaticVerification(
    inquiryId: string,
    licenseNumber: string,
  ): Promise<void> {
    this.logger.logWithFields('info', 'Processing automatic verification', {
      inquiryId,
      licenseNumber,
    });

    // Check test scenarios
    if (TEST_SCENARIOS.AUTO_APPROVE.pattern.test(licenseNumber)) {
      // Auto-approve in background (non-blocking)
      const timeout = setTimeout(async () => {
        this.scheduledTimeouts.delete(timeout);
        try {
          await this.autoApproveInquiry(inquiryId);
        } catch (error) {
          // Best-effort background processing; ignore if inquiry was cleared/deleted.
          this.logger.warn('Auto-approve background job failed', {
            inquiryId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, 2000);
      this.scheduledTimeouts.add(timeout);
    } else if (TEST_SCENARIOS.AUTO_DECLINE.pattern.test(licenseNumber)) {
      // Auto-decline in background (non-blocking)
      const timeout = setTimeout(async () => {
        this.scheduledTimeouts.delete(timeout);
        try {
          await this.autoDeclineInquiry(
            inquiryId,
            TEST_SCENARIOS.AUTO_DECLINE.reason,
          );
        } catch (error) {
          // Best-effort background processing; ignore if inquiry was cleared/deleted.
          this.logger.warn('Auto-decline background job failed', {
            inquiryId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, 2000);
      this.scheduledTimeouts.add(timeout);
    }
    // Otherwise, stays in pending for manual review
  }

  /**
   * Register webhook callback
   */
  registerWebhookCallback(
    callbackId: string,
    callback: (event: WebhookEvent) => void,
  ): void {
    this.webhookCallbacks.set(callbackId, callback);
    this.logger.logWithFields('debug', 'Webhook callback registered', {
      callbackId,
    });
  }

  /**
   * Unregister webhook callback
   */
  unregisterWebhookCallback(callbackId: string): void {
    this.webhookCallbacks.delete(callbackId);
    this.logger.logWithFields('debug', 'Webhook callback unregistered', {
      callbackId,
    });
  }

  /**
   * Emit webhook event
   */
  private async emitWebhook(
    eventType: WebhookEventType,
    data: MockInquiry | MockVerification,
  ): Promise<void> {
    const event: WebhookEvent = {
      type: eventType,
      id: `evt_${randomUUID()}`,
      created_at: new Date().toISOString(),
      data: {
        id: data.id,
        type: data.type === 'inquiry' ? 'inquiry' : 'verification',
        attributes: data.attributes,
      },
    };

    this.logger.logWithFields('info', 'Emitting webhook event', {
      eventType,
      eventId: event.id,
      dataId: data.id,
    });

    // Call all registered callbacks
    for (const [callbackId, callback] of this.webhookCallbacks.entries()) {
      try {
        await callback(event);
        this.logger.logWithFields('debug', 'Webhook callback executed', {
          callbackId,
          eventType,
        });
      } catch (error) {
        this.logger.error(
          'Webhook callback failed',
          error instanceof Error ? error.stack || '' : String(error),
          { callbackId, eventType },
        );
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    for (const timeout of this.scheduledTimeouts) {
      clearTimeout(timeout);
    }
    this.scheduledTimeouts.clear();
    this.inquiries.clear();
    this.verifications.clear();
    this.webhookCallbacks.clear();
    this.logger.logWithFields('info', 'All mock Persona data cleared', {});
  }

  /**
   * Get stats (for debugging)
   */
  getStats() {
    return {
      inquiries: this.inquiries.size,
      verifications: this.verifications.size,
      webhookCallbacks: this.webhookCallbacks.size,
    };
  }
}
