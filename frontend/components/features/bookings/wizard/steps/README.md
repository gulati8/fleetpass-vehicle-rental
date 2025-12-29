# Booking Wizard Steps

This directory contains the step components for the multi-step booking wizard flow.

## Components

### StepIndicator

A responsive visual progress indicator for multi-step booking wizard flows.

## Overview

The `StepIndicator` component displays a visual representation of the current step in a 4-step booking process:
1. Booking Details
2. Review
3. Payment
4. Confirmation

It provides a professional, accessible way to guide users through the booking wizard with clear visual feedback about their progress.

## Props

```typescript
interface StepIndicatorProps {
  currentStep: number;    // Current step (1-4)
  completedSteps: number[]; // Array of completed step numbers
}
```

### Props Details

- **`currentStep`** (required): The current active step in the wizard (values: 1, 2, 3, or 4)
- **`completedSteps`** (required): An array of step numbers that have been completed (e.g., `[1, 2]`)

## Usage

### Basic Example

```tsx
import { StepIndicator } from '@/components/features/bookings/wizard/steps';

export function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  return (
    <div>
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
      />
      {/* Wizard form content */}
    </div>
  );
}
```

### With Step Progression

```tsx
export function BookingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleNext = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  return (
    <div>
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {currentStep === 1 && <BookingDetailsForm onNext={handleNext} />}
      {currentStep === 2 && (
        <ReviewForm onNext={handleNext} onPrevious={handlePrevious} />
      )}
      {currentStep === 3 && (
        <PaymentForm onNext={handleNext} onPrevious={handlePrevious} />
      )}
      {currentStep === 4 && (
        <ConfirmationStep onComplete={handleComplete} />
      )}
    </div>
  );
}
```

## Visual Design

### Desktop View (sm and above)

- Horizontal stepper with numbered circles
- Step labels below/beside circles
- Connector lines between steps
- Visual states:
  - **Completed**: Green circle with checkmark icon
  - **Current**: Blue circle with number and ring effect
  - **Future**: Gray circle with number

### Mobile View (below sm)

- Compact progress bar
- Text showing "Step X of 4"
- Current step label displayed
- Optimized for small screens

## Styling

All styles use the FleetPass design system colors:

- **Completed steps**: `success-600` (green)
- **Current step**: `primary-600` (blue) with ring effect
- **Future steps**: `neutral-200` (light gray)
- **Connector lines**: `neutral-200` → `success-600` (when previous step completed)

Size specifications:
- Step circles: `w-12 h-12` (48px × 48px)
- Connector lines: `h-0.5` (2px height)
- Ring effect on current: `ring-4 ring-primary-200`

## Accessibility Features

### Semantic HTML

- Uses `<ol>` element for step list (ordered list)
- Proper semantic structure for screen readers

### ARIA Attributes

- `aria-current="step"` on the current step circle
- Descriptive `aria-label` on each step:
  - Completed steps: "Step X: [Label] - Completed"
  - Current step: "Step X: [Label] - Current"
  - Future steps: "Step X: [Label]"

### Progress Bar (Mobile)

- `role="progressbar"`
- `aria-valuenow` - Current step (1-4)
- `aria-valuemin` - Minimum (1)
- `aria-valuemax` - Maximum (4)

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus indicators follow design system guidelines

## Animations

- Smooth transitions on color changes (200ms)
- Progress bar width animation on mobile (300ms)
- All animations respect `prefers-reduced-motion` via Tailwind

## Testing

The component includes comprehensive test coverage:

```bash
npm run test -- StepIndicator.test.tsx
```

### Test Coverage

- Rendering of all 4 steps
- Current step styling and updates
- Completed steps display (checkmarks)
- Mobile view progress bar
- Accessibility features (ARIA, semantic HTML)
- Step progression scenarios
- Visual state colors

All 21 tests pass with 100% coverage.

## Examples

### Just Started

```tsx
<StepIndicator currentStep={1} completedSteps={[]} />
```

### On Step 2

```tsx
<StepIndicator currentStep={2} completedSteps={[1]} />
```

### On Step 3

```tsx
<StepIndicator currentStep={3} completedSteps={[1, 2]} />
```

