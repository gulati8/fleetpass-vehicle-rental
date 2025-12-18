import { ApiError } from '@/lib/api-client';

interface ApiErrorDisplayProps {
  error: unknown;
  className?: string;
}

/**
 * Display API errors in a user-friendly format
 *
 * Usage:
 * ```tsx
 * const mutation = useCreateVehicle();
 *
 * {mutation.isError && <ApiErrorDisplay error={mutation.error} />}
 * ```
 */
export function ApiErrorDisplay({ error, className = '' }: ApiErrorDisplayProps) {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return (
      <div className={`rounded-lg bg-error-50 border border-error-200 p-4 ${className}`}>
        <div className="flex items-start">
          <span className="text-error-600 text-xl mr-2">⚠️</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-error-800 mb-1">
              {error.message}
            </h4>
            {error.details && Object.keys(error.details).length > 0 && (
              <ul className="mt-2 text-sm text-error-700 space-y-1">
                {Object.entries(error.details).map(([field, errors]) => (
                  <li key={field} className="flex items-start">
                    <span className="font-medium mr-1">{field}:</span>
                    <span>{errors.join(', ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return (
      <div className={`rounded-lg bg-error-50 border border-error-200 p-4 ${className}`}>
        <div className="flex items-start">
          <span className="text-error-600 text-xl mr-2">⚠️</span>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-error-800">
              {error.message || 'An unexpected error occurred'}
            </h4>
          </div>
        </div>
      </div>
    );
  }

  // Handle unknown errors
  return (
    <div className={`rounded-lg bg-error-50 border border-error-200 p-4 ${className}`}>
      <div className="flex items-start">
        <span className="text-error-600 text-xl mr-2">⚠️</span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-error-800">
            An unexpected error occurred. Please try again.
          </h4>
        </div>
      </div>
    </div>
  );
}
