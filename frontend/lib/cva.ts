import { cva as classVarianceAuthority, type VariantProps } from 'class-variance-authority';

export { type VariantProps };

/**
 * Class Variance Authority wrapper
 * Used for defining component variants with type-safe props
 *
 * @example
 * const buttonVariants = cva('base-classes', {
 *   variants: {
 *     variant: {
 *       primary: 'primary-classes',
 *       secondary: 'secondary-classes',
 *     },
 *     size: {
 *       sm: 'text-sm px-3 py-1.5',
 *       md: 'text-base px-4 py-2',
 *       lg: 'text-lg px-6 py-3',
 *     },
 *   },
 *   defaultVariants: {
 *     variant: 'primary',
 *     size: 'md',
 *   },
 * });
 *
 * // Usage in component:
 * function Button({ variant, size, className, ...props }: ButtonProps) {
 *   return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
 * }
 */
export const cva = classVarianceAuthority;
