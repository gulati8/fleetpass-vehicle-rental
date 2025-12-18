import { type VariantProps } from '@/lib/cva';
import { type ButtonHTMLAttributes } from 'react';
import { cva } from '@/lib/cva';

export const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow-md active:bg-primary-800 focus-visible:ring-primary-600',
        secondary:
          'bg-white text-neutral-900 ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 hover:ring-neutral-400 active:bg-neutral-100 focus-visible:ring-neutral-600',
        outline:
          'bg-transparent text-primary-600 ring-2 ring-inset ring-primary-500 hover:bg-primary-50 hover:ring-primary-600 active:bg-primary-100 focus-visible:ring-primary-600',
        ghost:
          'bg-transparent text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200 focus-visible:ring-neutral-600',
        danger:
          'bg-error-600 text-white shadow-sm hover:bg-error-700 hover:shadow-md active:bg-error-800 focus-visible:ring-error-600',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
}
