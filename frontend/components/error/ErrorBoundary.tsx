'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, LogRocket, or similar
      // import { logError } from '@/lib/error-logging';
      // logError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-error-600 flex items-center gap-2">
                <span className="text-3xl">⚠️</span>
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-neutral-700">
                We're sorry, but something unexpected happened. Our team has been notified and we're working on a fix.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm bg-neutral-100 p-4 rounded-lg">
                  <summary className="cursor-pointer font-semibold mb-2">
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="primary">
                  Try Again
                </Button>
                <Button onClick={() => window.location.href = '/'} variant="outline">
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
