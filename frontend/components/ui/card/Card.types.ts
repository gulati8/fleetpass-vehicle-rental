import { type HTMLAttributes } from 'react';
import { type VariantProps } from '@/lib/cva';
import { cva } from '@/lib/cva';

export const cardVariants = cva(
  'bg-white rounded-2xl shadow-sm ring-1 ring-neutral-900/5 transition-all duration-200',
  {
    variants: {
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      hover: {
        true: 'hover:shadow-md hover:ring-neutral-900/10',
      },
      clickable: {
        true: 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]',
      },
    },
    defaultVariants: {
      padding: 'md',
      hover: false,
      clickable: false,
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}
