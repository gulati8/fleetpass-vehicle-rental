import { type VariantProps } from '@/lib/cva';

/**
 * Common component prop types
 */

/** Size variants used across components */
export type Size = 'sm' | 'md' | 'lg';

/** Common button/interactive element variants */
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/** Status variants for badges, alerts, etc. */
export type Status = 'success' | 'warning' | 'error' | 'info';

/** Polymorphic as prop for semantic HTML */
export type As = 'button' | 'a' | 'div' | 'span';

/**
 * Base props for polymorphic components
 */
export interface PolymorphicProps {
  as?: As;
}

/**
 * Re-export for convenience
 */
export type { VariantProps };
