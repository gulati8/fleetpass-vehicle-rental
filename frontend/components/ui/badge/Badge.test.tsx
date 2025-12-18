import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders with children', () => {
    render(<Badge>Badge text</Badge>);
    expect(screen.getByText('Badge text')).toBeInTheDocument();
  });

  it('renders with default variant (neutral) and size (md)', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-neutral-100');
    expect(badge).toHaveClass('text-neutral-700');
    expect(badge).toHaveClass('px-2.5'); // md size
    expect(badge).toHaveClass('py-1'); // md size
  });

  describe('Variants', () => {
    it('renders primary variant', () => {
      render(<Badge variant="primary" data-testid="badge">Primary</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-primary-100');
      expect(badge).toHaveClass('text-primary-700');
      expect(badge).toHaveClass('ring-primary-600/20');
    });

    it('renders secondary variant', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-secondary-100');
      expect(badge).toHaveClass('text-secondary-700');
      expect(badge).toHaveClass('ring-secondary-600/20');
    });

    it('renders success variant', () => {
      render(<Badge variant="success" data-testid="badge">Success</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-success-100');
      expect(badge).toHaveClass('text-success-700');
      expect(badge).toHaveClass('ring-success-600/20');
    });

    it('renders warning variant', () => {
      render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-warning-100');
      expect(badge).toHaveClass('text-warning-700');
      expect(badge).toHaveClass('ring-warning-600/20');
    });

    it('renders error variant', () => {
      render(<Badge variant="error" data-testid="badge">Error</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-error-100');
      expect(badge).toHaveClass('text-error-700');
      expect(badge).toHaveClass('ring-error-600/20');
    });

    it('renders neutral variant', () => {
      render(<Badge variant="neutral" data-testid="badge">Neutral</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-neutral-100');
      expect(badge).toHaveClass('text-neutral-700');
      expect(badge).toHaveClass('ring-neutral-600/20');
    });
  });

  describe('Sizes', () => {
    it('renders sm size', () => {
      render(<Badge size="sm" data-testid="badge">Small</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
    });

    it('renders md size', () => {
      render(<Badge size="md" data-testid="badge">Medium</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-xs');
    });

    it('renders lg size', () => {
      render(<Badge size="lg" data-testid="badge">Large</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1.5');
      expect(badge).toHaveClass('text-sm');
    });
  });

  it('merges custom className with variant classes', () => {
    render(<Badge className="custom-class" data-testid="badge">Custom</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('custom-class');
    expect(badge).toHaveClass('bg-neutral-100'); // Still has default variant
  });

  it('renders as span element', () => {
    render(<Badge data-testid="badge">Badge</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge.tagName).toBe('SPAN');
  });

  it('applies inline-flex layout', () => {
    render(<Badge data-testid="badge">Badge</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
  });

  it('supports children with icons', () => {
    render(
      <Badge data-testid="badge">
        <span data-testid="icon">✓</span>
        Success
      </Badge>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
