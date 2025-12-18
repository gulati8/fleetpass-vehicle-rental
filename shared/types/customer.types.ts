/**
 * KYC status enum
 */
export enum KycStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Customer model (matches Prisma schema)
 */
export interface Customer {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  driverLicenseNumber: string | null;
  driverLicenseState: string | null;
  driverLicenseExpiry: string | null;
  kycStatus: string;
  kycInquiryId: string | null;
  kycVerifiedAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer with booking count (for dashboards)
 */
export interface CustomerWithStats extends Customer {
  bookingCount: number;
  totalSpentCents: number;
}

/**
 * Create customer request
 */
export interface CreateCustomerRequest {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  driverLicenseNumber?: string;
  driverLicenseState?: string;
  driverLicenseExpiry?: string;
}

/**
 * Update customer request
 */
export interface UpdateCustomerRequest {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  driverLicenseNumber?: string;
  driverLicenseState?: string;
  driverLicenseExpiry?: string;
  kycStatus?: KycStatus | string;
}
