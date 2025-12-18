import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

// Suppress console.error for these tests since we're intentionally throwing errors
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
    expect(screen.getByText(/go home/i)).toBeInTheDocument();
  });

  it('should display custom fallback if provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('should call onReset when Try Again is clicked', () => {
    const onReset = vi.fn();

    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByText(/try again/i);
    fireEvent.click(tryAgainButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/error details \(development only\)/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should hide error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
