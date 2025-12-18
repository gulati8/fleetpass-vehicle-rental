/**
 * Persona Mock Types
 * Simulates Persona API data structures for KYC/identity verification
 * @see https://docs.withpersona.com/reference/inquiries
 */

export type InquiryStatus =
  | 'created'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'expired';

export type VerificationStatus =
  | 'initiated'
  | 'submitted'
  | 'passed'
  | 'failed';

export type CheckStatus = 'not_applicable' | 'passed' | 'failed';

export type IdClass = 'dl' | 'pp' | 'id'; // driver's license, passport, ID card

/**
 * Inquiry Field Value
 */
export interface InquiryFieldValue<T = string> {
  type: string;
  value: T;
}

/**
 * Mock Persona Inquiry
 * Represents a verification session
 */
export interface MockInquiry {
  id: string;
  type: 'inquiry';
  attributes: {
    status: InquiryStatus;
    reference_id: string | null; // Your customer ID
    created_at: string;
    completed_at: string | null;
    failed_at: string | null;
    expired_at: string | null;
    fields: {
      name_first?: InquiryFieldValue<string>;
      name_last?: InquiryFieldValue<string>;
      birthdate?: InquiryFieldValue<string>;
      address_street_1?: InquiryFieldValue<string>;
      address_street_2?: InquiryFieldValue<string>;
      address_city?: InquiryFieldValue<string>;
      address_subdivision?: InquiryFieldValue<string>; // state
      address_postal_code?: InquiryFieldValue<string>;
      identification_number?: InquiryFieldValue<string>; // driver's license number
    };
  };
}

/**
 * Verification Check
 */
export interface VerificationCheck {
  name: string;
  status: CheckStatus;
  reasons: string[];
}

/**
 * Mock Verification
 * Represents a specific verification type (ID, selfie, etc.)
 */
export interface MockVerification {
  id: string;
  type: 'verification/government-id' | 'verification/selfie' | 'verification/database';
  attributes: {
    status: VerificationStatus;
    created_at: string;
    submitted_at: string | null;
    completed_at: string | null;
    checks: VerificationCheck[];
  };
}

/**
 * Government ID Document Data
 */
export interface GovernmentIdData {
  front_photo: string; // base64 or URL
  back_photo?: string;
  country: string;
  id_class: IdClass;
}

/**
 * Selfie Data
 */
export interface SelfieData {
  image: string; // base64 or URL
}

/**
 * Create Inquiry Parameters
 */
export interface CreateInquiryParams {
  reference_id: string; // Customer ID
  template_id?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * List Inquiries Parameters
 */
export interface ListInquiriesParams {
  page?: {
    size?: number;
    after?: string;
  };
  filter?: {
    reference_id?: string;
    status?: string;
  };
}

/**
 * Test Scenarios
 * Deterministic behavior based on input for testing
 */
export const TEST_SCENARIOS = {
  AUTO_APPROVE: {
    // If government ID number ends with '0000'
    pattern: /0000$/,
    result: 'approved' as const,
  },
  AUTO_DECLINE: {
    // If government ID number ends with '9999'
    pattern: /9999$/,
    result: 'declined' as const,
    reason: 'Document verification failed',
  },
  MANUAL_REVIEW: {
    // All other cases
    result: 'manual_review' as const,
  },
};

/**
 * Webhook Event Types
 */
export type WebhookEventType =
  | 'inquiry.created'
  | 'inquiry.completed'
  | 'inquiry.failed'
  | 'inquiry.expired'
  | 'verification.passed'
  | 'verification.failed';

/**
 * Webhook Event Data
 */
export interface WebhookEvent {
  type: WebhookEventType;
  id: string; // event ID
  created_at: string;
  data: {
    id: string; // inquiry or verification ID
    type: 'inquiry' | 'verification';
    attributes: any;
  };
}
