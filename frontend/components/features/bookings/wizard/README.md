# Booking Wizard Components

Reusable components for the FleetPass booking wizard flow.

## Components

### PriceSummary

Displays rental price breakdown with daily rate, tax, total, and deposit information.

**Props:**
- `subtotalCents: number` - Subtotal amount in cents (before tax)
- `taxCents: number` - Tax amount in cents
- `totalCents: number` - Total amount in cents (subtotal + tax)
- `depositCents: number` - Deposit amount in cents
- `numDays: number` - Number of rental days
- `dailyRateCents: number` - Daily rate in cents
- `expanded?: boolean` - Whether the component is collapsible (default: true)
- `className?: string` - Additional CSS classes

**Features:**
- Automatic currency formatting ($X.XX)
- Daily rate breakdown (X days × $Y/day)
- Tax calculation display
- Security deposit information with icon
- Optional collapsible mode for compact display

**Example:**
```tsx
import { PriceSummary } from '@/components/features/bookings/wizard';

<PriceSummary
  subtotalCents={45000}
  taxCents={3600}
  totalCents={48600}
  depositCents={10000}
  numDays={3}
  dailyRateCents={15000}
/>
```

---

### MockCardInput

A mock credit card input form for testing payment flows with automatic formatting and validation.

**Props:**
- `register: UseFormRegister<PaymentFormData>` - react-hook-form register function
- `errors: FieldErrors<PaymentFormData>` - Form validation errors
- `className?: string` - Additional CSS classes

**Features:**
- Card number auto-formatting (XXXX XXXX XXXX XXXX)
- Expiry date auto-formatting (MM / YY)
- CVV input (3-4 digits, masked)
- Cardholder name validation
- Test mode badge warning
- Real-time validation display
- Security indicators

**Form Fields:**
- `cardNumber` - Credit card number (13-16 digits)
- `expiry` - Expiry date (MM/YY format)
- `cvv` - Card verification value (3-4 digits)
- `cardholderName` - Name on card

**Example:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MockCardInput } from '@/components/features/bookings/wizard';
import { paymentFormSchema, type PaymentFormData } from '@/lib/validations/payment.validation';

const { register, formState: { errors } } = useForm<PaymentFormData>({
  resolver: zodResolver(paymentFormSchema),
});

<MockCardInput
  register={register}
  errors={errors}
/>
```

---

### ErrorFallback

A user-friendly error display component for use with React Error Boundaries.

**Props:**
- `error: Error` - The error that was caught
- `resetErrorBoundary: () => void` - Function to reset the error boundary and retry
- `onGoBack?: () => void` - Optional callback when user clicks "Go Back"
- `className?: string` - Additional CSS classes

**Features:**
- Friendly error messaging
- Error icon and visual styling
- "Try Again" button to retry
- "Go Back" button to return to previous step
- Development-only error details (stack trace)
- Support contact information

**Example:**
```tsx
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorFallback } from '@/components/features/bookings/wizard';

<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => setStep(1)}
>
  <BookingWizardStep />
</ErrorBoundary>
```

---

## Utility Functions

Payment formatting utilities are located in `@/lib/utils/payment-formatting.ts` and can be imported directly or through the wizard barrel export.

### formatCardNumber(value: string): string

Formats card number with spaces (XXXX XXXX XXXX XXXX).

**Import options:**
```tsx
// Direct import
import { formatCardNumber } from '@/lib/utils/payment-formatting';

// Or via wizard barrel export
import { formatCardNumber } from '@/components/features/bookings/wizard';
```

**Usage:**
```tsx
const formatted = formatCardNumber('4242424242424242');
// Result: "4242 4242 4242 4242"
```

### formatExpiry(value: string): string

Formats expiry date (MM / YY).

**Import options:**
```tsx
// Direct import
import { formatExpiry } from '@/lib/utils/payment-formatting';

// Or via wizard barrel export
import { formatExpiry } from '@/components/features/bookings/wizard';
```

**Usage:**
```tsx
const formatted = formatExpiry('1225');
// Result: "12 / 25"
```

---

## Design System

All components follow the FleetPass design system:
- Colors: Primary blue, success green, error red, warning amber
- Typography: Inter font family
- Spacing: 8px base unit
- Shadows: Elevation system
- Accessibility: WCAG 2.1 AA compliant

See `/frontend/DESIGN_SYSTEM.md` for complete guidelines.
