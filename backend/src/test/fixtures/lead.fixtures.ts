export const mockLead = {
  id: 'lead-123',
  customerId: 'customer-123',
  customerEmail: 'john.doe@example.com',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  source: 'website',
  vehicleInterestId: 'vehicle-123',
  status: 'new',
  assignedToId: 'user-123',
  notes: 'Interested in SUVs',
  createdById: 'user-456',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockLeadWithRelations = {
  ...mockLead,
  customer: {
    id: 'customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    driverLicenseNumber: 'DL123456',
    driverLicenseState: 'CA',
    driverLicenseExpiry: new Date('2025-01-01'),
    kycStatus: 'approved',
    kycInquiryId: 'inquiry-123',
    kycVerifiedAt: new Date('2024-01-01'),
    stripeCustomerId: 'cus_123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  assignedTo: {
    id: 'user-123',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    role: 'sales_agent',
  },
  createdBy: {
    id: 'user-456',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
  },
  deals: [],
};

export const mockUser = {
  id: 'user-123',
  organizationId: 'org-123',
  email: 'jane.smith@example.com',
  passwordHash: 'hashed',
  firstName: 'Jane',
  lastName: 'Smith',
  role: 'sales_agent',
  locationId: null,
  isActive: true,
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDeal = {
  id: 'deal-123',
  leadId: 'lead-123',
  customerId: 'customer-123',
  vehicleId: 'vehicle-123',
  dealValueCents: 3000000, // $30,000
  status: 'pending',
  closedAt: null,
  closedById: null,
  notes: 'Standard deal',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export const mockDealWithRelations = {
  ...mockDeal,
  customer: {
    id: 'customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
  },
  lead: {
    id: 'lead-123',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    source: 'website',
    status: 'converted',
  },
  closedBy: null,
};
