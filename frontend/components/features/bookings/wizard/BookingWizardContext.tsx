'use client';

/**
 * Booking Wizard Context Provider
 *
 * Manages the complete state and navigation flow for the 4-step booking wizard.
 * Features:
 * - Session storage persistence with 24-hour TTL
 * - Step validation and error management
 * - Navigation with forward/backward support
 * - Automatic state persistence on changes
 * - Unsaved changes warning
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  WizardContextValue,
  WizardState,
  WizardStep,
  BookingWizardData,
  PaymentFormData,
  BookingResult,
  WizardError,
  BookingSummary,
  VehicleAvailabilityCache,
} from '@/types/wizard.types';
import {
  saveWizardState,
  loadWizardState,
  clearWizardState,
} from '@/lib/utils/session-storage';

/**
 * Initial wizard state - clean slate
 */
const INITIAL_STATE: WizardState = {
  currentStep: 1,
  vehicleData: {
    vehicleId: null,
    pickupLocationId: null,
    dropoffLocationId: null,
  },
  bookingData: null,
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
  initializedAt: new Date(),
  lastUpdatedAt: new Date(),
};

/**
 * Create the context with undefined default (requires provider)
 */
const WizardContext = createContext<WizardContextValue | undefined>(undefined);

/**
 * Props for the WizardProvider component
 */
interface WizardProviderProps {
  children: React.ReactNode;
  /** Optional initial state override (useful for testing) */
  initialState?: Partial<WizardState>;
  /** Whether to enable session persistence (default: true) */
  enablePersistence?: boolean;
}

/**
 * Wizard Provider Component
 *
 * Wraps the booking wizard and provides state management, navigation,
 * and persistence capabilities to all child components.
 */
