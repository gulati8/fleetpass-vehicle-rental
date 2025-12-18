import { Test, TestingModule } from '@nestjs/testing';
import { PersonaMockService } from './persona-mock.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PersonaMockService', () => {
  let service: PersonaMockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonaMockService],
    }).compile();

    service = module.get<PersonaMockService>(PersonaMockService);
    service.clearAll(); // Clear any existing data
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('createInquiry', () => {
    it('should create a new inquiry with correct structure', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
        environment: 'sandbox',
      });

      expect(inquiry.id).toMatch(/^inq_mock_/);
      expect(inquiry.type).toBe('inquiry');
      expect(inquiry.attributes.status).toBe('created');
      expect(inquiry.attributes.reference_id).toBe('customer-123');
      expect(inquiry.attributes.created_at).toBeDefined();
      expect(inquiry.attributes.completed_at).toBeNull();
      expect(inquiry.attributes.failed_at).toBeNull();
      expect(inquiry.attributes.expired_at).toBeNull();
      expect(inquiry.attributes.fields).toEqual({});
    });

    it('should generate unique IDs for multiple inquiries', async () => {
      const inquiry1 = await service.createInquiry({
        reference_id: 'customer-1',
      });
      const inquiry2 = await service.createInquiry({
        reference_id: 'customer-2',
      });

      expect(inquiry1.id).not.toBe(inquiry2.id);
    });

    it('should emit inquiry.created webhook event', async () => {
      const webhookCallback = jest.fn();
      service.registerWebhookCallback('test', webhookCallback);

      await service.createInquiry({ reference_id: 'customer-123' });

      expect(webhookCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inquiry.created',
          data: expect.objectContaining({
            type: 'inquiry',
          }),
        }),
      );

      service.unregisterWebhookCallback('test');
    });
  });

  describe('retrieveInquiry', () => {
    it('should retrieve an existing inquiry', async () => {
      const created = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const retrieved = await service.retrieveInquiry(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should throw NotFoundException for non-existent inquiry', async () => {
      await expect(
        service.retrieveInquiry('inq_mock_nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateInquiryStatus', () => {
    it('should update inquiry status to completed', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const updated = await service.updateInquiryStatus(inquiry.id, 'completed');

      expect(updated.attributes.status).toBe('completed');
      expect(updated.attributes.completed_at).toBeDefined();
      expect(updated.attributes.failed_at).toBeNull();
    });

    it('should update inquiry status to failed', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const updated = await service.updateInquiryStatus(inquiry.id, 'failed');

      expect(updated.attributes.status).toBe('failed');
      expect(updated.attributes.failed_at).toBeDefined();
      expect(updated.attributes.completed_at).toBeNull();
    });

    it('should update inquiry status to expired', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const updated = await service.updateInquiryStatus(inquiry.id, 'expired');

      expect(updated.attributes.status).toBe('expired');
      expect(updated.attributes.expired_at).toBeDefined();
      expect(updated.attributes.completed_at).toBeNull();
    });

    it('should emit appropriate webhook events on status change', async () => {
      const webhookCallback = jest.fn();
      service.registerWebhookCallback('test', webhookCallback);

      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });
      webhookCallback.mockClear(); // Clear the inquiry.created event

      await service.updateInquiryStatus(inquiry.id, 'completed');

      expect(webhookCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inquiry.completed',
        }),
      );

      service.unregisterWebhookCallback('test');
    });
  });

  describe('listInquiries', () => {
    beforeEach(async () => {
      await service.createInquiry({ reference_id: 'customer-1' });
      await service.createInquiry({ reference_id: 'customer-2' });
      await service.createInquiry({ reference_id: 'customer-1' });
    });

    it('should list all inquiries', async () => {
      const result = await service.listInquiries();

      expect(result.data).toHaveLength(3);
    });

    it('should filter inquiries by reference_id', async () => {
      const result = await service.listInquiries({
        filter: { reference_id: 'customer-1' },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((i) => i.attributes.reference_id === 'customer-1')).toBe(true);
    });

    it('should filter inquiries by status', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-3',
      });
      await service.updateInquiryStatus(inquiry.id, 'completed');

      const result = await service.listInquiries({
        filter: { status: 'completed' },
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].attributes.status).toBe('completed');
    });

    it('should apply page size limit', async () => {
      const result = await service.listInquiries({
        page: { size: 2 },
      });

      expect(result.data).toHaveLength(2);
    });

    it('should sort by created_at descending', async () => {
      const result = await service.listInquiries();

      const dates = result.data.map((i) =>
        new Date(i.attributes.created_at).getTime(),
      );
      const sortedDates = [...dates].sort((a, b) => b - a);

      expect(dates).toEqual(sortedDates);
    });
  });

  describe('submitGovernmentId', () => {
    let inquiry: any;

    beforeEach(async () => {
      inquiry = await service.createInquiry({ reference_id: 'customer-123' });
    });

    it('should submit government ID successfully', async () => {
      const verification = await service.submitGovernmentId(inquiry.id, {
        front_photo: 'base64-encoded-front',
        back_photo: 'base64-encoded-back',
        country: 'US',
        id_class: 'dl',
      });

      expect(verification.id).toMatch(/^ver_gov_id_/);
      expect(verification.type).toBe('verification/government-id');
      expect(verification.attributes.status).toBe('submitted');
      expect(verification.attributes.checks).toHaveLength(3);
      expect(verification.attributes.checks.every((c) => c.status === 'passed')).toBe(true);
    });

    it('should throw error if front photo is missing', async () => {
      await expect(
        service.submitGovernmentId(inquiry.id, {
          front_photo: '',
          country: 'US',
          id_class: 'dl',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update inquiry status to pending', async () => {
      await service.submitGovernmentId(inquiry.id, {
        front_photo: 'base64-encoded-front',
        country: 'US',
        id_class: 'dl',
      });

      const updated = await service.retrieveInquiry(inquiry.id);
      expect(updated.attributes.status).toBe('pending');
    });
  });

  describe('submitSelfie', () => {
    let inquiry: any;

    beforeEach(async () => {
      inquiry = await service.createInquiry({ reference_id: 'customer-123' });
    });

    it('should submit selfie successfully', async () => {
      const verification = await service.submitSelfie(inquiry.id, {
        image: 'base64-encoded-selfie',
      });

      expect(verification.id).toMatch(/^ver_selfie_/);
      expect(verification.type).toBe('verification/selfie');
      expect(verification.attributes.status).toBe('submitted');
      expect(verification.attributes.checks).toHaveLength(3);
    });

    it('should throw error if image is missing', async () => {
      await expect(
        service.submitSelfie(inquiry.id, { image: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update inquiry status to pending', async () => {
      await service.submitSelfie(inquiry.id, {
        image: 'base64-encoded-selfie',
      });

      const updated = await service.retrieveInquiry(inquiry.id);
      expect(updated.attributes.status).toBe('pending');
    });
  });

  describe('checkLiveness', () => {
    it('should check liveness successfully', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const verification = await service.checkLiveness(inquiry.id);

      expect(verification.id).toMatch(/^ver_liveness_/);
      expect(verification.type).toBe('verification/database');
      expect(verification.attributes.status).toBe('passed');
      expect(verification.attributes.checks).toHaveLength(1);
      expect(verification.attributes.checks[0].name).toBe('liveness-detected');
    });
  });

  describe('autoApproveInquiry', () => {
    it('should auto-approve inquiry and set verified fields', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const approved = await service.autoApproveInquiry(inquiry.id);

      expect(approved.attributes.status).toBe('completed');
      expect(approved.attributes.completed_at).toBeDefined();
      expect(approved.attributes.fields.name_first?.value).toBe('John');
      expect(approved.attributes.fields.name_last?.value).toBe('Doe');
      expect(approved.attributes.fields.birthdate?.value).toBe('1990-01-01');
      expect(approved.attributes.fields.identification_number?.value).toBe('D1234560000');
    });
  });

  describe('autoDeclineInquiry', () => {
    it('should auto-decline inquiry', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });

      const declined = await service.autoDeclineInquiry(
        inquiry.id,
        'Document verification failed',
      );

      expect(declined.attributes.status).toBe('failed');
      expect(declined.attributes.failed_at).toBeDefined();
    });
  });

  describe('webhook callbacks', () => {
    it('should register and call webhook callback', async () => {
      const callback = jest.fn();
      service.registerWebhookCallback('test-callback', callback);

      await service.createInquiry({ reference_id: 'customer-123' });

      expect(callback).toHaveBeenCalled();
    });

    it('should unregister webhook callback', async () => {
      const callback = jest.fn();
      service.registerWebhookCallback('test-callback', callback);
      service.unregisterWebhookCallback('test-callback');

      await service.createInquiry({ reference_id: 'customer-123' });

      // The callback should still be called once from the inquiry.created event
      // because unregistering doesn't prevent the inquiry.created event
      // Let's test this differently
      callback.mockClear();

      const inquiry = await service.createInquiry({
        reference_id: 'customer-456',
      });
      await service.updateInquiryStatus(inquiry.id, 'completed');

      // After unregistering, no additional calls should be made
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      service.registerWebhookCallback('error-callback', errorCallback);

      // Should not throw
      await expect(
        service.createInquiry({ reference_id: 'customer-123' }),
      ).resolves.toBeDefined();

      service.unregisterWebhookCallback('error-callback');
    });
  });

  describe('clearAll', () => {
    it('should clear all data', async () => {
      await service.createInquiry({ reference_id: 'customer-1' });
      await service.createInquiry({ reference_id: 'customer-2' });

      service.clearAll();

      const result = await service.listInquiries();
      expect(result.data).toHaveLength(0);

      const stats = service.getStats();
      expect(stats.inquiries).toBe(0);
      expect(stats.verifications).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      const inquiry = await service.createInquiry({
        reference_id: 'customer-123',
      });
      await service.submitGovernmentId(inquiry.id, {
        front_photo: 'base64',
        country: 'US',
        id_class: 'dl',
      });

      const stats = service.getStats();

      expect(stats.inquiries).toBe(1);
      expect(stats.verifications).toBe(1);
    });
  });
});
