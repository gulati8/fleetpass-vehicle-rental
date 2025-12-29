# Session Storage Date Serialization

## Overview

The session storage utilities in `lib/utils/session-storage.ts` persist wizard state to browser session storage for session recovery. This document describes the date serialization behavior and implementation details.

## The Challenge: JSON Date Serialization

JavaScript's `JSON.stringify()` and `JSON.parse()` don't natively preserve `Date` objects. When you serialize a `Date`, it becomes an ISO 8601 string:

```typescript
// Before serialization
const date = new Date('2024-12-28T10:30:45.123Z');
typeof date; // 'object'

// After JSON.stringify() + JSON.parse()
const serialized = JSON.stringify({ date });
const parsed = JSON.parse(serialized);
typeof parsed.date; // 'string' (lost type information!)
parsed.date; // '2024-12-28T10:30:45.123Z'
```

This is problematic because the `WizardState` type expects `Date` objects:

```typescript
export interface WizardState {
  initializedAt: Date;      // Must be a Date object
  lastUpdatedAt: Date;      // Must be a Date object
  // ... other fields
}
```

## Solution: Custom Reviver Function

We use a **reviver function** in `JSON.parse()` to automatically convert ISO 8601 strings back to `Date` objects:

```typescript
const dateReviver = (key: string, value: unknown): unknown => {
  if (
    typeof value === 'string' &&
    ISO_DATE_PATTERN.test(value) &&
    (key === 'initializedAt' || key === 'lastUpdatedAt' || key === 'cachedAt' || key === 'validatedAt')
  ) {
    return new Date(value);
  }
  return value;
};

// Usage
const state = JSON.parse(jsonString, dateReviver);
```

The reviver function:
1. Checks if the value is a string
2. Validates it matches the ISO 8601 date pattern
3. Checks if the key is a known date field
4. Converts to `Date` if all conditions are met

## Supported Date Fields

The reviver function handles these known date fields:

### Top-Level WizardState Fields
- `initializedAt: Date` - When the wizard was initialized
- `lastUpdatedAt: Date` - Last state modification timestamp

### Nested Date Fields (if used in future)
- `VehicleAvailabilityCache.cachedAt: Date` - When availability was cached
- `FormStepData.validatedAt: Date | null` - When step was validated
- `WizardNavigationHistory.timestamps: Record<WizardStep, Date>` - Visit timestamps

### TTL Tracking (Not Converted)
- `StoredWizardState.timestamp: number` - Unix millisecond timestamp for TTL validation
  - **Intentionally NOT converted** because it's used for TTL math
  - Stored as milliseconds since epoch for efficient comparison

## Implementation Details

### Serialization (Saving)
```typescript
// In saveWizardState()
const storedState: StoredWizardState = {
  state,                    // Contains Date objects
  timestamp: Date.now(),    // TTL tracking (milliseconds)
};
const serialized = JSON.stringify(storedState);
// Dates are automatically stringified to ISO 8601 format
```

### Deserialization (Loading)
```typescript
// In loadWizardState()
const storedState = JSON.parse(serialized, dateReviver);
// ISO 8601 strings are converted back to Date objects via dateReviver
```

### Validation
After deserialization, validation checks:
1. Structure validity (must have `state` and `timestamp` properties)
2. TTL expiration (age must be < 24 hours)

If either check fails, the state is cleared and `null` is returned.

## Date Format Pattern

The ISO 8601 pattern matches:
- Required: `YYYY-MM-DDTHH:MM:SS`
- Optional: `.sss` milliseconds
- Optional: `Z` UTC designator

Examples:
- `2024-12-28T10:30:45Z` ✓
- `2024-12-28T10:30:45.123Z` ✓
- `2024-12-28T10:30:45.123` ✓
- `2024-12-28T10:30:45` ✓
- `2024-12-28` ✗ (no time component)
- `invalid-date` ✗

## Edge Cases and Resilience

### Handling Different Date Formats
The ISO date pattern is permissive enough to handle dates with or without milliseconds and the Z suffix. All are correctly converted to `Date` objects.

### Graceful Degradation
If JSON parsing fails:
```typescript
try {
  const storedState = JSON.parse(serialized, dateReviver);
  // ...
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error('Failed to parse wizard state: Invalid JSON');
  }
  return null; // Fail silently, don't throw
}
```

### Session Storage Unavailable
```typescript
if (typeof window === 'undefined' || !window.sessionStorage) {
  return null; // SSR safe
}
```

The code safely handles:
- Server-side rendering (no window object)
- Private browsing mode (sessionStorage unavailable)
- Storage quota exceeded
- Malformed stored data

## Testing

Comprehensive tests verify:
1. Dates are properly serialized and deserialized
2. Date fields are `Date` instances after loading (not strings)
3. Dates with milliseconds are handled correctly
4. Dates without milliseconds are handled correctly
5. TTL expiration works correctly
6. Invalid/expired state is cleaned up
7. Session storage unavailability is handled gracefully
8. Malformed data doesn't crash the application

Run tests:
```bash
npm run test -- session-storage.test.ts
```

## Best Practices

### When Using WizardState
Always assume date fields are `Date` objects after loading:

```typescript
const state = loadWizardState();
if (state) {
  // CORRECT: These are Date instances
  const age = Date.now() - state.initializedAt.getTime();
  const formatted = state.lastUpdatedAt.toISOString();

  // WRONG: Don't treat them as strings
  // const wrong = state.initializedAt.split('T');
}
```

### When Storing Dates in State
Keep date fields as `Date` objects in TypeScript interfaces. Never use strings:

```typescript
// CORRECT
interface MyState {
  createdAt: Date;
}

// WRONG
interface MyState {
  createdAt: string; // Use Date instead
}
```

### When Adding New Date Fields
If you add a new date field to `WizardState`:
1. Use `Date` type in the interface
2. Add the field name to the reviver function's condition
3. Add tests to verify serialization/deserialization

Example:
```typescript
// In dateReviver function
if (
  typeof value === 'string' &&
  ISO_DATE_PATTERN.test(value) &&
  (
    key === 'initializedAt' ||
    key === 'lastUpdatedAt' ||
    key === 'myNewDateField' // <-- Add here
  )
) {
  return new Date(value);
}
```

## Related Files

- `lib/utils/session-storage.ts` - Implementation
- `lib/utils/__tests__/session-storage.test.ts` - Tests
- `components/features/bookings/wizard/BookingWizardContext.tsx` - Usage
- `types/wizard.types.ts` - WizardState interface definition
