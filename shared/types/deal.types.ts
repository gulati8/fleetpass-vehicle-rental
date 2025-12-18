/**
 * Deal status enum
 */
export enum DealStatus {
  PENDING = 'pending',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

/**
 * Deal model (matches Prisma schema)
 */
export interface Deal {
  id: string;
  leadId: string | null;
  customerId: string;
  vehicleId: string;
  dealValueCents: number;
  status: string;
  closedAt: string | null;
  closedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deal with relations (for detail view)
 */
export interface DealWithRelations extends Deal {
  lead?: {
    id: string;
    source: string | null;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  closedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Create deal request
 */
export interface CreateDealRequest {
  leadId?: string;
  customerId: string;
  vehicleId: string;
  dealValueCents: number;
  notes?: string;
}

/**
 * Update deal request
 */
export interface UpdateDealRequest {
  dealValueCents?: number;
  status?: DealStatus | string;
  closedById?: string;
  notes?: string;
}

/**
 * Deal filters for search/list endpoints
 */
export interface DealFilters {
  status?: string;
  customerId?: string;
  closedById?: string;
  closedDateFrom?: string;
  closedDateTo?: string;
}
