'use client';

import { DollarSign, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/**
 * Formats cents to USD currency string ($X.XX)
 * @param cents - Amount in cents
 * @returns Formatted currency string
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface PriceSummaryProps {
  /** Subtotal amount in cents (before tax) */
  subtotalCents: number;
  /** Tax amount in cents */
  taxCents: number;
  /** Total amount in cents (subtotal + tax) */
  totalCents: number;
  /** Deposit amount in cents */
  depositCents: number;
  /** Number of rental days */
  numDays: number;
  /** Daily rate in cents */
  dailyRateCents: number;
  /** Whether the component is collapsible (for Step 3) */
  expanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PriceSummary Component
 *
 * Displays rental price breakdown with daily rate, tax, total, and deposit information.
 * Supports both static and collapsible modes for different wizard steps.
 *
 * @example
 * ```tsx
 * <PriceSummary
 *   subtotalCents={45000}
 *   taxCents={3600}
 *   totalCents={48600}
 *   depositCents={10000}
 *   numDays={3}
 *   dailyRateCents={15000}
 * />
 * ```
 */
export function PriceSummary({
  subtotalCents,
  taxCents,
  totalCents,
  depositCents,
  numDays,
  dailyRateCents,
  expanded,
  className,
}: PriceSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(expanded ?? true);

  // Determine if component is controlled or uncontrolled
  const isControlled = expanded !== undefined;
  // Use prop value if controlled, otherwise use local state
  const displayExpanded = isControlled ? expanded : isExpanded;

  const toggleExpanded = () => {
    // Only allow toggle if component is uncontrolled (expanded prop not set)
    if (!isControlled) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card className={cn('bg-primary-50 border-primary-200', className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between',
            !isControlled && 'cursor-pointer'
          )}
          onClick={!isControlled ? toggleExpanded : undefined}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Price Summary</h3>
              <p className="text-sm text-neutral-600">Rental cost breakdown</p>
            </div>
          </div>
          {!isControlled && (
            <button
              type="button"
              className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
              aria-label={displayExpanded ? 'Collapse summary' : 'Expand summary'}
            >
              {displayExpanded ? (
                <ChevronUp className="w-5 h-5 text-neutral-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neutral-600" />
              )}
            </button>
          )}
        </div>

        {/* Breakdown Details */}
        {displayExpanded && (
          <div className="mt-6 space-y-3">
            {/* Rental breakdown */}
            <div className="flex justify-between text-neutral-700">
              <span className="text-sm">
                Rental ({numDays} {numDays === 1 ? 'day' : 'days'} × {formatCurrency(dailyRateCents)}/day)
              </span>
              <span className="font-medium">{formatCurrency(subtotalCents)}</span>
            </div>

            {/* Tax */}
            <div className="flex justify-between text-neutral-700">
              <span className="text-sm">Tax</span>
              <span className="font-medium">{formatCurrency(taxCents)}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-primary-300 my-3" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-neutral-900">Total</span>
              <span className="text-2xl font-bold text-primary-700">
                {formatCurrency(totalCents)}
              </span>
            </div>

            {/* Deposit Info */}
            <div className="mt-4 p-3 bg-white/60 rounded-lg border border-primary-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-neutral-700">
                  <span className="font-semibold">Security Deposit:</span>{' '}
                  {formatCurrency(depositCents)} will be held on your card and released within 5-7
                  business days after the vehicle is returned in good condition.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed view - show total only */}
        {!displayExpanded && (
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-700">Total</span>
            <span className="text-xl font-bold text-primary-700">
              {formatCurrency(totalCents)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
