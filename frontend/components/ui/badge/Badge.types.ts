import { type HTMLAttributes } from 'react';
import { type VariantProps } from '@/lib/cva';
import { cva } from '@/lib/cva';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-600/20',
        secondary: 'bg-secondary-100 text-secondary-700 ring-1 ring-inset ring-secondary-600/20',
        success: 'bg-success-100 text-success-700 ring-1 ring-inset ring-success-600/20',
        warning: 'bg-warning-100 text-warning-700 ring-1 ring-inset ring-warning-600/20',
        error: 'bg-error-100 text-error-700 ring-1 ring-inset ring-error-600/20',
        neutral: 'bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-600/20',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}
