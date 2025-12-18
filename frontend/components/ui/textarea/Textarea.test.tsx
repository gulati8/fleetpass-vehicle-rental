import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea placeholder="Enter text" />);
    const textarea = screen.getByPlaceholderText('Enter text');
    expect(textarea).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-neutral-300');
    expect(textarea).toHaveClass('focus-visible:border-primary-500');
  });

  it('renders error variant when error prop is true', () => {
    render(<Textarea data-testid="textarea" error />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-error-500');
  });

  it('renders success variant', () => {
    render(<Textarea data-testid="textarea" variant="success" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-success-500');
  });

  it('error prop overrides variant prop', () => {
    render(<Textarea data-testid="textarea" variant="success" error />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-error-500');
    expect(textarea).not.toHaveClass('border-success-500');
  });

  it('renders with default vertical resize', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('resize-y');
  });

  it('renders with resize none', () => {
    render(<Textarea data-testid="textarea" resize="none" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('resize-none');
  });

  it('renders with resize horizontal', () => {
    render(<Textarea data-testid="textarea" resize="horizontal" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('resize-x');
  });

  it('renders with resize both', () => {
    render(<Textarea data-testid="textarea" resize="both" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('resize');
  });

  it('handles disabled state', () => {
    render(<Textarea data-testid="textarea" disabled />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:cursor-not-allowed');
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;

    await user.type(textarea, 'Hello World');
    expect(textarea.value).toBe('Hello World');
  });

  it('calls onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Textarea data-testid="textarea" onChange={handleChange} />);

    await user.type(screen.getByTestId('textarea'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('merges custom className with variant classes', () => {
    render(<Textarea data-testid="textarea" className="custom-class" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-class');
    expect(textarea).toHaveClass('border-neutral-300');
  });

  it('forwards ref to textarea element', () => {
    const ref = vi.fn();
    render(<Textarea ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it('supports rows attribute', () => {
    render(<Textarea data-testid="textarea" rows={5} />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('supports cols attribute', () => {
    render(<Textarea data-testid="textarea" cols={50} />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('cols', '50');
  });

  it('supports maxLength attribute', () => {
    render(<Textarea data-testid="textarea" maxLength={100} />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });

  it('renders with default value', () => {
    render(<Textarea data-testid="textarea" defaultValue="Default text" />);
    const textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Default text');
  });

  it('renders with controlled value', () => {
    const { rerender } = render(
      <Textarea data-testid="textarea" value="Controlled" onChange={vi.fn()} />
    );
    let textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Controlled');

    rerender(
      <Textarea data-testid="textarea" value="Updated" onChange={vi.fn()} />
    );
    textarea = screen.getByTestId('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Updated');
  });
});
