import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { inputVariants, type InputProps } from './Input.types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      leftAddon,
      rightAddon,
      ...props
    },
    ref
  ) => {
    const hasAddons = leftAddon || rightAddon;
    const effectiveVariant = error ? 'error' : variant;

    const inputClasses = cn(
      inputVariants({ variant: effectiveVariant, size }),
      {
        'pl-10': leftAddon,
        'pr-10': rightAddon,
      },
      className
    );

    const input = (
      <input
        ref={ref}
        className={inputClasses}
        {...props}
      />
    );

    if (!hasAddons) {
      return input;
    }

    return (
      <div className="relative">
        {leftAddon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {leftAddon}
          </div>
        )}
        {input}
        {rightAddon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {rightAddon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
