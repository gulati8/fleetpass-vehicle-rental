import { type VariantProps } from '@/lib/cva';
import { type InputHTMLAttributes } from 'react';
import { cva } from '@/lib/cva';

export const inputVariants = cva(
  'flex h-10 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opacity-20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
  {
    variants: {
      variant: {
        default:
          'border-neutral-300 focus-visible:border-primary-500 focus-visible:ring-primary-500',
        error:
          'border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500',
        success:
          'border-success-500 focus-visible:border-success-500 focus-visible:ring-success-500',
      },
      size: {
        sm: 'h-8 text-xs px-2.5 py-1.5',
        md: 'h-10 text-sm px-3.5 py-2.5',
        lg: 'h-12 text-base px-4 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}
