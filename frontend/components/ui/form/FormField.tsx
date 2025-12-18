import { useController, type FieldValues } from 'react-hook-form';
import { Input } from '../input/Input';
import { Label } from '../label/Label';
import { FormError } from './FormError';
import { type FormFieldProps } from './FormField.types';
import { cn } from '@/lib/utils';

export function FormField<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  rules,
  label,
  helperText,
  inputProps,
  required,
  ...controllerProps
}: FormFieldProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
    rules,
    ...controllerProps,
  });

  const inputId = `field-${String(name)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={inputId} required={required}>
          {label}
        </Label>
      )}

      <Input
        id={inputId}
        {...field}
        {...inputProps}
        error={!!error}
        aria-invalid={!!error}
        aria-describedby={cn(errorId, helperId)}
      />

      {helperText && !error && (
        <p id={helperId} className="text-xs text-neutral-500">
          {helperText}
        </p>
      )}

      {error && <FormError id={errorId}>{error.message}</FormError>}
    </div>
  );
}

FormField.displayName = 'FormField';
