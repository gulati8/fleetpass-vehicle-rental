import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MockCardInput } from './MockCardInput';
import { paymentFormSchema, type PaymentFormData } from '@/lib/validations/payment.validation';

// Test wrapper component
function TestWrapper() {
  const {
    register,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
  });

  return <MockCardInput register={register} errors={errors} />;
}

// Test wrapper with errors
function TestWrapperWithErrors() {
  const {
    register,
    formState: { errors },
    trigger,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    mode: 'onChange',
  });

  // Manually set errors for testing
  const mockErrors = {
    cardNumber: { message: 'Card number is required' },
    expiry: { message: 'Expiry date is required' },
    cvv: { message: 'CVV is required' },
    cardholderName: { message: 'Cardholder name is required' },
  };

  return <MockCardInput register={register} errors={mockErrors as any} />;
}

describe('MockCardInput - Accessibility', () => {
  describe('Label Associations', () => {
    it('has proper htmlFor attribute for card number label', () => {
      render(<TestWrapper />);
      const label = screen.getByText('Card Number');
      expect(label).toHaveAttribute('for', 'cardNumber');
    });

    it('has proper htmlFor attribute for expiry label', () => {
      render(<TestWrapper />);
      const label = screen.getByText('Expiry Date');
      expect(label).toHaveAttribute('for', 'expiry');
    });

    it('has proper htmlFor attribute for CVV label', () => {
      render(<TestWrapper />);
      const label = screen.getByText('CVV');
      expect(label).toHaveAttribute('for', 'cvv');
    });

    it('has proper htmlFor attribute for cardholder name label', () => {
      render(<TestWrapper />);
      const label = screen.getByText('Cardholder Name');
      expect(label).toHaveAttribute('for', 'cardholderName');
    });

    it('all inputs have matching id attributes', () => {
      render(<TestWrapper />);

      const cardNumberInput = screen.getByPlaceholderText('4242 4242 4242 4242');
      const expiryInput = screen.getByPlaceholderText('MM / YY');
      const cvvInput = screen.getByPlaceholderText('123');
      const cardholderInput = screen.getByPlaceholderText('John Doe');

      expect(cardNumberInput).toHaveAttribute('id', 'cardNumber');
      expect(expiryInput).toHaveAttribute('id', 'expiry');
      expect(cvvInput).toHaveAttribute('id', 'cvv');
      expect(cardholderInput).toHaveAttribute('id', 'cardholderName');
    });
  });

  describe('ARIA Attributes', () => {
    it('sets aria-invalid on card number when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('4242 4242 4242 4242');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-invalid on expiry when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('MM / YY');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-invalid on CVV when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('123');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-invalid on cardholder name when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('John Doe');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('sets aria-describedby on card number when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('4242 4242 4242 4242');
      expect(input).toHaveAttribute('aria-describedby', 'cardNumber-error');
    });

    it('sets aria-describedby on expiry when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('MM / YY');
      expect(input).toHaveAttribute('aria-describedby', 'expiry-error');
    });

    it('sets aria-describedby on CVV when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('123');
      expect(input).toHaveAttribute('aria-describedby', 'cvv-error');
    });

    it('sets aria-describedby on cardholder name when there is an error', () => {
      render(<TestWrapperWithErrors />);
      const input = screen.getByPlaceholderText('John Doe');
      expect(input).toHaveAttribute('aria-describedby', 'cardholderName-error');
    });
  });

  describe('Error Messages', () => {
    it('displays error message with role="alert" for card number', () => {
      render(<TestWrapperWithErrors />);
      const errorMessage = screen.getByText('Card number is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('id', 'cardNumber-error');
    });

    it('displays error message with role="alert" for expiry', () => {
      render(<TestWrapperWithErrors />);
      const errorMessage = screen.getByText('Expiry date is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('id', 'expiry-error');
    });

    it('displays error message with role="alert" for CVV', () => {
      render(<TestWrapperWithErrors />);
      const errorMessage = screen.getByText('CVV is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('id', 'cvv-error');
    });

    it('displays error message with role="alert" for cardholder name', () => {
      render(<TestWrapperWithErrors />);
      const errorMessage = screen.getByText('Cardholder name is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('id', 'cardholderName-error');
    });

    it('error messages have proper styling for visibility', () => {
      render(<TestWrapperWithErrors />);
      const errorMessage = screen.getByText('Card number is required');
      expect(errorMessage).toHaveClass('text-sm', 'text-error-600');
    });
  });

  describe('Semantic HTML', () => {
    it('uses proper label elements instead of divs', () => {
      const { container } = render(<TestWrapper />);
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThanOrEqual(4);
    });

    it('inputs have proper autocomplete attributes', () => {
      render(<TestWrapper />);

      const cardNumberInput = screen.getByPlaceholderText('4242 4242 4242 4242');
      const expiryInput = screen.getByPlaceholderText('MM / YY');
      const cvvInput = screen.getByPlaceholderText('123');
      const cardholderInput = screen.getByPlaceholderText('John Doe');

      expect(cardNumberInput).toHaveAttribute('autocomplete', 'cc-number');
      expect(expiryInput).toHaveAttribute('autocomplete', 'cc-exp');
      expect(cvvInput).toHaveAttribute('autocomplete', 'cc-csc');
      expect(cardholderInput).toHaveAttribute('autocomplete', 'cc-name');
    });

    it('inputs have proper inputMode for numeric fields', () => {
      render(<TestWrapper />);

      const cardNumberInput = screen.getByPlaceholderText('4242 4242 4242 4242');
      const expiryInput = screen.getByPlaceholderText('MM / YY');
      const cvvInput = screen.getByPlaceholderText('123');

      expect(cardNumberInput).toHaveAttribute('inputmode', 'numeric');
      expect(expiryInput).toHaveAttribute('inputmode', 'numeric');
      expect(cvvInput).toHaveAttribute('inputmode', 'numeric');
    });
  });

  describe('Screen Reader Support', () => {
    it('renders test mode warning that screen readers can access', () => {
      render(<TestWrapper />);
      const warning = screen.getByText(/This is a test payment/i);
      expect(warning).toBeInTheDocument();
    });

    it('renders heading for payment information section', () => {
      render(<TestWrapper />);
      const heading = screen.getByText('Payment Information');
      expect(heading).toBeInTheDocument();
    });

    it('provides descriptive text for payment security', () => {
      render(<TestWrapper />);
      const securityText = screen.getByText(/Your payment information is secure and encrypted/i);
      expect(securityText).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('all input fields are keyboard accessible (no tabindex=-1)', () => {
      render(<TestWrapper />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});

describe('MockCardInput - Formatting Functions', () => {
  it('renders without errors', () => {
    render(<TestWrapper />);
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
  });

  it('displays all form fields', () => {
    render(<TestWrapper />);

    expect(screen.getByPlaceholderText('4242 4242 4242 4242')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('MM / YY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
  });

  it('displays test mode badge', () => {
    render(<TestWrapper />);
    expect(screen.getByText('Test Mode')).toBeInTheDocument();
  });

  it('displays test card instructions', () => {
    render(<TestWrapper />);
    expect(screen.getByText(/4242 4242 4242 4242/i)).toBeInTheDocument();
  });
});
