import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { textareaVariants, type TextareaProps } from './Textarea.types';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      resize,
      error = false,
      ...props
    },
    ref
  ) => {
    const effectiveVariant = error ? 'error' : variant;

    return (
      <textarea
        ref={ref}
        className={cn(textareaVariants({ variant: effectiveVariant, resize }), className)}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
