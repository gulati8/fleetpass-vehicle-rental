/**
 * Tests for session storage utilities
 * Validates date serialization/deserialization behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveWizardState,
  loadWizardState,
  clearWizardState,
  WIZARD_SESSION_KEY,
} from '../session-storage';
import type { WizardState } from '@/types/wizard.types';

describe('Session Storage Utilities', () => {
  beforeEach(() => {
    // Mock sessionStorage
    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value.toString();
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    // Only clear if sessionStorage is available
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
  });

  describe('saveWizardState and loadWizardState', () => {
    it('should serialize and deserialize wizard state with proper Date objects', () => {
      const now = new Date();
      const initialState: WizardState = {
        currentStep: 2,
        vehicleData: {
          vehicleId: 'vehicle-123',
          pickupLocationId: 'loc-1',
          dropoffLocationId: 'loc-2',
        },
        bookingData: {
          customerId: 'cust-1',
          vehicleId: 'vehicle-123',
          pickupLocationId: 'loc-1',
          dropoffLocationId: 'loc-2',
          pickupDatetime: '2024-12-28T10:00:00Z',
          dropoffDatetime: '2024-12-30T10:00:00Z',
          notes: 'Test booking',
        },
        paymentData: null,
        result: null,
        errors: {
          1: null,
          2: null,
          3: null,
          4: null,
        },
        globalError: null,
        loading: {
          step1: false,
          step2: false,
          step3: false,
          step4: false,
        },
        isCompleted: false,
        isAccessible: true,
        initializedAt: now,
        lastUpdatedAt: now,
      };

      // Save state
      saveWizardState(initialState);

      // Load state
      const loadedState = loadWizardState();

      // Verify state was loaded
      expect(loadedState).not.toBeNull();
      expect(loadedState).toBeDefined();

      if (loadedState) {
        // Verify basic fields
        expect(loadedState.currentStep).toBe(2);
        expect(loadedState.vehicleData.vehicleId).toBe('vehicle-123');

        // CRITICAL: Verify dates are Date objects, not strings
        expect(loadedState.initializedAt).toBeInstanceOf(Date);
        expect(loadedState.lastUpdatedAt).toBeInstanceOf(Date);

        // Verify dates have correct values
        expect(loadedState.initializedAt.getTime()).toBe(now.getTime());
        expect(loadedState.lastUpdatedAt.getTime()).toBe(now.getTime());

        // Verify we can call Date methods
        expect(typeof loadedState.initializedAt.toISOString()).toBe('string');
        expect(typeof loadedState.lastUpdatedAt.toISOString()).toBe('string');
      }
    });

    it('should handle ISO 8601 date strings with milliseconds', () => {
      const dateWithMs = new Date('2024-12-28T15:30:45.123Z');
      const state: WizardState = {
        currentStep: 1,
        vehicleData: {
          vehicleId: null,
          pickupLocationId: null,
          dropoffLocationId: null,
        },
        bookingData: null,
        paymentData: null,
        result: null,
        errors: { 1: null, 2: null, 3: null, 4: null },
        globalError: null,
        loading: { step1: false, step2: false, step3: false, step4: false },
        isCompleted: false,
        isAccessible: true,
        initializedAt: dateWithMs,
        lastUpdatedAt: dateWithMs,
      };

      saveWizardState(state);
      const loadedState = loadWizardState();

      expect(loadedState?.initializedAt).toBeInstanceOf(Date);
      expect(loadedState?.lastUpdatedAt).toBeInstanceOf(Date);
    });

    it('should handle ISO 8601 date strings without milliseconds', () => {
      const dateWithoutMs = new Date('2024-12-28T15:30:45Z');
      const state: WizardState = {
        currentStep: 1,
        vehicleData: {
          vehicleId: null,
          pickupLocationId: null,
          dropoffLocationId: null,
        },
        bookingData: null,
        paymentData: null,
        result: null,
        errors: { 1: null, 2: null, 3: null, 4: null },
        globalError: null,
        loading: { step1: false, step2: false, step3: false, step4: false },
        isCompleted: false,
        isAccessible: true,
        initializedAt: dateWithoutMs,
        lastUpdatedAt: dateWithoutMs,
      };

      saveWizardState(state);
      const loadedState = loadWizardState();

      expect(loadedState?.initializedAt).toBeInstanceOf(Date);
      expect(loadedState?.lastUpdatedAt).toBeInstanceOf(Date);
    });

    it('should return null if session storage is unavailable', () => {
      // Temporarily make sessionStorage unavailable
      const original = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      const result = loadWizardState();
      expect(result).toBeNull();

      // Restore sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: original,
        writable: true,
      });
    });

    it('should return null if no state is stored', () => {
      const result = loadWizardState();
      expect(result).toBeNull();
    });

    it('should handle expired state (older than 24 hours)', () => {
      const now = new Date();
      const state: WizardState = {
        currentStep: 1,
        vehicleData: {
          vehicleId: null,
          pickupLocationId: null,
          dropoffLocationId: null,
        },
        bookingData: null,
        paymentData: null,
        result: null,
        errors: { 1: null, 2: null, 3: null, 4: null },
        globalError: null,
        loading: { step1: false, step2: false, step3: false, step4: false },
        isCompleted: false,
        isAccessible: true,
        initializedAt: now,
        lastUpdatedAt: now,
      };

      saveWizardState(state);

      // Manually set an expired timestamp in session storage
      const stored = window.sessionStorage.getItem(WIZARD_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Set timestamp to 25 hours ago
        parsed.timestamp = Date.now() - 25 * 60 * 60 * 1000;
        window.sessionStorage.setItem(WIZARD_SESSION_KEY, JSON.stringify(parsed));
      }

      const result = loadWizardState();
      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      window.sessionStorage.setItem(WIZARD_SESSION_KEY, 'invalid json {');

      const result = loadWizardState();
      expect(result).toBeNull();
    });

    it('should handle malformed state structure gracefully', () => {
      window.sessionStorage.setItem(WIZARD_SESSION_KEY, JSON.stringify({ invalid: true }));

      const result = loadWizardState();
      expect(result).toBeNull();
    });
  });

  describe('clearWizardState', () => {
    it('should remove wizard state from session storage', () => {
      const state: WizardState = {
        currentStep: 1,
        vehicleData: {
          vehicleId: null,
          pickupLocationId: null,
          dropoffLocationId: null,
        },
        bookingData: null,
        paymentData: null,
        result: null,
        errors: { 1: null, 2: null, 3: null, 4: null },
        globalError: null,
        loading: { step1: false, step2: false, step3: false, step4: false },
        isCompleted: false,
        isAccessible: true,
        initializedAt: new Date(),
        lastUpdatedAt: new Date(),
      };

      saveWizardState(state);
      expect(loadWizardState()).not.toBeNull();

      clearWizardState();
      expect(loadWizardState()).toBeNull();
    });

    it('should not throw if session storage is unavailable', () => {
      // Temporarily make sessionStorage unavailable
      const original = window.sessionStorage;
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      expect(() => clearWizardState()).not.toThrow();

      // Restore sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: original,
        writable: true,
      });
    });
  });
});
