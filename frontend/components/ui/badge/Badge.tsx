import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeProps } from './Badge.types';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
