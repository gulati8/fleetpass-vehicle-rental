import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormGroup } from './FormGroup';
import { Input } from '@/components/ui/input';

describe('FormGroup', () => {
  it('renders children', () => {
    render(
      <FormGroup>
        <Input data-testid="input" />
      </FormGroup>
    );
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(
      <FormGroup label="Email">
        <Input />
      </FormGroup>
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(
      <FormGroup>
        <Input />
      </FormGroup>
    );
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders helper text when provided', () => {
    render(
      <FormGroup helperText="Enter your email address">
        <Input />
      </FormGroup>
    );
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(
      <FormGroup error="Email is required">
        <Input />
      </FormGroup>
    );
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(
      <FormGroup
        helperText="Enter your email address"
        error="Email is required"
      >
        <Input />
      </FormGroup>
    );
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('renders required indicator when required prop is true', () => {
    render(
      <FormGroup label="Email" required>
        <Input />
      </FormGroup>
    );
    const label = screen.getByText('Email').parentElement;
    expect(label).toHaveTextContent('*');
  });

  it('associates label with input via htmlFor', () => {
    render(
      <FormGroup label="Email" htmlFor="email-input">
        <Input id="email-input" />
      </FormGroup>
    );
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('sets aria-describedby with error id when error is present', () => {
    const { container } = render(
      <FormGroup htmlFor="email-input" error="Email is required">
        <Input id="email-input" />
      </FormGroup>
    );
    const wrapper = container.querySelector('[aria-describedby]');
    expect(wrapper).toHaveAttribute('aria-describedby', 'email-input-error');
  });

  it('sets aria-describedby with helper id when helper text is present', () => {
    const { container } = render(
      <FormGroup htmlFor="email-input" helperText="Enter your email">
        <Input id="email-input" />
      </FormGroup>
    );
    const wrapper = container.querySelector('[aria-describedby]');
    expect(wrapper).toHaveAttribute('aria-describedby', 'email-input-helper');
  });

  it('sets aria-invalid to true when error is present', () => {
    const { container } = render(
      <FormGroup error="Email is required">
        <Input />
      </FormGroup>
    );
    const wrapper = container.querySelector('[aria-invalid]');
    expect(wrapper).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-invalid to false when no error', () => {
    const { container } = render(
      <FormGroup>
        <Input />
      </FormGroup>
    );
    const wrapper = container.querySelector('[aria-invalid]');
    expect(wrapper).toHaveAttribute('aria-invalid', 'false');
  });

  it('error message has correct id', () => {
    render(
      <FormGroup htmlFor="email-input" error="Email is required">
        <Input />
      </FormGroup>
    );
    const errorElement = screen.getByText('Email is required');
    expect(errorElement).toHaveAttribute('id', 'email-input-error');
  });

  it('helper text has correct id', () => {
    render(
      <FormGroup htmlFor="email-input" helperText="Enter your email">
        <Input />
      </FormGroup>
    );
    const helperElement = screen.getByText('Enter your email');
    expect(helperElement).toHaveAttribute('id', 'email-input-helper');
  });

  it('applies correct spacing classes', () => {
    const { container } = render(
      <FormGroup>
        <Input />
      </FormGroup>
    );
    const formGroup = container.firstChild;
    expect(formGroup).toHaveClass('space-y-2');
  });

  it('works with different form elements', () => {
    const { container } = render(
      <FormGroup label="Description">
        <textarea data-testid="textarea" />
      </FormGroup>
    );
    expect(screen.getByTestId('textarea')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });
});
