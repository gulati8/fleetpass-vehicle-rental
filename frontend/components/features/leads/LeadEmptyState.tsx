'use client';

import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

interface LeadEmptyStateProps {
  type: 'no-leads' | 'no-results';
  onAddLead?: () => void;
  onClearFilters?: () => void;
}

/**
 * LeadEmptyState - Display empty states for lead list
 *
 * Types:
 * - no-leads: Organization has no leads yet (initial state)
 * - no-results: Search/filter returned no results
 */
export function LeadEmptyState({
  type,
  onAddLead,
  onClearFilters,
}: LeadEmptyStateProps) {
  const config = {
    'no-leads': {
      icon: UserPlus,
      title: 'No leads yet',
      description: 'Get started by adding your first lead',
      buttonText: 'Add Your First Lead',
      onClick: onAddLead,
    },
    'no-results': {
      icon: Search,
      title: 'No leads found',
      description: 'Try adjusting your filters or search terms',
      buttonText: 'Clear Filters',
      onClick: onClearFilters,
    },
  };

  const { icon: Icon, title, description, buttonText, onClick } = config[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-neutral-400" />
      </div>

      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-neutral-600 mb-6 max-w-md">
        {description}
      </p>

      {onClick && (
        <Button
          variant="primary"
          size="md"
          onClick={onClick}
        >
          {buttonText}
        </Button>
      )}
    </div>
  );
}
