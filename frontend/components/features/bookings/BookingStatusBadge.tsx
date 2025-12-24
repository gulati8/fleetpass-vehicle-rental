'use client';

import { Clock, CheckCircle2, PlayCircle, XCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { cn } from '@/lib/utils';

type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

interface BookingStatusBadgeProps {
  status: BookingStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * BookingStatusBadge - Status visualization for bookings
 *
 * Status Flow: pending → confirmed → active → completed
 *               └─> cancelled (can happen at any stage)
 */
export function BookingStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: BookingStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as BookingStatus;

  // Status configuration
  const statusConfig = {
    pending: {
      variant: 'neutral' as const,
      icon: Clock,
      label: 'Pending',
      description: 'Awaiting confirmation',
      className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    },
    confirmed: {
      variant: 'primary' as const,
      icon: CheckCircle2,
      label: 'Confirmed',
      description: 'Booking confirmed',
      className: 'bg-primary-50 text-primary-700 border-primary-200',
    },
    active: {
      variant: 'success' as const,
      icon: PlayCircle,
      label: 'Active',
      description: 'Rental in progress',
      className: 'bg-success-50 text-success-700 border-success-200',
    },
    completed: {
      variant: 'success' as const,
      icon: Package,
      label: 'Completed',
      description: 'Rental completed',
      className: 'bg-success-100 text-success-800 border-success-300',
    },
    cancelled: {
      variant: 'error' as const,
      icon: XCircle,
      label: 'Cancelled',
      description: 'Booking cancelled',
      className: 'bg-error-50 text-error-700 border-error-200',
    },
  };

  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className={cn(
        size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
      )} />}
      <span>{config.label}</span>
    </Badge>
  );
}

/**
 * BookingStatusIndicator - Detailed status card with progress
 */
interface BookingStatusIndicatorProps {
  status: BookingStatus | string;
  pickupDate?: string;
  dropoffDate?: string;
  className?: string;
}

export function BookingStatusIndicator({
  status,
  pickupDate,
  dropoffDate,
  className,
}: BookingStatusIndicatorProps) {
  const normalizedStatus = status.toLowerCase() as BookingStatus;

  const statusInfo = {
    pending: {
      title: 'Pending Confirmation',
      description: 'This booking is waiting to be confirmed.',
      color: 'text-neutral-700',
      bgColor: 'bg-neutral-50',
      borderColor: 'border-neutral-200',
    },
    confirmed: {
      title: 'Confirmed',
      description: 'Booking confirmed and ready for pickup.',
      color: 'text-primary-700',
      bgColor: 'bg-primary-50',
      borderColor: 'border-primary-200',
    },
    active: {
      title: 'Active Rental',
      description: 'Vehicle is currently rented out.',
      color: 'text-success-700',
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
    },
    completed: {
      title: 'Completed',
      description: 'Rental has been completed successfully.',
      color: 'text-success-800',
      bgColor: 'bg-success-100',
      borderColor: 'border-success-300',
    },
    cancelled: {
      title: 'Cancelled',
      description: 'This booking has been cancelled.',
      color: 'text-error-700',
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
    },
  };

  const info = statusInfo[normalizedStatus] || statusInfo.pending;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4',
        info.bgColor,
        info.borderColor,
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={cn('font-semibold text-sm mb-1', info.color)}>
            {info.title}
          </h3>
          <p className="text-sm text-neutral-600">{info.description}</p>
        </div>
        <BookingStatusBadge status={status} size="sm" />
      </div>

      {(pickupDate || dropoffDate) && (
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-200">
          {pickupDate && (
            <div>
              <div className="text-xs text-neutral-500 mb-1">Pickup</div>
              <div className="text-sm font-medium text-neutral-900">
                {new Date(pickupDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
          {dropoffDate && (
            <div>
              <div className="text-xs text-neutral-500 mb-1">Drop-off</div>
              <div className="text-sm font-medium text-neutral-900">
                {new Date(dropoffDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
