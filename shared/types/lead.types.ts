/**
 * Lead status enum
 */
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

/**
 * Lead source enum (common values)
 */
export enum LeadSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  WALK_IN = 'walk_in',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  OTHER = 'other',
}

/**
 * Lead model (matches Prisma schema)
 */
export interface Lead {
  id: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  source: string | null;
  vehicleInterestId: string | null;
  status: string;
  assignedToId: string | null;
  notes: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lead with relations (for detail view)
 */
export interface LeadWithRelations extends Lead {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Create lead request
 */
export interface CreateLeadRequest {
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  source?: string;
  vehicleInterestId?: string;
  assignedToId?: string;
  notes?: string;
}

/**
 * Update lead request
 */
export interface UpdateLeadRequest {
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  source?: string;
  vehicleInterestId?: string;
  status?: LeadStatus | string;
  assignedToId?: string;
  notes?: string;
}

/**
 * Lead filters for search/list endpoints
 */
export interface LeadFilters {
  status?: string;
  assignedToId?: string;
  source?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
}
