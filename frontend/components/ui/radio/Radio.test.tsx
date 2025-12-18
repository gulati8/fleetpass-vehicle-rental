import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio } from './Radio';
import { type RadioOption } from './Radio.types';

const mockOptions: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2', description: 'This is option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Radio', () => {
  it('renders all radio options', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
  });

  it('renders with radiogroup role', () => {
    const { container } = render(
      <Radio options={mockOptions} name="test-radio" />
    );
    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toBeInTheDocument();
  });

  it('renders labels correctly', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    mockOptions.forEach((option) => {
      const label = screen.getByText(option.label);
      expect(label.tagName).toBe('LABEL');
    });
  });

  it('renders descriptions when provided', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    const description = screen.getByText('This is option 2');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-xs');
  });

  it('associates labels with radio inputs via htmlFor', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    mockOptions.forEach((option) => {
      const radio = screen.getByLabelText(option.label) as HTMLInputElement;
      expect(radio).toHaveAttribute('id', `test-radio-${option.value}`);
      expect(radio).toHaveAttribute('type', 'radio');
      expect(radio).toHaveAttribute('name', 'test-radio');
      expect(radio).toHaveAttribute('value', option.value);
    });
  });

  it('renders vertical orientation by default', () => {
    const { container } = render(
      <Radio options={mockOptions} name="test-radio" />
    );
    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toHaveClass('flex-col');
  });

  it('renders horizontal orientation', () => {
    const { container } = render(
      <Radio options={mockOptions} name="test-radio" orientation="horizontal" />
    );
    const radiogroup = container.querySelector('[role="radiogroup"]');
    expect(radiogroup).toHaveClass('flex-row');
  });

  it('handles radio selection', async () => {
    const user = userEvent.setup();
    render(<Radio options={mockOptions} name="test-radio" />);

    const radio1 = screen.getByLabelText('Option 1') as HTMLInputElement;
    const radio2 = screen.getByLabelText('Option 2') as HTMLInputElement;

    expect(radio1.checked).toBe(false);
    expect(radio2.checked).toBe(false);

    await user.click(radio1);
    expect(radio1.checked).toBe(true);
    expect(radio2.checked).toBe(false);

    await user.click(radio2);
    expect(radio1.checked).toBe(false);
    expect(radio2.checked).toBe(true);
  });

  it('clicking label selects radio', async () => {
    const user = userEvent.setup();
    render(<Radio options={mockOptions} name="test-radio" />);

    const radio1 = screen.getByLabelText('Option 1') as HTMLInputElement;
    const label1 = screen.getByText('Option 1');

    expect(radio1.checked).toBe(false);

    await user.click(label1);
    expect(radio1.checked).toBe(true);
  });

  it('calls onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Radio
        options={mockOptions}
        name="test-radio"
        onChange={handleChange}
      />
    );

    await user.click(screen.getByLabelText('Option 1'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles disabled options', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    const radio3 = screen.getByLabelText('Option 3');
    const label3 = screen.getByText('Option 3');

    expect(radio3).toBeDisabled();
    expect(radio3).toHaveClass('disabled:cursor-not-allowed');
    expect(label3).toHaveClass('opacity-50');
    expect(label3).toHaveClass('cursor-not-allowed');
  });

  it('disabled options cannot be selected', async () => {
    const user = userEvent.setup();
    render(<Radio options={mockOptions} name="test-radio" />);

    const radio3 = screen.getByLabelText('Option 3') as HTMLInputElement;

    await user.click(radio3).catch(() => {
      // Click on disabled element may throw, which is expected
    });

    expect(radio3.checked).toBe(false);
  });

  it('renders error state', () => {
    render(<Radio options={mockOptions} name="test-radio" error />);

    const radio1 = screen.getByLabelText('Option 1');
    expect(radio1).toHaveClass('border-error-500');
    expect(radio1).toHaveClass('focus:ring-error-500');
  });

  it('renders default focus ring styles', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    const radio1 = screen.getByLabelText('Option 1');
    expect(radio1).toHaveClass('focus:ring-2');
    expect(radio1).toHaveClass('focus:ring-primary-500');
    expect(radio1).toHaveClass('focus:ring-offset-2');
  });

  it('merges custom className with base classes', () => {
    render(
      <Radio
        options={mockOptions}
        name="test-radio"
        className="custom-class"
      />
    );

    const radio1 = screen.getByLabelText('Option 1');
    expect(radio1).toHaveClass('custom-class');
    expect(radio1).toHaveClass('h-4');
    expect(radio1).toHaveClass('w-4');
  });

  it('forwards ref to first radio element', () => {
    const ref = vi.fn();
    render(<Radio options={mockOptions} name="test-radio" ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports defaultValue prop', () => {
    render(
      <Radio
        options={mockOptions}
        name="test-radio"
        defaultValue="option2"
      />
    );

    const radio2 = screen.getByLabelText('Option 2') as HTMLInputElement;
    expect(radio2.checked).toBe(true);
  });

  it('supports controlled value prop', () => {
    const { rerender } = render(
      <Radio
        options={mockOptions}
        name="test-radio"
        value="option1"
        onChange={vi.fn()}
      />
    );

    let radio1 = screen.getByLabelText('Option 1') as HTMLInputElement;
    expect(radio1.checked).toBe(true);

    rerender(
      <Radio
        options={mockOptions}
        name="test-radio"
        value="option2"
        onChange={vi.fn()}
      />
    );

    radio1 = screen.getByLabelText('Option 1') as HTMLInputElement;
    const radio2 = screen.getByLabelText('Option 2') as HTMLInputElement;
    expect(radio1.checked).toBe(false);
    expect(radio2.checked).toBe(true);
  });

  it('all radios share the same name attribute', () => {
    render(<Radio options={mockOptions} name="test-radio" />);

    mockOptions.forEach((option) => {
      const radio = screen.getByLabelText(option.label);
      expect(radio).toHaveAttribute('name', 'test-radio');
    });
  });
});
