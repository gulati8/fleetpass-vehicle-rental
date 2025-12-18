'use client';

import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge/Badge';
import { cn } from '@/lib/utils';

type KYCStatus = 'pending' | 'in_progress' | 'approved' | 'rejected';

interface KYCStatusBadgeProps {
  status: KYCStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * KYCStatusBadge - Premium status visualization for KYC verification
 *
 * Color Psychology:
 * - Gray (Pending): Neutral, waiting state
 * - Blue (In Progress): Active, trustworthy process
 * - Green (Approved): Success, verified, safe
 * - Red (Rejected): Attention needed, requires action
 */
export function KYCStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: KYCStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase() as KYCStatus;

  // Status configuration
  const statusConfig = {
    pending: {
      variant: 'neutral' as const,
      icon: Clock,
      label: 'Pending',
      description: 'Verification not started',
      className: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    },
    in_progress: {
      variant: 'primary' as const,
      icon: Loader2,
      label: 'In Progress',
      description: 'Verifying identity',
      className: 'bg-primary-50 text-primary-700 border-primary-200',
    },
    approved: {
      variant: 'success' as const,
      icon: CheckCircle2,
      label: 'Approved',
      description: 'Identity verified',
      className: 'bg-success-50 text-success-700 border-success-200',
    },
    rejected: {
      variant: 'error' as const,
      icon: XCircle,
      label: 'Declined',
      description: 'Verification failed',
      className: 'bg-error-50 text-error-700 border-error-200',
    },
  };

  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;

  // Size configuration
  const sizeConfig = {
    sm: {
      badge: 'text-xs px-2 py-0.5',
      icon: 'w-3 h-3',
      gap: 'gap-1',
    },
    md: {
      badge: 'text-sm px-2.5 py-1',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1.5',
    },
    lg: {
      badge: 'text-base px-3 py-1.5',
      icon: 'w-4 h-4',
      gap: 'gap-2',
    },
  };

  const sizing = sizeConfig[size];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center font-medium border',
        sizing.badge,
        sizing.gap,
        config.className,
        className
      )}
      title={config.description}
    >
      {showIcon && (
        <Icon
          className={cn(
            sizing.icon,
            normalizedStatus === 'in_progress' && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </Badge>
  );
}

/**
 * KYCStatusIndicator - More detailed status display with additional context
 */
interface KYCStatusIndicatorProps {
  status: KYCStatus | string;
  verifiedAt?: string | null;
  className?: string;
}

export function KYCStatusIndicator({
  status,
  verifiedAt,
  className,
}: KYCStatusIndicatorProps) {
  const normalizedStatus = status.toLowerCase() as KYCStatus;

  const statusConfig = {
    pending: {
      icon: Clock,
      title: 'Verification Pending',
      description: 'Customer has not started KYC verification',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-100',
    },
    in_progress: {
      icon: Loader2,
      title: 'Verification In Progress',
      description: 'Identity verification is being processed',
      color: 'text-primary-600',
      bgColor: 'bg-primary-100',
    },
    approved: {
      icon: CheckCircle2,
      title: 'Verified',
      description: verifiedAt
        ? `Verified on ${new Date(verifiedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`
        : 'Identity successfully verified',
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    },
    rejected: {
      icon: AlertCircle,
      title: 'Verification Declined',
      description: 'Identity verification did not pass. Customer may retry.',
      color: 'text-error-600',
      bgColor: 'bg-error-100',
    },
  };

  const config = statusConfig[normalizedStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', className)}>
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          config.bgColor
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5',
            config.color,
            normalizedStatus === 'in_progress' && 'animate-spin'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-neutral-900 mb-1">
          {config.title}
        </h4>
        <p className="text-sm text-neutral-600">{config.description}</p>
      </div>
    </div>
  );
}

/**
 * KYC Verification Steps Display
 */
interface KYCStepsProps {
  governmentIdVerified: boolean;
  selfieVerified: boolean;
  addressVerified?: boolean;
  className?: string;
}

export function KYCSteps({
  governmentIdVerified,
  selfieVerified,
  addressVerified = false,
  className,
}: KYCStepsProps) {
  const steps = [
    {
      name: 'Government ID',
      completed: governmentIdVerified,
    },
    {
      name: 'Selfie Match',
      completed: selfieVerified,
    },
    {
      name: 'Address',
      completed: addressVerified,
    },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {steps.map((step, index) => (
        <div key={step.name} className="flex items-center gap-2">
          <div
            className={cn(
              'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors',
              step.completed
                ? 'bg-success-100 text-success-600'
                : 'bg-neutral-100 text-neutral-400'
            )}
          >
            {step.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-current" />
            )}
          </div>
          <span
            className={cn(
              'text-sm',
              step.completed ? 'text-neutral-900 font-medium' : 'text-neutral-500'
            )}
          >
            {step.name}
          </span>
        </div>
      ))}
    </div>
  );
}
