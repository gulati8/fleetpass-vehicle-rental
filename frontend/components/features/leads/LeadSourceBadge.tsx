'use client';

import { Badge } from '@/components/ui/badge/Badge';
import { formatSourceDisplay } from '@/lib/validations/lead.validation';

interface LeadSourceBadgeProps {
  source: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * LeadSourceBadge - Source visualization for leads
 *
 * Displays the origin of a lead with consistent neutral styling.
 * All sources use neutral/gray variant to differentiate from status badges.
 *
 * Supported sources:
 * - website: From website form/contact
 * - phone: Phone call inquiry
 * - walk_in: Walk-in customer
 * - referral: Referred by existing customer
 * - social_media: Social media inquiry
 * - other: Other sources
 */
export function LeadSourceBadge({
  source,
  size = 'md',
  className,
}: LeadSourceBadgeProps) {
  return (
    <Badge
      variant="neutral"
      size={size}
      className={className}
    >
      {formatSourceDisplay(source)}
    </Badge>
  );
}
