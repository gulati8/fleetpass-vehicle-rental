import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { skeletonVariants, type SkeletonProps } from './Skeleton.types';

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, width, height, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant }), className)}
        style={{
          width,
          height,
          ...style,
        }}
        role="status"
        aria-label="Loading..."
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
