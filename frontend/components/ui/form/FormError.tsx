import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {}

export const FormError = forwardRef<HTMLParagraphElement, FormErrorProps>(
  ({ className, children, ...props }, ref) => {
    if (!children) return null;

    return (
      <p
        ref={ref}
        className={cn('mt-2 text-sm text-error-600', className)}
        role="alert"
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormError.displayName = 'FormError';
