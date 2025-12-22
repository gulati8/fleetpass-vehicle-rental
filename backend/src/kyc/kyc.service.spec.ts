import { Test, TestingModule } from '@nestjs/testing';
import { KycService } from './kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { PersonaMockService } from '../persona-mock/persona-mock.service';
import { CustomerService } from '../customer/customer.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('KycService', () => {
  let service: KycService;
  let prisma: PrismaService;
  let personaMock: PersonaMockService;
  let customerService: CustomerService;

  const ORG_ID = 'org-1';

  const mockCustomer: any = {
    id: 'customer-123',
    email: 'test@example.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    driverLicenseNumber: 'D1234567890',
    driverLicenseState: 'CA',
    driverLicenseExpiry: new Date('2025-12-31'),
    kycStatus: 'pending',
    kycInquiryId: null,
    kycVerifiedAt: null,
    stripeCustomerId: null,
    organizationId: ORG_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookings: [],
    _count: {
      bookings: 0,
      leads: 0,
      deals: 0,
    },
  };

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        PersonaMockService,
        CustomerService,
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    prisma = module.get<PrismaService>(PrismaService);
    personaMock = module.get<PersonaMockService>(PersonaMockService);
    customerService = module.get<CustomerService>(CustomerService);

    // Clear mock data
    personaMock.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
    personaMock.clearAll();
  });

  describe('createInquiry', () => {
    it('should create a new KYC inquiry for customer', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'update').mockResolvedValue({
        ...mockCustomer,
        kycInquiryId: expect.any(String),
        kycStatus: 'in_progress',
      });

      const inquiry = await service.createInquiry(mockCustomer.id, ORG_ID);

      expect(inquiry.id).toMatch(/^inq_mock_/);
      expect(inquiry.attributes.reference_id).toBe(mockCustomer.id);
      expect(customerService.update).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          kycInquiryId: expect.any(String),
          kycStatus: 'in_progress',
        }),
        ORG_ID,
      );
    });

    it('should throw ConflictException if customer already verified', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue({
        ...mockCustomer,
        kycStatus: 'approved',
      });

      await expect(
        service.createInquiry(mockCustomer.id, ORG_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('should return existing inquiry if already in progress', async () => {
      // Mock update spy before the test
      const updateSpy = jest.spyOn(customerService, 'update');

      const existingInquiryId = 'inq_mock_existing';
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue({
        ...mockCustomer,
        kycInquiryId: existingInquiryId,
        kycStatus: 'in_progress',
      });

      // Create the inquiry in the mock
      const existingInquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });
      // Manually set the ID to match
      (existingInquiry as any).id = existingInquiryId;
      personaMock['inquiries'].set(existingInquiryId, existingInquiry);

      const inquiry = await service.createInquiry(mockCustomer.id, ORG_ID);

      expect(inquiry.id).toBe(existingInquiryId);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      jest
        .spyOn(customerService, 'findOne')
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.createInquiry('nonexistent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInquiry', () => {
    it('should retrieve inquiry by ID', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);

      const retrieved = await service.getInquiry(inquiry.id, ORG_ID);

      expect(retrieved.id).toBe(inquiry.id);
      expect(retrieved.attributes.reference_id).toBe(mockCustomer.id);
    });

    it('should throw NotFoundException for non-existent inquiry', async () => {
      await expect(
        service.getInquiry('inq_mock_nonexistent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitGovernmentId', () => {
    let inquiry: any;

    beforeEach(async () => {
      inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
    });

    it('should submit government ID successfully', async () => {
      const verification = await service.submitGovernmentId(
        inquiry.id,
        {
          front_photo: 'base64-front',
          back_photo: 'base64-back',
          country: 'US',
          id_class: 'dl',
        },
        ORG_ID,
      );

      expect(verification.id).toMatch(/^ver_gov_id_/);
      expect(verification.type).toBe('verification/government-id');
      expect(verification.attributes.status).toBe('submitted');
    });

    it('should throw BadRequestException for completed inquiry', async () => {
      await personaMock.updateInquiryStatus(inquiry.id, 'completed');

      await expect(
        service.submitGovernmentId(
          inquiry.id,
          {
            front_photo: 'base64-front',
            country: 'US',
            id_class: 'dl',
          },
          ORG_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for failed inquiry', async () => {
      await personaMock.updateInquiryStatus(inquiry.id, 'failed');

      await expect(
        service.submitGovernmentId(
          inquiry.id,
          {
            front_photo: 'base64-front',
            country: 'US',
            id_class: 'dl',
          },
          ORG_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should trigger auto-processing for test scenarios', async () => {
      const customerWithAutoApprove = {
        ...mockCustomer,
        driverLicenseNumber: 'D1234560000', // ends with 0000
      };
      jest
        .spyOn(customerService, 'findOne')
        .mockResolvedValue(customerWithAutoApprove);

      const processAutoSpy = jest.spyOn(
        personaMock,
        'processAutomaticVerification',
      );

      await service.submitGovernmentId(
        inquiry.id,
        {
          front_photo: 'base64-front',
          country: 'US',
          id_class: 'dl',
        },
        ORG_ID,
      );

      expect(processAutoSpy).toHaveBeenCalledWith(
        inquiry.id,
        customerWithAutoApprove.driverLicenseNumber,
      );
    });
  });

  describe('submitSelfie', () => {
    let inquiry: any;

    beforeEach(async () => {
      inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
    });

    it('should submit selfie successfully', async () => {
      const verification = await service.submitSelfie(
        inquiry.id,
        {
          image: 'base64-selfie',
        },
        ORG_ID,
      );

      expect(verification.id).toMatch(/^ver_selfie_/);
      expect(verification.type).toBe('verification/selfie');
      expect(verification.attributes.status).toBe('submitted');
    });

    it('should throw BadRequestException for completed inquiry', async () => {
      await personaMock.updateInquiryStatus(inquiry.id, 'completed');

      await expect(
        service.submitSelfie(inquiry.id, { image: 'base64-selfie' }, ORG_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveInquiry', () => {
    it('should manually approve inquiry', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);

      const approved = await service.approveInquiry(inquiry.id, ORG_ID);

      expect(approved.attributes.status).toBe('completed');
      expect(approved.attributes.completed_at).toBeDefined();
    }, 10000);

    it('should throw NotFoundException for non-existent inquiry', async () => {
      await expect(
        service.approveInquiry('inq_mock_nonexistent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('declineInquiry', () => {
    it('should manually decline inquiry', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);

      const declined = await service.declineInquiry(
        inquiry.id,
        'Invalid document',
        ORG_ID,
      );

      expect(declined.attributes.status).toBe('failed');
      expect(declined.attributes.failed_at).toBeDefined();
    });

    it('should throw NotFoundException for non-existent inquiry', async () => {
      await expect(
        service.declineInquiry('inq_mock_nonexistent', 'Test reason', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe.skip('webhook handling (skipped - tested in integration tests)', () => {
    it('should update customer status on inquiry.completed', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
      const updateSpy = jest
        .spyOn(customerService, 'update')
        .mockResolvedValue({
          ...mockCustomer,
          kycStatus: 'approved',
          kycVerifiedAt: expect.any(Date),
        });

      // Trigger completion (which emits webhook)
      await personaMock.autoApproveInquiry(inquiry.id);

      // Wait for webhook to be processed (includes 2s delay)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(updateSpy).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          kycStatus: 'approved',
          kycVerifiedAt: expect.any(Date),
        }),
        ORG_ID,
      );
    }, 10000);

    it('should update customer status on inquiry.failed', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
      const updateSpy = jest
        .spyOn(customerService, 'update')
        .mockResolvedValue({
          ...mockCustomer,
          kycStatus: 'rejected',
        });

      // Trigger failure (which emits webhook)
      await personaMock.autoDeclineInquiry(inquiry.id, 'Test failure');

      // Wait for webhook to be processed (includes 2s delay)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(updateSpy).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          kycStatus: 'rejected',
        }),
        ORG_ID,
      );
    }, 10000);

    it('should reset customer status on inquiry.expired', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
      const updateSpy = jest
        .spyOn(customerService, 'update')
        .mockResolvedValue({
          ...mockCustomer,
          kycStatus: 'pending',
          kycInquiryId: null,
        });

      // Trigger expiration (which emits webhook)
      await personaMock.updateInquiryStatus(inquiry.id, 'expired');

      // Wait for webhook to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updateSpy).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          kycStatus: 'pending',
          kycInquiryId: null,
        }),
        ORG_ID,
      );
    });

    it('should extract and update verified data on completion', async () => {
      const inquiry = await personaMock.createInquiry({
        reference_id: mockCustomer.id,
      });

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      jest.spyOn(customerService, 'findOne').mockResolvedValue(mockCustomer);
      const updateSpy = jest
        .spyOn(customerService, 'update')
        .mockResolvedValue(mockCustomer);

      // Trigger auto-approval (which sets verified fields)
      await personaMock.autoApproveInquiry(inquiry.id);

      // Wait for webhook to be processed (includes 2s delay)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      expect(updateSpy).toHaveBeenCalledWith(
        mockCustomer.id,
        expect.objectContaining({
          kycStatus: 'approved',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: expect.any(Date),
          driverLicenseNumber: 'D1234560000',
        }),
        ORG_ID,
      );
    }, 10000);
  });
});
