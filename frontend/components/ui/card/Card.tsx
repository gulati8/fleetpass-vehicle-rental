import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  cardVariants,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps,
} from './Card.types';

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, hover, clickable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ padding, hover, clickable }), className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-4', className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-xl font-semibold text-neutral-900', className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-neutral-600 mt-1', className)}
        {...props}
      />
    );
  }
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(className)}
        {...props}
      />
    );
  }
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-6 flex items-center gap-3', className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = 'CardFooter';
