/**
 * Session Storage Utilities for Wizard State Persistence
 *
 * Provides type-safe utilities for saving and loading wizard state
 * from browser session storage with automatic TTL management.
 *
 * IMPORTANT: Date Serialization Behavior
 * =========================================
 * JSON.stringify() converts Date objects to ISO 8601 strings.
 * When deserializing with JSON.parse(), we use a custom reviver function
 * to convert ISO 8601 strings back to Date objects for the following fields:
 *
 * Top-level fields:
 *   - WizardState.initializedAt: Date
 *   - WizardState.lastUpdatedAt: Date
 *   - StoredWizardState.timestamp: number (TTL tracking, not converted)
 *
 * Nested in VehicleAvailabilityCache (if cached):
 *   - cachedAt: Date
 *
 * Nested in FormStepData (if validated):
 *   - validatedAt: Date | null
 *
 * Nested in WizardNavigationHistory (if used):
 *   - Each value in timestamps record: Date
 *
 * The reviver function detects ISO 8601 strings and converts them to Date objects.
 * This ensures proper type safety across all persisted date fields.
 */

import type { WizardState } from '@/types/wizard.types';

/**
 * Storage key for wizard state in session storage
 */
export const WIZARD_SESSION_KEY = 'fleetpass:wizard-state';

/**
 * Time unit constants for TTL calculations
 */
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

/**
 * TTL for wizard state in hours
 */
const WIZARD_STATE_TTL_HOURS = 24;

/**
 * TTL for wizard state in milliseconds (24 hours)
 */
const WIZARD_STATE_TTL = WIZARD_STATE_TTL_HOURS * MILLISECONDS_PER_HOUR;

/**
 * Internal storage structure with timestamp for TTL tracking
 */
interface StoredWizardState {
  state: WizardState;
  timestamp: number;
}

/**
 * ISO 8601 date string pattern for detecting dates during JSON deserialization
 * Matches strings like: 2024-01-15T10:30:45.123Z
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

/**
 * Reviver function for JSON.parse() to properly deserialize Date objects
 *
 * Converts ISO 8601 strings back to Date objects for known date fields:
 * - initializedAt, lastUpdatedAt (WizardState)
 * - cachedAt (VehicleAvailabilityCache, if present in state)
 * - validatedAt (FormStepData, if present in state)
 * - timestamps (WizardNavigationHistory, if present in state)
 *
 * @param key - The JSON key being deserialized
 * @param value - The value being deserialized
 * @returns Date object if the value is a recognized date field with ISO string format, otherwise original value
 */
function dateReviver(key: string, value: unknown): unknown {
  // Check if this is a known date field with an ISO date string
  if (
    typeof value === 'string' &&
    ISO_DATE_PATTERN.test(value) &&
    (
      key === 'initializedAt' ||
      key === 'lastUpdatedAt' ||
      key === 'cachedAt' ||
      key === 'validatedAt' ||
      // timestamps is a record of dates, each value should be converted
      (key && typeof key === 'string' && !isNaN(parseInt(key, 10)))
    )
  ) {
    return new Date(value);
  }

  return value;
}

/**
 * Saves wizard state to session storage with TTL tracking
 *
 * Stores the wizard state along with a timestamp for automatic expiration.
 * If session storage is unavailable or an error occurs, logs to console
 * and returns silently without throwing.
 *
 * @param state - The wizard state object to persist
 * @returns void
 *
 * @example
 * ```typescript
 * saveWizardState({
 *   currentStep: 'document',
 *   customerId: '123',
 *   inquiryId: 'inq-456'
 * });
 * ```
 */
export function saveWizardState(state: WizardState): void {
  try {
    // Verify session storage is available
    if (typeof window === 'undefined' || !window.sessionStorage) {
      console.warn('Session storage is not available');
      return;
    }

    // Create storage payload with timestamp
    const storedState: StoredWizardState = {
      state,
      timestamp: Date.now(),
    };

    // Serialize and store
    const serialized = JSON.stringify(storedState);
    window.sessionStorage.setItem(WIZARD_SESSION_KEY, serialized);
  } catch (error) {
    // Handle JSON serialization or storage quota errors
    if (error instanceof Error) {
      console.error(`Failed to save wizard state: ${error.message}`);
    } else {
      console.error('Failed to save wizard state: Unknown error');
    }
    // Fail silently - don't throw
  }
}

/**
 * Loads wizard state from session storage with TTL validation
 *
 * Retrieves the previously saved wizard state if it exists and has not expired.
 * Automatically converts serialized Date strings back to Date objects using
 * the dateReviver function.
 *
 * Returns null if:
 * - State does not exist
 * - Session storage is unavailable
 * - State has expired (older than WIZARD_STATE_TTL_HOURS)
 * - JSON parsing fails
 *
 * @returns The stored wizard state with proper Date objects, or null if not found/invalid/expired
 *
 * @example
 * ```typescript
 * const state = loadWizardState();
 * if (state) {
 *   console.log('Resuming wizard at step:', state.currentStep);
 *   console.log('Initialized at:', state.initializedAt.toISOString()); // Date object
 * }
 * ```
 */
export function loadWizardState(): WizardState | null {
  try {
    // Verify session storage is available
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    // Retrieve stored state
    const serialized = window.sessionStorage.getItem(WIZARD_SESSION_KEY);
    if (!serialized) {
      return null;
    }

    // Parse stored state with custom reviver to deserialize dates
    const storedState = JSON.parse(serialized, dateReviver) as StoredWizardState;

    // Validate structure
    if (!storedState || typeof storedState !== 'object' || !('state' in storedState) || !('timestamp' in storedState)) {
      console.warn('Invalid wizard state structure in session storage');
      return null;
    }

    // Check if state has expired
    const now = Date.now();
    const age = now - storedState.timestamp;

    if (age > WIZARD_STATE_TTL) {
      console.debug('Wizard state expired, removing from session storage');
      clearWizardState();
      return null;
    }

    return storedState.state;
  } catch (error) {
    // Handle JSON parsing errors or other issues
    if (error instanceof SyntaxError) {
      console.error('Failed to parse wizard state: Invalid JSON');
    } else if (error instanceof Error) {
      console.error(`Failed to load wizard state: ${error.message}`);
    } else {
      console.error('Failed to load wizard state: Unknown error');
    }
    // Fail silently - don't throw
    return null;
  }
}

/**
 * Removes wizard state from session storage
 *
 * Clears the persisted wizard state. Safe to call even if
 * state does not exist or session storage is unavailable.
 *
 * @returns void
 *
 * @example
 * ```typescript
 * // Clear saved state when wizard completes
 * clearWizardState();
 * ```
 */
export function clearWizardState(): void {
  try {
    // Verify session storage is available
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    window.sessionStorage.removeItem(WIZARD_SESSION_KEY);
  } catch (error) {
    // Handle any removal errors silently
    if (error instanceof Error) {
      console.error(`Failed to clear wizard state: ${error.message}`);
    } else {
      console.error('Failed to clear wizard state: Unknown error');
    }
    // Fail silently - don't throw
  }
}
