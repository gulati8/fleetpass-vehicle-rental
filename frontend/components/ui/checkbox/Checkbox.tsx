import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { type CheckboxProps } from './Checkbox.types';

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-start gap-3">
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              'h-4 w-4 rounded border-neutral-300 text-primary-600 transition-colors',
              'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-error-500 focus:ring-error-500',
              className
            )}
            {...props}
          />
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-sm font-medium text-neutral-900 cursor-pointer',
                  props.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
