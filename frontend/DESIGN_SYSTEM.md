# FleetPass Design System

This document outlines the design system foundation for FleetPass, a vehicle rental platform built with Next.js 14, React, and Tailwind CSS.

## Design Philosophy

**Professional B2B Aesthetic**: FleetPass is designed for business users managing vehicle fleets. The design prioritizes:
- **Trustworthiness**: Clean, professional appearance that inspires confidence
- **Efficiency**: Clear information hierarchy and quick access to critical data
- **Modernity**: Contemporary design patterns without being overly trendy
- **Accessibility**: WCAG 2.1 AA compliant for all users

## Color System

### Primary - Professional Blue
Main brand color, used for primary actions and brand elements.

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#f0f9ff` | Lightest backgrounds |
| `primary-100` | `#e0f2fe` | Subtle backgrounds |
| `primary-200` | `#bae6fd` | Hover states (light) |
| `primary-300` | `#7dd3fc` | Borders, dividers |
| `primary-400` | `#38bdf8` | Interactive elements |
| `primary-500` | `#0ea5e9` | **Main brand color** |
| `primary-600` | `#0284c7` | Primary buttons |
| `primary-700` | `#0369a1` | Hover states |
| `primary-800` | `#075985` | Active states |
| `primary-900` | `#0c4a6e` | Dark text |
| `primary-950` | `#082f49` | Darkest text |

**Usage Examples**:
- Primary buttons: `primary-600`
- Links: `primary-600`
- Focus rings: `primary-500`
- Badges: `primary-100` background, `primary-700` text

### Secondary - Teal/Cyan
Accent color for secondary actions and visual variety.

| Token | Hex | Usage |
|-------|-----|-------|
| `secondary-500` | `#14b8a6` | Main accent |
| `secondary-600` | `#0d9488` | Secondary buttons |
| `secondary-700` | `#0f766e` | Hover states |

**Usage Examples**:
- Secondary CTAs
- Success states (alternative)
- Data visualization accents

### Success - Green
Indicates successful operations, confirmations, and positive states.

| Token | Hex | Usage |
|-------|-----|-------|
| `success-100` | `#dcfce7` | Success backgrounds |
| `success-500` | `#22c55e` | Success indicators |
| `success-600` | `#16a34a` | Success buttons |
| `success-700` | `#15803d` | Success text |

**Usage Examples**:
- "Booking Confirmed" badges
- Form validation success
- Availability indicators

### Warning - Amber
Highlights caution, important information, or pending actions.

| Token | Hex | Usage |
|-------|-----|-------|
| `warning-100` | `#fef3c7` | Warning backgrounds |
| `warning-500` | `#f59e0b` | Warning indicators |
| `warning-700` | `#b45309` | Warning text |

**Usage Examples**:
- "Maintenance Required" alerts
- Expiring licenses
- Form validation warnings

### Error - Red
Indicates errors, destructive actions, or critical issues.

| Token | Hex | Usage |
|-------|-----|-------|
| `error-100` | `#fee2e2` | Error backgrounds |
| `error-500` | `#ef4444` | Error indicators |
| `error-600` | `#dc2626` | Destructive buttons |
| `error-700` | `#b91c1c` | Error text |

**Usage Examples**:
- Form validation errors
- "Delete" buttons
- Critical alerts

### Neutral - Grayscale
Used for text, borders, backgrounds, and UI structure.

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#fafafa` | Lightest backgrounds |
| `neutral-100` | `#f5f5f5` | Subtle backgrounds |
| `neutral-200` | `#e5e5e5` | Borders |
| `neutral-300` | `#d4d4d4` | Dividers |
| `neutral-400` | `#a3a3a3` | Placeholder text |
| `neutral-500` | `#737373` | Secondary text |
| `neutral-600` | `#525252` | Body text (light mode) |
| `neutral-700` | `#404040` | Headings (light mode) |
| `neutral-800` | `#262626` | Dark surfaces |
| `neutral-900` | `#171717` | Main text (dark mode) |
| `neutral-950` | `#0a0a0a` | Darkest backgrounds |

## Typography

### Font Family
**Primary**: Inter (Google Fonts)
- Professional, highly legible sans-serif
- Excellent readability at all sizes
- Complete OpenType features

```css
font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
```

### Font Feature Settings
```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
font-variant-numeric: tabular-nums;
```
- Enables alternate glyphs for better readability
- Tabular numbers for data tables

### Type Scale