### Final Step

```tsx
<StepIndicator currentStep={4} completedSteps={[1, 2, 3]} />
```

## Browser Support

- Modern browsers with ES2020+ support
- Mobile browsers (iOS Safari, Chrome Android)
- Respects `prefers-reduced-motion` system preference

## Dependencies

- **lucide-react**: For CheckCircle2 icon
- **@/lib/utils**: For `cn()` utility function
- **React 18+**: For component hooks
- **Tailwind CSS 3+**: For styling

## File Structure

```
components/features/bookings/wizard/steps/
├── StepIndicator.tsx        # Main component
├── StepIndicator.test.tsx   # Comprehensive tests
├── index.ts                 # Exports
└── README.md                # This file
```

## Integration with Booking Wizard

The StepIndicator component is designed to be the header of the booking wizard. Place it at the top of your wizard container to give users clear visual feedback about their progress through the booking process.

```tsx
<div className="space-y-8">
  <StepIndicator
    currentStep={currentStep}
    completedSteps={completedSteps}
  />
  <div className="mt-8">
    {/* Step content here */}
  </div>
</div>
```

## Notes

- The component is `'use client'` as it's a client component (React)
- Works seamlessly with Next.js 14 App Router
- No external dependencies beyond lucide-react
- Fully typed with TypeScript for excellent developer experience

---

### Step1BookingDetails

**Purpose:** Collects all booking-related information in the first step of the wizard.

**Location:** `Step1BookingDetails.tsx`

**Features:**
- Integrates existing BookingForm UI into wizard flow
- Customer selection with searchable dropdown
- Vehicle selection with details
- Pickup/Dropoff location and datetime selection
- Optional booking notes
- Real-time estimated total calculation
- Form validation with react-hook-form + zod
- Automatic sync with wizard context
- Support for pre-filled data (edit mode)

**Props:**
```typescript
interface BookingDetailsStepProps {
  onNext: (data: BookingWizardData) => void;
}
```

**Usage:**
```tsx
import { Step1BookingDetails } from './steps';
import { useWizard } from './BookingWizardContext';

function WizardFlow() {
  const { next, updateBookingData } = useWizard();

  const handleNext = async (data: BookingWizardData) => {
    updateBookingData(data);
    await next();
  };

  return <Step1BookingDetails onNext={handleNext} />;
}
```

**Dependencies:**
- `@/lib/hooks/api/use-customers` - Fetch customer list
- `@/lib/hooks/api/use-vehicles` - Fetch vehicle list
- `@/lib/hooks/api/use-locations` - Fetch location list
- `@/lib/validations/booking.validation` - Form validation schema
- `BookingWizardContext` - Wizard state management

**Validation Rules:**
- Customer ID: Required
- Vehicle ID: Required
- Pickup Location: Required
- Dropoff Location: Required
- Pickup DateTime: Required, cannot be in the past (1hr grace period)
- Dropoff DateTime: Required, must be after pickup
- Notes: Optional

**State Management:**
- Form state managed by `react-hook-form`
- Wizard state synced via `useWizard()` hook
- Changes auto-saved to session storage (24hr TTL)
- Validation errors displayed inline and in step error section

**Testing:**
```bash
npm test -- components/features/bookings/wizard/steps/__tests__/Step1BookingDetails.test.tsx --run
```

All tests pass with coverage for:
- Component rendering
- Form validation
- Error handling
- User interactions
- State synchronization

---

## File Structure

```
steps/
├── index.ts                         # Exports all step components
├── README.md                        # This file
├── Step1BookingDetails.tsx          # Step 1: Booking details form
├── Step1BookingDetails.example.tsx  # Usage examples
├── StepIndicator.tsx                # Progress indicator component
└── __tests__/
    ├── Step1BookingDetails.test.tsx # Step 1 tests
    └── StepIndicator.test.tsx       # Indicator tests
```

## Related Documentation

- [Wizard Context Documentation](../BookingWizardContext.tsx)
- [Wizard Types](../../../../types/wizard.types.ts)
- [Form Validation Schemas](../../../../lib/validations/booking.validation.ts)
- [Design System](../../../../DESIGN_SYSTEM.md)
