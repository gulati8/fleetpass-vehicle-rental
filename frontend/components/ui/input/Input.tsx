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
      id,
      ...props
    },
    ref
  ) => {
    const hasAddons = leftAddon || rightAddon;
    const hasError = Boolean(error);
    const effectiveVariant = hasError ? 'error' : variant;

    // Generate unique error ID for aria-describedby
    const errorId = id && hasError && typeof error === 'string' ? `${id}-error` : undefined;

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
        id={id}
        className={inputClasses}
        aria-invalid={hasError || undefined}
        aria-describedby={errorId}
        {...props}
      />
    );

    const inputElement = !hasAddons ? input : (
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

    // If no error message, just return the input
    if (!error || typeof error !== 'string') {
      return inputElement;
    }

    // Wrap input with error message display
    return (
      <div>
        {inputElement}
        {typeof error === 'string' && error.length > 0 && (
          <p id={errorId} className="mt-1 text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