| Element | Class | Size | Line Height | Usage |
|---------|-------|------|-------------|-------|
| H1 | `text-4xl` to `text-6xl` | 2.25rem - 3.75rem | 1 | Page titles |
| H2 | `text-3xl` to `text-5xl` | 1.875rem - 3rem | 1 | Section titles |
| H3 | `text-2xl` to `text-4xl` | 1.5rem - 2.25rem | 2rem - 2.5rem | Subsection titles |
| H4 | `text-xl` to `text-3xl` | 1.25rem - 1.875rem | 1.75rem - 2.25rem | Card titles |
| H5 | `text-lg` to `text-xl` | 1.125rem - 1.25rem | 1.75rem | Small headings |
| H6 | `text-base` to `text-lg` | 1rem - 1.125rem | 1.5rem - 1.75rem | Captions |
| Body | `text-base` | 1rem | 1.5rem | Main content |
| Small | `text-sm` | 0.875rem | 1.25rem | Secondary text |
| Tiny | `text-xs` | 0.75rem | 1rem | Labels, badges |

**Responsive Typography**:
All headings scale responsively using sm/lg breakpoints:
```html
<h1 class="text-4xl sm:text-5xl lg:text-6xl">
  Responsive Heading
</h1>
```

### Font Weights
- `font-normal` (400): Body text
- `font-medium` (500): Buttons, emphasis
- `font-semibold` (600): Headings, labels
- `font-bold` (700): Strong emphasis (use sparingly)

## Spacing System

Based on an **8px base unit** for consistent rhythm.

### Standard Scale
| Token | Size | Usage |
|-------|------|-------|
| `0` | 0px | Zero spacing |
| `1` | 4px | Tight spacing |
| `2` | 8px | **Base unit** |
| `3` | 12px | Small gaps |
| `4` | 16px | Standard gaps |
| `6` | 24px | Section padding |
| `8` | 32px | Large gaps |
| `12` | 48px | Section margins |
| `16` | 64px | Major sections |
| `24` | 96px | Page sections |

### Extended Scale
Custom tokens for specific needs:
`18`, `22`, `26`, `30`, `34`, `38`, `42`, `46`, `50`, `54`, `58`, `62`, etc.

**Usage Guidelines**:
- Component padding: `4` (16px), `6` (24px)
- Element gaps: `2` (8px), `4` (16px)
- Section spacing: `8` (32px), `12` (48px), `16` (64px)
- Page margins: `4` to `8` on mobile, `8` to `16` on desktop

## Shadows

### Standard Shadows
| Class | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation (cards at rest) |
| `shadow` | Default elevation |
| `shadow-md` | Medium elevation (hover states) |
| `shadow-lg` | High elevation (modals, popovers) |
| `shadow-xl` | Very high elevation (dropdowns) |
| `shadow-2xl` | Maximum elevation (emphasized modals) |

### Glow Effects (for CTAs and focus states)
| Class | Usage |
|-------|-------|
| `shadow-glow-sm` | Subtle glow |
| `shadow-glow` | Standard glow |
| `shadow-glow-lg` | Prominent glow |

## Border Radius

| Class | Size | Usage |
|-------|------|-------|
| `rounded` | 0.5rem | Default (buttons, inputs) |
| `rounded-lg` | 0.75rem | Cards, larger elements |
| `rounded-xl` | 1rem | Featured cards |
| `rounded-2xl` | 1.5rem | Hero sections |
| `rounded-full` | 9999px | Pills, avatars |

## Animations

### Standard Animations
All animations are smooth and respect `prefers-reduced-motion`.

| Animation | Class | Duration | Usage |
|-----------|-------|----------|-------|
| Fade In | `animate-fade-in` | 200ms | Content reveal |
| Fade Out | `animate-fade-out` | 200ms | Content hide |
| Slide In Up | `animate-slide-in-up` | 300ms | Bottom sheets |
| Slide In Down | `animate-slide-in-down` | 300ms | Dropdowns |
| Slide In Left | `animate-slide-in-left` | 300ms | Side panels |
| Slide In Right | `animate-slide-in-right` | 300ms | Side panels |
| Scale In | `animate-scale-in` | 200ms | Modals |
| Shimmer | `animate-shimmer` | 2s loop | Loading states |
| Shake | `animate-shake` | 500ms | Error feedback |

### Transition Durations
- **Fast**: `duration-150` (150ms) - Hover states
- **Normal**: `duration-200` (200ms) - Standard interactions
- **Slow**: `duration-300` (300ms) - Complex animations

## Component Utility Classes

Pre-built classes for common patterns. These are production-ready and save development time.

### Buttons

```html
<!-- Primary Button -->
<button class="btn-primary px-4 py-2">Book Now</button>

<!-- Secondary Button -->
<button class="btn-secondary px-4 py-2">Learn More</button>

<!-- Outline Button -->
<button class="btn-outline px-4 py-2">Cancel</button>

<!-- Ghost Button -->
<button class="btn-ghost px-4 py-2">View Details</button>

<!-- Danger Button -->
<button class="btn-danger px-4 py-2">Delete</button>
```

**Built-in features**:
- Focus rings (accessibility)
- Disabled states
- Smooth transitions
- Proper hover/active states

