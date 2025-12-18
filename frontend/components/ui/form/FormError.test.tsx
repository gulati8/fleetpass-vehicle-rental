import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormError } from './FormError';

describe('FormError', () => {
  it('renders error message', () => {
    render(<FormError>This field is required</FormError>);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<FormError>Error message</FormError>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    render(<FormError>Error</FormError>);
    const error = screen.getByRole('alert');
    expect(error).toHaveClass('mt-2', 'text-sm', 'text-error-600');
  });

  it('returns null when children is empty', () => {
    const { container } = render(<FormError />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when children is null', () => {
    const { container } = render(<FormError>{null}</FormError>);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when children is undefined', () => {
    const { container } = render(<FormError>{undefined}</FormError>);
    expect(container.firstChild).toBeNull();
  });

  it('renders when children is a string', () => {
    render(<FormError>String error</FormError>);
    expect(screen.getByText('String error')).toBeInTheDocument();
  });

  it('renders when children is a React element', () => {
    render(
      <FormError>
        <span data-testid="custom-error">Custom error component</span>
      </FormError>
    );
    expect(screen.getByTestId('custom-error')).toBeInTheDocument();
  });

  it('merges custom className with default classes', () => {
    render(<FormError className="custom-class">Error</FormError>);
    const error = screen.getByRole('alert');
    expect(error).toHaveClass('custom-class');
    expect(error).toHaveClass('text-error-600'); // Still has default class
  });

  it('forwards additional HTML attributes', () => {
    render(
      <FormError data-testid="custom-error" id="error-id">
        Error message
      </FormError>
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveAttribute('data-testid', 'custom-error');
    expect(error).toHaveAttribute('id', 'error-id');
  });

  it('forwards ref to paragraph element', () => {
    const ref = { current: null };
    render(<FormError ref={ref}>Error</FormError>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});
