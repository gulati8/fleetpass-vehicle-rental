import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default variant (text)', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('h-4'); // text variant
  });

  it('has accessibility attributes', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading...');
  });

  it('applies animate-pulse class', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  describe('Variants', () => {
    it('renders text variant', () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-4');
    });

    it('renders title variant', () => {
      render(<Skeleton variant="title" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-8');
    });

    it('renders button variant', () => {
      render(<Skeleton variant="button" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-10');
    });

    it('renders avatar variant', () => {
      render(<Skeleton variant="avatar" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-12');
      expect(skeleton).toHaveClass('w-12');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders card variant', () => {
      render(<Skeleton variant="card" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-32');
    });

    it('renders image variant', () => {
      render(<Skeleton variant="image" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('aspect-video');
    });
  });

  describe('Custom dimensions', () => {
    it('applies custom width', () => {
      render(<Skeleton width="200px" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '200px' });
    });

    it('applies custom height', () => {
      render(<Skeleton height="50px" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ height: '50px' });
    });

    it('applies both custom width and height', () => {
      render(<Skeleton width="300px" height="100px" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({ width: '300px', height: '100px' });
    });

    it('merges custom style prop', () => {
      render(
        <Skeleton
          style={{ margin: '10px', padding: '5px' }}
          data-testid="skeleton"
        />
      );
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveStyle({
        margin: '10px',
        padding: '5px',
      });
    });
  });

  it('merges custom className with variant classes', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('custom-class');
    expect(skeleton).toHaveClass('animate-pulse'); // Still has base class
    expect(skeleton).toHaveClass('bg-neutral-200'); // Still has base class
  });

  it('renders as div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton.tagName).toBe('DIV');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Skeleton ref={ref as any} data-testid="skeleton" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