### Inputs

```html
<!-- Standard Input -->
<input class="input-base" type="text" placeholder="Enter text..." />

<!-- Error State -->
<input class="input-error" type="email" />

<!-- Success State -->
<input class="input-success" type="email" />
```

### Cards

```html
<!-- Static Card -->
<div class="card p-6">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>

<!-- Hoverable Card -->
<div class="card-hover p-6">
  <h3>Hover Me</h3>
</div>

<!-- Clickable Card -->
<div class="card-clickable p-6">
  <h3>Click Me</h3>
</div>
```

### Badges

```html
<span class="badge-primary">Active</span>
<span class="badge-success">Confirmed</span>
<span class="badge-warning">Pending</span>
<span class="badge-error">Canceled</span>
<span class="badge-neutral">Draft</span>
```

### Alerts

```html
<div class="alert-info">
  <p>Information message</p>
</div>

<div class="alert-success">
  <p>Success message</p>
</div>

<div class="alert-warning">
  <p>Warning message</p>
</div>

<div class="alert-error">
  <p>Error message</p>
</div>
```

### Tables

```html
<table class="table">
  <thead>
    <tr>
      <th>Vehicle</th>
      <th>Status</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Tesla Model 3</td>
      <td><span class="badge-success">Available</span></td>
      <td>$45/day</td>
    </tr>
  </tbody>
</table>
```

## Utility Classes

### Glass Morphism
```html
<div class="glass p-6">
  Semi-transparent with blur
</div>
```

### Gradients
```html
<div class="gradient-primary">Primary gradient</div>
<div class="gradient-secondary">Secondary gradient</div>
<div class="gradient-brand">Brand gradient</div>
```

### Text Truncation
```html
<p class="truncate-2">Truncate after 2 lines...</p>
<p class="truncate-3">Truncate after 3 lines...</p>
<p class="truncate-4">Truncate after 4 lines...</p>
```

### Container
```html
<div class="section-container">
  <!-- Max-width container with responsive padding -->
</div>
```

## Accessibility

### Focus States
All interactive elements have visible focus indicators:
- **Ring**: 2px ring with primary-500 color
- **Ring Offset**: 2px offset for visibility
- **Keyboard Only**: Uses `:focus-visible` to avoid mouse focus rings

### Color Contrast
All color combinations meet WCAG 2.1 AA standards:
- **Normal text**: 4.5:1 contrast ratio minimum
- **Large text**: 3:1 contrast ratio minimum
- **UI components**: 3:1 contrast ratio minimum

### Reduced Motion
All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled or reduced */
}
```

### Semantic HTML
Always use appropriate semantic elements:
- `<button>` for actions
- `<a>` for navigation
- `<nav>`, `<main>`, `<article>`, `<section>` for structure

## Dark Mode

Dark mode is supported via the `dark:` variant with the `class` strategy.

**Enabling Dark Mode**:
```tsx
<html class="dark">
  {/* Dark mode styles automatically applied */}
</html>
```

**Dark Mode Color Adjustments**:
- Background: `neutral-950`
- Foreground: `neutral-50`
- Cards: `neutral-900`
- Borders: `neutral-800`
- Primary: Slightly lighter shades for better contrast

## React Component Integration

### Using CVA (Class Variance Authority)

```tsx
import { cva, type VariantProps } from '@/lib/cva';
import { cn } from '@/lib/utils';

const buttonVariants = cva('btn-base', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {}

function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Using CN Utility

The `cn()` utility safely merges Tailwind classes:

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  'override-classes'
)} />
```

**Key feature**: Later classes override earlier ones correctly:
```tsx
cn('px-2', 'px-4') // Result: 'px-4'
```

## Best Practices

### 1. Color Usage
- Use semantic color names (primary, success, error) not generic (blue, green, red)
- Maintain consistent color meanings across the app
- Always check contrast ratios for text on colored backgrounds

### 2. Spacing Consistency
- Stick to the 8px spacing scale
- Use consistent padding within similar component types
- Maintain visual rhythm with regular spacing patterns

### 3. Typography Hierarchy
- Only use one H1 per page
- Don't skip heading levels (H1 → H2 → H3, not H1 → H3)
- Use appropriate semantic HTML (`<p>`, `<h1>`, `<button>`)

### 4. Animation Performance
- Keep animations under 300ms for perceived speed
- Use `transform` and `opacity` for performant animations
- Always respect `prefers-reduced-motion`

### 5. Component Composition
- Build from utility classes first, then extract components
- Use CVA for variant-heavy components (buttons, badges)
- Keep components focused on single responsibility

## Resources

- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **Class Variance Authority**: https://cva.style/docs
- **Inter Font**: https://rsms.me/inter/
- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Maintainer**: FleetPass Frontend Team
