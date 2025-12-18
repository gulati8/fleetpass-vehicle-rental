import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { type RadioProps } from './Radio.types';

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      options,
      error,
      orientation = 'vertical',
      name,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-6'
        )}
        role="radiogroup"
      >
        {options.map((option, index) => {
          const radioId = `${name}-${option.value}`;
          const isControlled = value !== undefined;
          const checked = isControlled ? value === option.value : undefined;
          const defaultChecked =
            !isControlled && defaultValue === option.value ? true : undefined;

          return (
            <div key={option.value} className="flex items-start gap-3">
              <div className="flex h-5 items-center">
                <input
                  ref={index === 0 ? ref : undefined}
                  type="radio"
                  id={radioId}
                  name={name}
                  value={option.value}
                  disabled={option.disabled}
                  checked={checked}
                  defaultChecked={defaultChecked}
                  className={cn(
                    'h-4 w-4 border-neutral-300 text-primary-600 transition-colors',
                    'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-error-500 focus:ring-error-500',
                    className
                  )}
                  {...props}
                />
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor={radioId}
                  className={cn(
                    'text-sm font-medium text-neutral-900 cursor-pointer',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
