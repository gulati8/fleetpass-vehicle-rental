import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test feature error');
  }
  return <div>Feature content</div>;
}

// Suppress console.error for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('FeatureErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <FeatureErrorBoundary featureName="Test Feature">
        <ThrowError shouldThrow={false} />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Feature content')).toBeInTheDocument();
  });

  it('should catch errors and display feature-specific error UI', () => {
    render(
      <FeatureErrorBoundary featureName="Test Feature">
        <ThrowError />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Test Feature Error')).toBeInTheDocument();
    expect(screen.getByText(/this feature encountered an error/i)).toBeInTheDocument();
    expect(screen.getByText(/rest of the application is still working/i)).toBeInTheDocument();
  });

  it('should have a refresh button', () => {
    // Mock window.location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <FeatureErrorBoundary featureName="Test Feature">
        <ThrowError />
      </FeatureErrorBoundary>
    );

    const refreshButton = screen.getByText(/refresh page/i);
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(reloadMock).toHaveBeenCalled();
  });

  it('should display different feature names', () => {
    render(
      <FeatureErrorBoundary featureName="Vehicle Management">
        <ThrowError />
      </FeatureErrorBoundary>
    );

    expect(screen.getByText('Vehicle Management Error')).toBeInTheDocument();
  });
});
