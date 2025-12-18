import { Label } from '@/components/ui/label';
import { FormError } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { type FormGroupProps } from './FormGroup.types';

export function FormGroup({
  label,
  helperText,
  error,
  required,
  children,
  htmlFor,
}: FormGroupProps) {
  const errorId = error ? `${htmlFor}-error` : undefined;
  const helperId = helperText ? `${htmlFor}-helper` : undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}

      <div aria-describedby={cn(errorId, helperId)} aria-invalid={!!error}>
        {children}
      </div>

      {helperText && !error && (
        <p id={helperId} className="text-xs text-neutral-500">
          {helperText}
        </p>
      )}

      {error && <FormError id={errorId}>{error}</FormError>}
    </div>
  );
}
