'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';

interface FeatureErrorBoundaryProps {
  children: ReactNode;
  featureName: string;
}

export function FeatureErrorBoundary({ children, featureName }: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="m-4">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-error-600 mb-2">
              {featureName} Error
            </h3>
            <p className="text-neutral-700 mb-4">
              This feature encountered an error. The rest of the application is still working.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
