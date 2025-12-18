# FleetPass UI Component Library

Core UI primitives for the FleetPass application, built with React, TypeScript, Tailwind CSS, and Class Variance Authority (CVA).

## Architecture

This component library follows a **three-tier architecture**:

1. **Primitives (ui/)** - Foundational components (Button, Input, Label, etc.)
2. **Composites (composite/)** - Components built from primitives (Card, Modal, etc.)
3. **Features (features/)** - Domain-specific components (VehicleCard, BookingForm, etc.)

## Core Components

### Button

A flexible button component with multiple variants and states.

**Features:**
- 5 variants: primary, secondary, outline, ghost, danger
- 3 sizes: sm, md, lg
- Loading state with spinner
- Icon support (left/right)
- Polymorphic (can render as `button` or `a`)
- Full width option

**Usage:**
```tsx
import { Button } from '@/components/ui';

// Basic usage
<Button>Click me</Button>

// With variants and sizes
<Button variant="secondary" size="lg">Large Secondary</Button>

// With loading state
<Button isLoading>Processing...</Button>

// With icons
<Button leftIcon={<SearchIcon />}>Search</Button>

// As link
<Button as="a" href="/dashboard">Go to Dashboard</Button>

// Full width
<Button fullWidth>Submit</Button>
```

### Input

A text input component with error states and addons.

**Features:**
- 3 variants: default, error, success
- 3 sizes: sm, md, lg
- Left/right addon support
- Error state styling
- All standard HTML input attributes

**Usage:**
```tsx
import { Input } from '@/components/ui';

// Basic usage
<Input placeholder="Enter text..." />

// With error state
<Input error placeholder="Invalid input" />

// With addons
<Input
  leftAddon={<SearchIcon />}
  placeholder="Search..."
/>

<Input
  leftAddon="$"
  rightAddon=".00"
  placeholder="0"
/>

// Different sizes
<Input size="lg" placeholder="Large input" />
```

### Label

A label component for form fields with required/optional indicators.

**Features:**
- Required indicator (red asterisk)
- Optional text indicator
- Proper htmlFor association

**Usage:**
```tsx
import { Label } from '@/components/ui';

// Basic usage
<Label htmlFor="email">Email Address</Label>

// Required field
<Label htmlFor="password" required>Password</Label>

// Optional field
<Label htmlFor="phone" optional>Phone Number</Label>
```

### FormError

An error message component for form fields.

**Features:**
- Only renders when children are present
- ARIA role="alert" for accessibility
- Consistent error styling

**Usage:**
```tsx
import { FormError } from '@/components/ui';

// Basic usage
<FormError>This field is required</FormError>

// Conditional rendering (returns null when no children)
<FormError>{error?.message}</FormError>
```

### FormField

A complete form field component that integrates with React Hook Form.

**Features:**
- Full React Hook Form integration via `useController`
- Automatic error display from validation
- Helper text support
- All Input props support via `inputProps`
- Proper ARIA attributes

**Usage:**
```tsx
import { FormField } from '@/components/ui';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        name="email"
        control={control}
        label="Email Address"
        required
        helperText="We'll never share your email"
        rules={{
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        }}
        inputProps={{
          type: 'email',
          placeholder: 'john@example.com',
        }}
      />
    </form>
  );
}
```

## Design System Integration

All components use the design system tokens from `tailwind.config.ts`:

**Colors:**
- `primary-*` - Professional blue (main brand)
- `secondary-*` - Teal/cyan (accents)
- `success-*` - Green (success states)
- `warning-*` - Amber (warnings)
- `error-*` - Red (errors)
- `neutral-*` - Gray scale (text, borders)

**Typography:**
- Font family: Inter
- Font sizes: xs, sm, base, lg, xl, 2xl, etc.
- Consistent line heights

**Spacing:**
- Standard Tailwind scale (4px base)
- Custom scales for specific needs

**Shadows:**
- sm, DEFAULT, md, lg, xl, 2xl
- Special glow effects for interactive elements

**Animations:**
- fade-in/out
- slide-in (up, down, left, right)
- scale-in/out
- shimmer, spin-slow, pulse-slow
- shake, wiggle

## Type Safety

All components are fully typed with TypeScript:

- Component props extend standard HTML attributes
- CVA variants are type-safe via `VariantProps`
- React Hook Form integration uses proper generics

## Testing

All components have comprehensive test coverage:

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

**Current Coverage: 100%** (Statements, Branches, Functions, Lines)

## Accessibility

All components follow accessibility best practices:

- Semantic HTML elements
- Proper ARIA attributes (role, aria-invalid, aria-describedby)
- Keyboard navigation support
- Focus states with visible rings
- Screen reader friendly
- Disabled state handling

## Component Showcase

Visit `/components-showcase` in the application to see all components in action with interactive examples.

## Development Guidelines

### Adding New Components

1. Create component directory: `components/ui/{component-name}/`
2. Create files:
   - `{ComponentName}.types.ts` - TypeScript types and CVA variants
   - `{ComponentName}.tsx` - Component implementation
   - `{ComponentName}.test.tsx` - Test suite
   - `index.ts` - Barrel export

3. Follow patterns:
   - Use `forwardRef` for all components
   - Set `displayName` for debugging
   - Use CVA for variant management
   - Use `cn()` utility for className merging
   - Extend appropriate HTML attributes

4. Write comprehensive tests:
   - Render tests
   - Variant tests
   - Interaction tests
   - Accessibility tests
   - Edge case tests

5. Update barrel exports:
   - Add to component directory `index.ts`
   - Add to `components/ui/index.ts`

### Code Style

- **TypeScript strict mode** - No `any` types
- **Functional components** - Use hooks, not classes
- **Colocation** - Keep related files together
- **Naming conventions**:
  - Components: PascalCase
  - Props interfaces: `{ComponentName}Props`
  - Types files: `{ComponentName}.types.ts`

## Dependencies

- `react` - Component library
- `react-dom` - DOM rendering
- `react-hook-form` - Form state management
- `class-variance-authority` - Type-safe variants
- `clsx` - Conditional classes
- `tailwind-merge` - Tailwind class merging
- `lucide-react` - Icon library

## Future Roadmap

Upcoming primitive components:

- **Select** - Dropdown selection
- **Checkbox** - Checkbox input
- **Radio** - Radio button input
- **Switch** - Toggle switch
- **Textarea** - Multi-line text input
- **Badge** - Status indicators
- **Avatar** - User avatars
- **Spinner** - Loading indicators

See the project roadmap for composite and feature components.
