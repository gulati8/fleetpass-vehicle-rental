import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';
import { type SelectOption } from './Select.types';

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Select', () => {
  it('renders select element', () => {
    render(<Select options={mockOptions} data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toBeInTheDocument();
  });

  it('renders all options correctly', () => {
    render(<Select options={mockOptions} data-testid="select" />);
    const select = screen.getByTestId('select') as HTMLSelectElement;

    expect(select.options).toHaveLength(3);
    expect(select.options[0]).toHaveTextContent('Option 1');
    expect(select.options[1]).toHaveTextContent('Option 2');
    expect(select.options[2]).toHaveTextContent('Option 3');
  });

  it('renders placeholder as disabled first option', () => {
    render(
      <Select
        options={mockOptions}
        placeholder="Select an option"
        data-testid="select"
      />
    );
    const select = screen.getByTestId('select') as HTMLSelectElement;

    expect(select.options).toHaveLength(4);
    expect(select.options[0]).toHaveTextContent('Select an option');
    expect(select.options[0]).toBeDisabled();
    expect(select.options[0]).toHaveValue('');
  });

  it('renders disabled options correctly', () => {
    render(<Select options={mockOptions} data-testid="select" />);
    const select = screen.getByTestId('select') as HTMLSelectElement;

    expect(select.options[2]).toBeDisabled();
    expect(select.options[0]).not.toBeDisabled();
    expect(select.options[1]).not.toBeDisabled();
  });

  it('renders with default variant', () => {
    render(<Select options={mockOptions} data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('border-neutral-300');
    expect(select).toHaveClass('focus-visible:border-primary-500');
  });

  it('renders error variant when error prop is true', () => {
    render(<Select options={mockOptions} data-testid="select" error />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('border-error-500');
  });

  it('renders success variant', () => {
    render(<Select options={mockOptions} data-testid="select" variant="success" />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('border-success-500');
  });

  it('error prop overrides variant prop', () => {
    render(
      <Select
        options={mockOptions}
        data-testid="select"
        variant="success"
        error
      />
    );
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('border-error-500');
    expect(select).not.toHaveClass('border-success-500');
  });

  it('renders all sizes correctly', () => {
    const { rerender } = render(
      <Select options={mockOptions} data-testid="select" size="sm" />
    );
    expect(screen.getByTestId('select')).toHaveClass('h-8');

    rerender(<Select options={mockOptions} data-testid="select" size="md" />);
    expect(screen.getByTestId('select')).toHaveClass('h-10');

    rerender(<Select options={mockOptions} data-testid="select" size="lg" />);
    expect(screen.getByTestId('select')).toHaveClass('h-12');
  });

  it('handles onChange event', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select
        options={mockOptions}
        data-testid="select"
        onChange={handleChange}
      />
    );

    const select = screen.getByTestId('select');
    await user.selectOptions(select, 'option2');

    expect(handleChange).toHaveBeenCalled();
  });

  it('updates value when option is selected', async () => {
    const user = userEvent.setup();

    render(<Select options={mockOptions} data-testid="select" />);
    const select = screen.getByTestId('select') as HTMLSelectElement;

    await user.selectOptions(select, 'option2');
    expect(select.value).toBe('option2');
  });

  it('handles disabled state', () => {
    render(<Select options={mockOptions} data-testid="select" disabled />);
    const select = screen.getByTestId('select');
    expect(select).toBeDisabled();
    expect(select).toHaveClass('disabled:cursor-not-allowed');
  });

  it('merges custom className with variant classes', () => {
    render(
      <Select
        options={mockOptions}
        data-testid="select"
        className="custom-class"
      />
    );
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('custom-class');
    expect(select).toHaveClass('border-neutral-300');
  });

  it('forwards ref to select element', () => {
    const ref = vi.fn();
    render(<Select options={mockOptions} ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('renders with default value', () => {
    render(
      <Select
        options={mockOptions}
        data-testid="select"
        defaultValue="option2"
      />
    );
    const select = screen.getByTestId('select') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('renders with controlled value', () => {
    const { rerender } = render(
      <Select options={mockOptions} data-testid="select" value="option1" onChange={vi.fn()} />
    );
    let select = screen.getByTestId('select') as HTMLSelectElement;
    expect(select.value).toBe('option1');

    rerender(
      <Select options={mockOptions} data-testid="select" value="option2" onChange={vi.fn()} />
    );
    select = screen.getByTestId('select') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });
});
