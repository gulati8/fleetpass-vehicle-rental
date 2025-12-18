import { type FieldPath, type FieldValues, type UseControllerProps } from 'react-hook-form';
import { type InputProps } from '../input/Input.types';

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends UseControllerProps<TFieldValues, TName> {
  label?: string;
  helperText?: string;
  inputProps?: Omit<InputProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'>;
  required?: boolean;
}
