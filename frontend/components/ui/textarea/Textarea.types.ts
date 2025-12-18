import { type VariantProps } from '@/lib/cva';
import { type TextareaHTMLAttributes } from 'react';
import { cva } from '@/lib/cva';

export const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opacity-20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
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
      resize: {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      resize: 'vertical',
    },
  }
);

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
}
