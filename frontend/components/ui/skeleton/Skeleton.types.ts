import { type HTMLAttributes } from 'react';
import { type VariantProps } from '@/lib/cva';
import { cva } from '@/lib/cva';

export const skeletonVariants = cva(
  'animate-pulse bg-neutral-200 rounded',
  {
    variants: {
      variant: {
        text: 'h-4',
        title: 'h-8',
        button: 'h-10',
        avatar: 'h-12 w-12 rounded-full',
        card: 'h-32',
        image: 'aspect-video',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string;
  height?: string;
}
