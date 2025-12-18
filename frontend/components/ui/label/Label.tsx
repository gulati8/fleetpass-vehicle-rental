import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { type LabelProps } from './Label.types';

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-sm font-medium text-neutral-700 mb-2', className)}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-error-600">*</span>}
        {optional && <span className="ml-1 text-neutral-500 font-normal">(optional)</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';
