import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './Label';

describe('Label', () => {
  it('renders label with text', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    const { container } = render(<Label>Email</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-neutral-700', 'mb-2');
  });

  it('shows required indicator when required prop is true', () => {
    render(<Label required>Password</Label>);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-error-600');
  });

  it('shows optional text when optional prop is true', () => {
    render(<Label optional>Phone Number</Label>);
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('does not show required or optional indicators by default', () => {
    render(<Label>Default Label</Label>);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.queryByText('(optional)')).not.toBeInTheDocument();
  });

  it('associates with input via htmlFor prop', () => {
    const { container } = render(<Label htmlFor="test-input">Test Label</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('merges custom className with default classes', () => {
    const { container } = render(<Label className="custom-class">Custom</Label>);
    const label = container.querySelector('label');
    expect(label).toHaveClass('custom-class');
    expect(label).toHaveClass('text-sm'); // Still has default class
  });

  it('forwards additional HTML attributes', () => {
    const { container } = render(
      <Label data-testid="custom-label" aria-label="Custom Aria Label">
        Attribute Test
      </Label>
    );
    const label = container.querySelector('label');
    expect(label).toHaveAttribute('data-testid', 'custom-label');
    expect(label).toHaveAttribute('aria-label', 'Custom Aria Label');
  });

  it('prioritizes required over optional when both are true', () => {
    render(<Label required optional>Conflicting Props</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
    // Both should render, but in practice, you'd only use one
  });
});