export function WizardProvider({
  children,
  initialState,
  enablePersistence = true,
}: WizardProviderProps) {
  // Main state management
  const [state, setState] = useState<WizardState>(() => {
    // Try to load from session storage on mount
    if (enablePersistence) {
      const savedState = loadWizardState();
      if (savedState) {
        // Merge saved state with initial state
        // Note: loadWizardState() automatically deserializes Date objects via the dateReviver function,
        // so initializedAt and lastUpdatedAt are already Date instances (not strings)
        return {
          ...INITIAL_STATE,
          ...savedState,
          ...initialState,
        };
      }
    }

    // Return initial state if no saved state
    return {
      ...INITIAL_STATE,
      ...initialState,
    };
  });

  // Track if state has changed to show unsaved changes warning
  const hasUnsavedChanges = useRef(false);

  /**
   * Save state to session storage whenever it changes
   */
  useEffect(() => {
    if (enablePersistence && !state.isCompleted) {
      saveWizardState(state);
      hasUnsavedChanges.current = true;
    }
  }, [state, enablePersistence]);

  /**
   * Add beforeunload listener to warn about unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if wizard is in progress (not on step 1 and not completed)
      if (hasUnsavedChanges.current && state.currentStep > 1 && !state.isCompleted) {
        e.preventDefault();
        e.returnValue = ''; // Required for Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.currentStep, state.isCompleted]);

  /**
   * Helper to update state with timestamp
   */
  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
      lastUpdatedAt: new Date(),
    }));
  }, []);

  /**
   * Validate that a step number is within valid range
   */
  const isValidStep = useCallback((step: number): step is WizardStep => {
    return step >= 1 && step <= 4;
  }, []);

  /**
   * Check if a specific step is complete and valid
   */
  const isStepComplete = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 1:
        // Step 1: Vehicle and location selection
        return !!(
          state.vehicleData.vehicleId &&
          state.vehicleData.pickupLocationId &&
          state.vehicleData.dropoffLocationId
        );

      case 2:
        // Step 2: Customer and booking dates
        return !!(
          state.bookingData &&
          state.bookingData.customerId &&
          state.bookingData.vehicleId &&
          state.bookingData.pickupDatetime &&
          state.bookingData.dropoffDatetime
        );

      case 3:
        // Step 3: Payment complete when booking and payment are created
        // Payment form is validated by Zod before submission
        // Completion is determined by successful backend response (booking result)
        const isComplete = !!(state.result && state.result.bookingId && state.result.paymentIntentId);
        console.log('🔍 Step 3 validation check:', {
          hasResult: !!state.result,
          bookingId: state.result?.bookingId,
          paymentIntentId: state.result?.paymentIntentId,
          isComplete,
        });
        return isComplete;

      case 4:
        // Step 4: Confirmation (always accessible after step 3)
        return isStepComplete(3);

      default:
        return false;
    }
  }, [state.vehicleData, state.bookingData, state.paymentData]);

  /**
   * Move to the next step (with validation)
   */
  const next = useCallback(async () => {
    const currentStep = state.currentStep;
    console.log(`🚀 next() called from Step ${currentStep}`);

    // Validate current step is complete
    const stepComplete = isStepComplete(currentStep);
    console.log(`✔️  isStepComplete(${currentStep}):`, stepComplete);

    if (!stepComplete) {
      console.error(`❌ Step ${currentStep} validation failed - step is not complete`);
      const error: WizardError = {
        message: `Please complete all required fields in Step ${currentStep} before continuing`,
        code: 'STEP_INCOMPLETE',
      };
      updateState({
        errors: {
          ...state.errors,
          [currentStep]: error,
        },
      });
      return;
    }

    // Move to next step if not on last step
    const nextStep = currentStep + 1;
    console.log(`➡️  Moving to Step ${nextStep}`);

    if (isValidStep(nextStep)) {
      updateState({
        currentStep: nextStep,
        errors: {
          ...state.errors,
          [currentStep]: null, // Clear current step error
        },
      });
      console.log(`✅ Navigation to Step ${nextStep} completed`);
    } else {
      console.error(`❌ Invalid step: ${nextStep}`);
    }
  }, [state, isStepComplete, isValidStep, updateState]);

  /**
   * Move to the previous step (always allowed)
   */
  const back = useCallback(() => {
    const currentStep = state.currentStep;
    const prevStep = currentStep - 1;

    if (isValidStep(prevStep)) {
      updateState({
        currentStep: prevStep,
      });
    }
  }, [state.currentStep, isValidStep, updateState]);

  /**
   * Jump to a specific step (if accessible)
   */
  const goToStep = useCallback((step: WizardStep) => {
    // Validate step number
    if (!isValidStep(step)) {
      console.warn(`Invalid step: ${step}. Must be between 1 and 4.`);
      return;
    }

    // Can always go backwards
    if (step < state.currentStep) {
      updateState({ currentStep: step });
      return;
    }

    // Going forward requires all previous steps to be complete
    for (let i = 1; i < step; i++) {
      if (!isStepComplete(i as WizardStep)) {
        const error: WizardError = {
          message: `Please complete Step ${i} before jumping to Step ${step}`,
          code: 'PREREQUISITE_INCOMPLETE',
        };
        updateState({
          globalError: error,
        });
        return;
      }
    }

    // All prerequisites met, jump to step
    updateState({
      currentStep: step,
      globalError: null,
    });
  }, [state.currentStep, isValidStep, isStepComplete, updateState]);

  /**
   * Reset wizard to initial state
   */
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    clearWizardState();
    hasUnsavedChanges.current = false;
  }, []);

  /**
   * Update vehicle selection data (Step 1)
   */
  const updateVehicleData = useCallback((data: Partial<WizardState['vehicleData']>) => {
    updateState({
      vehicleData: {
        ...state.vehicleData,
        ...data,
      },
    });
  }, [state.vehicleData, updateState]);

  /**
   * Update booking data (Step 2)
   */
  const updateBookingData = useCallback((data: Partial<BookingWizardData>) => {
    updateState({
      bookingData: state.bookingData
        ? { ...state.bookingData, ...data }
        : (data as BookingWizardData),
    });
  }, [state.bookingData, updateState]);

  /**
   * Update payment data (Step 3)
   */
  const updatePaymentData = useCallback((data: Partial<PaymentFormData>) => {
    console.log('💳 updatePaymentData called with:', data);
    setState((prev) => {
      const newPaymentData = prev.paymentData
        ? { ...prev.paymentData, ...data }
        : (data as PaymentFormData);
      console.log('💾 Saving payment data to context:', newPaymentData);
      return {
        ...prev,
        paymentData: newPaymentData,
        lastUpdatedAt: new Date(),
      };
    });
  }, []);

  /**
   * Set booking result after successful payment
   * Updates the wizard state with booking and payment confirmation details
   */
  const setBookingResult = useCallback((result: BookingResult) => {
    updateState({
      result,
      isCompleted: true,
    });
  }, [updateState]);

  /**
   * Complete Step 3 and navigate to Step 4
   * Atomically updates booking result and navigates to confirmation step
   */
  const completeStep3 = useCallback((result: BookingResult) => {
    console.log('🎯 completeStep3 called with:', result);
    updateState({
      result,
      isCompleted: true,
      currentStep: 4,
      errors: {
        ...state.errors,
        3: null, // Clear step 3 errors
      },
    });
    console.log('✅ completeStep3: State updated, should now be on Step 4');
  }, [state.errors, updateState]);

  /**
   * Complete Step 1 and navigate to Step 2
   * Atomically updates booking data, vehicle data, and navigates to next step
   */
  const completeStep1 = useCallback((data: BookingWizardData) => {
    updateState({
      bookingData: data,
      vehicleData: {
        vehicleId: data.vehicleId,
        pickupLocationId: data.pickupLocationId,
        dropoffLocationId: data.dropoffLocationId,
      },
      currentStep: 2,
      errors: {
        ...state.errors,
        1: null, // Clear step 1 errors
      },
    });
  }, [state.errors, updateState]);

  /**
   * Set error for a specific step
   */
  const setStepError = useCallback((step: WizardStep, error: WizardError | null) => {
    updateState({
      errors: {
        ...state.errors,
        [step]: error,
      },
    });
  }, [state.errors, updateState]);

  /**
   * Set global error spanning multiple steps
   */
  const setGlobalError = useCallback((error: WizardError | null) => {
    updateState({
      globalError: error,
    });
  }, [updateState]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    updateState({
      errors: {
        1: null,
        2: null,
        3: null,
        4: null,
      },
      globalError: null,
    });
  }, [updateState]);

  /**
   * Set loading state for a specific step
   */
  const setStepLoading = useCallback((step: WizardStep, isLoading: boolean) => {
    const loadingKey = `step${step}` as keyof WizardState['loading'];
    updateState({
      loading: {
        ...state.loading,
        [loadingKey]: isLoading,
      },
    });
  }, [state.loading, updateState]);

  /**
   * Submit booking (Step 4)
   * This should be implemented by the consumer using the wizard context
   * and should call the booking API endpoint.
   */
  const submitBooking = useCallback(async (): Promise<BookingResult> => {
    // This is a placeholder - actual implementation should be done
    // by the component using the context via API hooks
    throw new Error('submitBooking must be implemented by the consumer');
  }, []);

  /**
   * Get vehicle availability and pricing information
   * This should be implemented by the consumer using the wizard context
   * and should call the vehicle availability API endpoint.
   */
  const getVehicleAvailability = useCallback(
    async (
      vehicleId: string,
      pickupDate: string,
      dropoffDate: string
    ): Promise<VehicleAvailabilityCache | null> => {
      // This is a placeholder - actual implementation should be done
      // by the component using the context via API hooks
      throw new Error('getVehicleAvailability must be implemented by the consumer');
    },
    []
  );

  /**
   * Validate entire wizard before submission
   */
  const validateAll = useCallback(async (): Promise<boolean> => {
    // Check all steps are complete
    const allStepsComplete = [1, 2, 3].every((step) =>
      isStepComplete(step as WizardStep)
    );

    if (!allStepsComplete) {
      setGlobalError({
        message: 'Please complete all steps before submitting',
        code: 'WIZARD_INCOMPLETE',
      });
      return false;
    }

    // Clear any existing errors
    clearErrors();
    return true;
  }, [isStepComplete, setGlobalError, clearErrors]);

  /**
   * Get combined booking data with customer and vehicle info
   * This is a simplified version - full implementation would fetch
   * related data from API
   */
  const getBookingSummary = useCallback((): BookingSummary | null => {
    // Check if we have minimum required data
    if (!state.bookingData || !state.paymentData) {
      return null;
    }

    // This is a placeholder - actual implementation should fetch
    // full vehicle, customer, and location details from API
    // For now, return null as this requires API calls
    return null;
  }, [state.bookingData, state.paymentData]);

  /**
   * Memoized context value
   */
  const contextValue: WizardContextValue = {
    state,
    next,
    back,
    goToStep,
    reset,
    updateVehicleData,
    updateBookingData,
    updatePaymentData,
    completeStep1,
    completeStep3,
    setBookingResult,
    setStepError,
    setGlobalError,
    clearErrors,
    setStepLoading,
    submitBooking,
    isStepComplete,
    getVehicleAvailability,
    validateAll,
    getBookingSummary,
  };

  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  );
}

/**
 * Custom hook to access wizard context
 *
 * @throws Error if used outside WizardProvider
 * @returns WizardContextValue
 *
 * @example
 * ```tsx
 * function BookingStep() {
 *   const { state, next, back } = useWizard();
 *
 *   return (
 *     <div>
 *       <p>Current Step: {state.currentStep}</p>
 *       <button onClick={back}>Back</button>
 *       <button onClick={next}>Next</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);

  if (context === undefined) {
    throw new Error(
      'useWizard must be used within a WizardProvider. ' +
      'Make sure your component is wrapped with <WizardProvider>.'
    );
  }

  return context;
}

/**
 * Export the context for testing purposes
 */
export { WizardContext };
