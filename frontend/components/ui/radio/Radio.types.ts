import { type InputHTMLAttributes } from 'react';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  options: RadioOption[];
  error?: boolean;
  orientation?: 'vertical' | 'horizontal';
}
