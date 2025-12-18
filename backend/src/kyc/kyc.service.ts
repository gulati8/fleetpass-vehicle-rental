import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { PersonaMockService } from '../persona-mock/persona-mock.service';
import { CustomerService } from '../customer/customer.service';
import {
  GovernmentIdData,
  SelfieData,
  WebhookEvent,
} from '../persona-mock/types/persona-mock.types';

@Injectable()
export class KycService {
  private readonly logger = new LoggerService('KycService');

  constructor(
    private prisma: PrismaService,
    private personaMock: PersonaMockService,
    private customerService: CustomerService,
  ) {
    // Register webhook callback on service initialization
    this.personaMock.registerWebhookCallback('kyc-service', (event) =>
      this.handleWebhook(event),
    );
  }

  /**
   * Create KYC inquiry for a customer
   */
  async createInquiry(customerId: string) {
    this.logger.logWithFields('info', 'Creating KYC inquiry', { customerId });

    try {
      // Validate customer exists
      const customer = await this.customerService.findOne(customerId);

      // Check if customer is already verified
      if (customer.kycStatus === 'approved') {
        throw new ConflictException('Customer is already verified');
      }

      // Check if there's already an active inquiry
      if (
        customer.kycInquiryId &&
        (customer.kycStatus === 'in_progress' || customer.kycStatus === 'pending')
      ) {
        // Return existing inquiry
        const existingInquiry = await this.personaMock.retrieveInquiry(
          customer.kycInquiryId,
        );
        this.logger.logWithFields('info', 'Returning existing inquiry', {
          customerId,
          inquiryId: existingInquiry.id,
        });
        return existingInquiry;
      }

      // Create Persona inquiry
      const inquiry = await this.personaMock.createInquiry({
        reference_id: customerId,
        environment: 'sandbox',
      });

      // Update customer with inquiry ID and status
      await this.customerService.update(customerId, {
        kycInquiryId: inquiry.id,
        kycStatus: 'in_progress',
      });

      this.logger.logWithFields('info', 'KYC inquiry created', {
        customerId,
        inquiryId: inquiry.id,
        type: 'kyc_event',
        event: 'inquiry.created',
      });

      return inquiry;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        'Failed to create KYC inquiry',
        error instanceof Error ? error.stack || '' : String(error),
        { customerId },
      );
      throw new InternalServerErrorException('KYC inquiry creation failed');
    }
  }

  /**
   * Get inquiry status
   */
  async getInquiry(inquiryId: string) {
    this.logger.logWithFields('debug', 'Retrieving KYC inquiry', {
      inquiryId,
    });

    try {
      const inquiry = await this.personaMock.retrieveInquiry(inquiryId);

      // Verify inquiry belongs to a customer in our system
      if (inquiry.attributes.reference_id) {
        await this.customerService.findOne(inquiry.attributes.reference_id);
      }

      return inquiry;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        'Failed to retrieve KYC inquiry',
        error instanceof Error ? error.stack || '' : String(error),
        { inquiryId },
      );
      throw new InternalServerErrorException('KYC inquiry retrieval failed');
    }
  }

  /**
   * Submit government ID for verification
   */
  async submitGovernmentId(inquiryId: string, document: GovernmentIdData) {
    this.logger.logWithFields('info', 'Submitting government ID', {
      inquiryId,
      country: document.country,
      idClass: document.id_class,
    });

    try {
      // Get inquiry and validate it exists
      const inquiry = await this.getInquiry(inquiryId);

      // Validate inquiry is in correct state
      if (
        inquiry.attributes.status === 'completed' ||
        inquiry.attributes.status === 'failed'
      ) {
        throw new BadRequestException(
          `Cannot submit document for ${inquiry.attributes.status} inquiry`,
        );
      }

      // Submit to Persona mock
      const verification = await this.personaMock.submitGovernmentId(
        inquiryId,
        document,
      );

      this.logger.logWithFields('info', 'Government ID submitted', {
        inquiryId,
        verificationId: verification.id,
        type: 'kyc_event',
        event: 'verification.submitted',
      });

      // If customer has driver's license number, check for auto-processing
      if (inquiry.attributes.reference_id) {
        const customer = await this.customerService.findOne(
          inquiry.attributes.reference_id,
        );

        if (customer.driverLicenseNumber) {
          // Trigger automatic verification in background
          await this.personaMock.processAutomaticVerification(
            inquiryId,
            customer.driverLicenseNumber,
          );
        }
      }

      return verification;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        'Failed to submit government ID',
        error instanceof Error ? error.stack || '' : String(error),
        { inquiryId },
      );
      throw new InternalServerErrorException('Government ID submission failed');
    }
  }

  /**
   * Submit selfie for verification
   */
  async submitSelfie(inquiryId: string, selfieData: SelfieData) {
    this.logger.logWithFields('info', 'Submitting selfie', { inquiryId });

    try {
      // Get inquiry and validate it exists
      const inquiry = await this.getInquiry(inquiryId);

      // Validate inquiry is in correct state
      if (
        inquiry.attributes.status === 'completed' ||
        inquiry.attributes.status === 'failed'
      ) {
        throw new BadRequestException(
          `Cannot submit selfie for ${inquiry.attributes.status} inquiry`,
        );
      }

      // Submit to Persona mock
      const verification = await this.personaMock.submitSelfie(
        inquiryId,
        selfieData,
      );

      this.logger.logWithFields('info', 'Selfie submitted', {
        inquiryId,
        verificationId: verification.id,
        type: 'kyc_event',
        event: 'verification.submitted',
      });

      return verification;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        'Failed to submit selfie',
        error instanceof Error ? error.stack || '' : String(error),
        { inquiryId },
      );
      throw new InternalServerErrorException('Selfie submission failed');
    }
  }

  /**
   * Approve inquiry (test helper)
   */
  async approveInquiry(inquiryId: string) {
    this.logger.logWithFields('info', 'Manually approving inquiry', {
      inquiryId,
    });

    try {
      // Validate inquiry exists and belongs to our system
      await this.getInquiry(inquiryId);

      // Auto-approve via Persona mock
      const inquiry = await this.personaMock.autoApproveInquiry(inquiryId);

      this.logger.logWithFields('info', 'Inquiry manually approved', {
        inquiryId,
        status: inquiry.attributes.status,
      });

      return inquiry;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        'Failed to approve inquiry',
        error instanceof Error ? error.stack || '' : String(error),
        { inquiryId },
      );
      throw new InternalServerErrorException('Inquiry approval failed');
    }
  }

  /**
   * Decline inquiry (test helper)
   */
  async declineInquiry(inquiryId: string, reason: string) {
    this.logger.logWithFields('info', 'Manually declining inquiry', {
      inquiryId,
      reason,
    });

    try {
      // Validate inquiry exists and belongs to our system
      await this.getInquiry(inquiryId);

      // Auto-decline via Persona mock
      const inquiry = await this.personaMock.autoDeclineInquiry(
        inquiryId,
        reason,
      );

      this.logger.logWithFields('info', 'Inquiry manually declined', {
        inquiryId,
        status: inquiry.attributes.status,
        reason,
      });

      return inquiry;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        'Failed to decline inquiry',
        error instanceof Error ? error.stack || '' : String(error),
        { inquiryId },
      );
      throw new InternalServerErrorException('Inquiry decline failed');
    }
  }

  /**
   * Handle webhook events from Persona mock
   */
  private async handleWebhook(event: WebhookEvent): Promise<void> {
    this.logger.logWithFields('info', 'KYC webhook received', {
      type: 'kyc_webhook',
      event: event.type,
      eventId: event.id,
      dataId: event.data.id,
    });

    try {
      switch (event.type) {
        case 'inquiry.completed':
          await this.handleInquiryCompleted(event);
          break;
        case 'inquiry.failed':
          await this.handleInquiryFailed(event);
          break;
        case 'inquiry.expired':
          await this.handleInquiryExpired(event);
          break;
        default:
          this.logger.logWithFields('debug', 'Unhandled webhook event', {
            event: event.type,
          });
      }
    } catch (error) {
      this.logger.error(
        'Failed to handle webhook event',
        error instanceof Error ? error.stack || '' : String(error),
        { eventType: event.type, eventId: event.id },
      );
      // Don't throw - webhooks should fail silently
    }
  }

  /**
   * Handle inquiry.completed webhook
   */
  private async handleInquiryCompleted(event: WebhookEvent): Promise<void> {
    const inquiryId = event.data.id;
    const inquiry = await this.personaMock.retrieveInquiry(inquiryId);

    if (!inquiry.attributes.reference_id) {
      this.logger.warn('Inquiry has no reference_id', { inquiryId });
      return;
    }

    const customerId = inquiry.attributes.reference_id;

    // Extract verified data from inquiry
    const updateData: any = {
      kycStatus: 'approved',
      kycVerifiedAt: new Date(),
    };

    // Update customer name if provided
    if (inquiry.attributes.fields.name_first?.value) {
      updateData.firstName = inquiry.attributes.fields.name_first.value;
    }
    if (inquiry.attributes.fields.name_last?.value) {
      updateData.lastName = inquiry.attributes.fields.name_last.value;
    }

    // Update date of birth if provided
    if (inquiry.attributes.fields.birthdate?.value) {
      updateData.dateOfBirth = new Date(
        inquiry.attributes.fields.birthdate.value,
      );
    }

    // Update driver's license if provided
    if (inquiry.attributes.fields.identification_number?.value) {
      updateData.driverLicenseNumber =
        inquiry.attributes.fields.identification_number.value;
    }

    // Update customer record
    await this.customerService.update(customerId, updateData);

    this.logger.logWithFields('info', 'Customer KYC approved', {
      customerId,
      inquiryId,
      type: 'kyc_event',
      event: 'customer.kyc_approved',
    });
  }

  /**
   * Handle inquiry.failed webhook
   */
  private async handleInquiryFailed(event: WebhookEvent): Promise<void> {
    const inquiryId = event.data.id;
    const inquiry = await this.personaMock.retrieveInquiry(inquiryId);

    if (!inquiry.attributes.reference_id) {
      this.logger.warn('Inquiry has no reference_id', { inquiryId });
      return;
    }

    const customerId = inquiry.attributes.reference_id;

    // Update customer status to rejected
    await this.customerService.update(customerId, {
      kycStatus: 'rejected',
    });

    this.logger.logWithFields('info', 'Customer KYC rejected', {
      customerId,
      inquiryId,
      type: 'kyc_event',
      event: 'customer.kyc_rejected',
    });
  }

  /**
   * Handle inquiry.expired webhook
   */
  private async handleInquiryExpired(event: WebhookEvent): Promise<void> {
    const inquiryId = event.data.id;
    const inquiry = await this.personaMock.retrieveInquiry(inquiryId);

    if (!inquiry.attributes.reference_id) {
      this.logger.warn('Inquiry has no reference_id', { inquiryId });
      return;
    }

    const customerId = inquiry.attributes.reference_id;

    // Reset to pending so they can try again
    await this.customerService.update(customerId, {
      kycStatus: 'pending',
      kycInquiryId: undefined,
    });

    this.logger.logWithFields('info', 'Customer KYC inquiry expired', {
      customerId,
      inquiryId,
      type: 'kyc_event',
      event: 'customer.kyc_expired',
    });
  }
}
