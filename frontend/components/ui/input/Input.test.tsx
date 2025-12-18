import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-neutral-300');
    expect(input).toHaveClass('focus-visible:border-primary-500');
  });

  it('renders error variant when error prop is true', () => {
    render(<Input data-testid="input" error />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-error-500');
  });

  it('renders success variant', () => {
    render(<Input data-testid="input" variant="success" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-success-500');
  });

  it('error prop overrides variant prop', () => {
    render(<Input data-testid="input" variant="success" error />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-error-500');
    expect(input).not.toHaveClass('border-success-500');
  });

  it('renders all sizes correctly', () => {
    const { rerender } = render(<Input data-testid="input" size="sm" />);
    expect(screen.getByTestId('input')).toHaveClass('h-8');

    rerender(<Input data-testid="input" size="md" />);
    expect(screen.getByTestId('input')).toHaveClass('h-10');

    rerender(<Input data-testid="input" size="lg" />);
    expect(screen.getByTestId('input')).toHaveClass('h-12');
  });

  it('renders with leftAddon', () => {
    render(
      <Input
        data-testid="input"
        leftAddon={<span data-testid="left-addon">$</span>}
      />
    );
    expect(screen.getByTestId('left-addon')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveClass('pl-10');
  });

  it('renders with rightAddon', () => {
    render(
      <Input
        data-testid="input"
        rightAddon={<span data-testid="right-addon">@</span>}
      />
    );
    expect(screen.getByTestId('right-addon')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveClass('pr-10');
  });

  it('renders with both left and right addons', () => {
    render(
      <Input
        data-testid="input"
        leftAddon={<span data-testid="left-addon">$</span>}
        rightAddon={<span data-testid="right-addon">.00</span>}
      />
    );
    expect(screen.getByTestId('left-addon')).toBeInTheDocument();
    expect(screen.getByTestId('right-addon')).toBeInTheDocument();
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('pl-10');
    expect(input).toHaveClass('pr-10');
  });

  it('wraps input in relative container when addons are present', () => {
    const { container } = render(
      <Input leftAddon={<span>$</span>} />
    );
    const relativeDiv = container.querySelector('.relative');
    expect(relativeDiv).toBeInTheDocument();
  });

  it('does not wrap in container when no addons', () => {
    const { container } = render(<Input />);
    const relativeDiv = container.querySelector('.relative');
    expect(relativeDiv).not.toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Input data-testid="input" disabled />);
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input') as HTMLInputElement;

    await user.type(input, 'Hello World');
    expect(input.value).toBe('Hello World');
  });

  it('calls onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input data-testid="input" onChange={handleChange} />);

    await user.type(screen.getByTestId('input'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('merges custom className with variant classes', () => {
    render(<Input data-testid="input" className="custom-class" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-class');
    expect(input).toHaveClass('border-neutral-300'); // Still has variant class
  });

  it('forwards ref to input element', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports all standard input types', () => {
    const types = ['text', 'email', 'password', 'number', 'tel', 'url'] as const;

    types.forEach((type) => {
      const { unmount } = render(<Input type={type} data-testid={`input-${type}`} />);
      const input = screen.getByTestId(`input-${type}`);
      expect(input).toHaveAttribute('type', type);
      unmount();
    });
  });
});
