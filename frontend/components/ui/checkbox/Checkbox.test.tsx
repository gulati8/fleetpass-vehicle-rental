import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders checkbox element', () => {
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('renders without label or description', () => {
    const { container } = render(<Checkbox data-testid="checkbox" />);
    expect(screen.getByTestId('checkbox')).toBeInTheDocument();
    expect(container.querySelector('label')).not.toBeInTheDocument();
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Checkbox label="Accept terms" data-testid="checkbox" />);
    const label = screen.getByText('Accept terms');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
  });

  it('renders with description', () => {
    render(
      <Checkbox
        label="Accept terms"
        description="You must accept the terms to continue"
        data-testid="checkbox"
      />
    );
    const description = screen.getByText('You must accept the terms to continue');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-xs');
  });

  it('renders description without label', () => {
    render(
      <Checkbox description="Helper text" data-testid="checkbox" />
    );
    const description = screen.getByText('Helper text');
    expect(description).toBeInTheDocument();
  });

  it('associates label with checkbox via htmlFor', () => {
    render(<Checkbox label="Accept terms" id="terms" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    const label = screen.getByText('Accept terms');
    expect(checkbox).toHaveAttribute('id', 'terms');
    expect(label).toHaveAttribute('for', 'terms');
  });

  it('generates unique ID when not provided', () => {
    const { container } = render(<Checkbox label="Accept terms" />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    const label = screen.getByText('Accept terms');

    expect(checkbox).toHaveAttribute('id');
    const checkboxId = checkbox?.getAttribute('id') || '';
    expect(checkboxId).toContain('checkbox-');
    expect(label).toHaveAttribute('for', checkboxId);
  });

  it('handles checked state', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept terms" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);

    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('calls onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <Checkbox
        label="Accept terms"
        data-testid="checkbox"
        onChange={handleChange}
      />
    );

    await user.click(screen.getByTestId('checkbox'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('clicking label toggles checkbox', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Accept terms" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    const label = screen.getByText('Accept terms');

    expect(checkbox.checked).toBe(false);

    await user.click(label);
    expect(checkbox.checked).toBe(true);
  });

  it('handles disabled state', () => {
    render(<Checkbox label="Accept terms" data-testid="checkbox" disabled />);
    const checkbox = screen.getByTestId('checkbox');
    const label = screen.getByText('Accept terms');

    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
    expect(label).toHaveClass('opacity-50');
    expect(label).toHaveClass('cursor-not-allowed');
  });

  it('renders error state', () => {
    render(<Checkbox label="Accept terms" data-testid="checkbox" error />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('border-error-500');
    expect(checkbox).toHaveClass('focus:ring-error-500');
  });

  it('renders default focus ring styles', () => {
    render(<Checkbox label="Accept terms" data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('focus:ring-2');
    expect(checkbox).toHaveClass('focus:ring-primary-500');
    expect(checkbox).toHaveClass('focus:ring-offset-2');
  });

  it('merges custom className with base classes', () => {
    render(
      <Checkbox
        label="Accept terms"
        data-testid="checkbox"
        className="custom-class"
      />
    );
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toHaveClass('custom-class');
    expect(checkbox).toHaveClass('h-4');
    expect(checkbox).toHaveClass('w-4');
  });

  it('forwards ref to checkbox element', () => {
    const ref = vi.fn();
    render(<Checkbox label="Accept terms" ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports defaultChecked prop', () => {
    render(
      <Checkbox label="Accept terms" data-testid="checkbox" defaultChecked />
    );
    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('supports controlled checked prop', () => {
    const { rerender } = render(
      <Checkbox label="Accept terms" data-testid="checkbox" checked={false} onChange={vi.fn()} />
    );
    let checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    rerender(
      <Checkbox label="Accept terms" data-testid="checkbox" checked={true} onChange={vi.fn()} />
    );
    checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
