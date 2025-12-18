import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600'); // primary variant
    expect(button).toHaveClass('h-10'); // md size
  });

  it('renders all variants correctly', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;

    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>);
      const button = screen.getByRole('button', { name: variant });
      expect(button).toBeInTheDocument();
      unmount();
    });
  });

  it('renders all sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-12');
  });

  it('renders with full width when specified', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Check for spinner - it should have animate-spin class
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Loading</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders left icon when provided', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    render(<Button leftIcon={<LeftIcon />}>With Left Icon</Button>);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon when provided', () => {
    const RightIcon = () => <span data-testid="right-icon">→</span>;
    render(<Button rightIcon={<RightIcon />}>With Right Icon</Button>);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('hides icons when loading', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>;
    render(<Button isLoading leftIcon={<LeftIcon />}>Loading</Button>);
    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
  });

  it('renders as anchor when as="a" is provided', () => {
    render(<Button as="a" href="/test">Link Button</Button>);
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('merges custom className with variant classes', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-primary-600'); // Still has variant class
  });
});
