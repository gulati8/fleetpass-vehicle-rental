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
    const effectiveVariant = error ? 'error' : variant;

    return (
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
  }
);

Select.displayName = 'Select';
