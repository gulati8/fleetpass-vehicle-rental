export interface ErrorLogData {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export function logError(error: Error, errorInfo?: any) {
  const logData: ErrorLogData = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
    additionalData: errorInfo,
  };

  // Development: log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', logData);
    return;
  }

  // Production: send to error tracking service
  // TODO: Integrate with Sentry, LogRocket, or similar
  // Example Sentry integration:
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.captureException(error, { extra: logData });

  // Fallback: send to your own logging endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
  }
}
