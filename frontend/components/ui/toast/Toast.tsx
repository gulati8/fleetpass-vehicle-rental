'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-success-50',
    borderColor: 'border-success-600',
    iconColor: 'text-success-600',
    progressColor: 'bg-success-600',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-error-100',
    borderColor: 'border-error-600',
    iconColor: 'text-error-600',
    progressColor: 'bg-error-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning-100',
    borderColor: 'border-warning-500',
    iconColor: 'text-warning-700',
    progressColor: 'bg-warning-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-600',
    iconColor: 'text-primary-600',
    progressColor: 'bg-primary-600',
  },
} as const;

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const config = TOAST_CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    if (!duration) return;

    // Progress bar animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(progressInterval);
      }
    }, 16); // ~60fps

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose(id);
      }, 300); // Match animation duration
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-lg border-l-4 shadow-lg',
        'transition-all duration-300 ease-in-out',
        config.bgColor,
        config.borderColor,
        isExiting
          ? 'translate-x-[120%] opacity-0'
          : 'translate-x-0 opacity-100'
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconColor)} aria-hidden="true" />

        <p className="flex-1 text-sm font-medium text-neutral-900">
          {message}
        </p>

        <button
          onClick={handleClose}
          className={cn(
            'flex-shrink-0 rounded p-0.5 transition-colors duration-150',
            'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
            type === 'success' && 'focus:ring-success-600',
            type === 'error' && 'focus:ring-error-600',
            type === 'warning' && 'focus:ring-warning-600',
            type === 'info' && 'focus:ring-primary-600'
          )}
          aria-label="Close notification"
        >
          <X className="h-4 w-4 text-neutral-600" />
        </button>
      </div>

      {/* Progress bar */}
      {duration && (
        <div className="h-1 w-full bg-black/10">
          <div
            className={cn(
              'h-full transition-all duration-100 ease-linear',
              config.progressColor
            )}
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
