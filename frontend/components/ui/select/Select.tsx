import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { selectVariants, type SelectProps } from './Select.types';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      size,
      error = false,
      options,
      placeholder,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const effectiveVariant = hasError ? 'error' : variant;

    const selectElement = (
      <select
        ref={ref}
        className={cn(selectVariants({ variant: effectiveVariant, size }), className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );

    // If no error message, just return the select
    if (!error || typeof error !== 'string') {
      return selectElement;
    }

    // Wrap select with error message display
    return (
      <div>
        {selectElement}
        {typeof error === 'string' && error.length > 0 && (
          <p className="mt-1 text-sm text-error-600">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
