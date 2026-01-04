'use client';

import { Badge } from '@/components/ui/badge/Badge';
import { formatStatusDisplay } from '@/lib/validations/lead.validation';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

interface LeadStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LeadStatusBadge - Status visualization for leads
 *
 * Status Flow: new → contacted → qualified → converted
 *               └─> lost (can happen at any stage)
 *
 * Color mapping:
 * - new: primary (blue) - Fresh lead
 * - contacted: secondary (purple) - Initial contact made
 * - qualified: warning (yellow) - Qualified opportunity
 * - converted: success (green) - Successfully converted to customer/booking
 * - lost: error (red) - Lead lost or disqualified
 */
export function LeadStatusBadge({
  status,
  size = 'md',
  className,
}: LeadStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as LeadStatus;

  // Status configuration
  const statusConfig = {
    new: {
      variant: 'primary' as const,
      label: 'New',
    },
    contacted: {
      variant: 'secondary' as const,
      label: 'Contacted',
    },
    qualified: {
      variant: 'warning' as const,
      label: 'Qualified',
    },
    converted: {
      variant: 'success' as const,
      label: 'Converted',
    },
    lost: {
      variant: 'error' as const,
      label: 'Lost',
    },
  };

  const config = statusConfig[normalizedStatus] || {
    variant: 'neutral' as const,
    label: formatStatusDisplay(status),
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
