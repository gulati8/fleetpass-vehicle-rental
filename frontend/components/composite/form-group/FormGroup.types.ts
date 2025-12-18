import { type ReactNode } from 'react';

export interface FormGroupProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}
