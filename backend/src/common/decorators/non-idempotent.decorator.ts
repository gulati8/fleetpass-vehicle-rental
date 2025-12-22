import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to opt out of automatic idempotency enforcement.
 *
 * Use this ONLY when an endpoint truly cannot be idempotent
 * (e.g., generating random tokens, random quotes, etc.)
 *
 * Requires justification in code review.
 *
 * @example
 * ```typescript
 * @Post('generate-random-token')
 * @NonIdempotent()
 * async generateToken() {
 *   return { token: crypto.randomBytes(32).toString('hex') };
 * }
 * ```
 */
export const NonIdempotent = () => SetMetadata('non-idempotent', true);
