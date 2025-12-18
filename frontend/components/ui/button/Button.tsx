import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonProps } from './Button.types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      as = 'button',
      href,
      ...props
    },
    ref
  ) => {
    const Component = as === 'a' ? 'a' : 'button';
    const isDisabled = disabled || isLoading;

    const buttonClasses = cn(
      buttonVariants({ variant, size, fullWidth }),
      className
    );

    const content = (
      <>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && leftIcon}
        {children}
        {!isLoading && rightIcon && rightIcon}
      </>
    );

    if (Component === 'a') {
      return (
        <a
          ref={ref as any}
          href={href}
          className={buttonClasses}
          aria-disabled={isDisabled}
          {...(props as any)}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
