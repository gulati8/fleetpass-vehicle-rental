import type {
  Booking,
  BookingWithRelations,
  Customer,
  Vehicle,
  VehicleWithLocation,
  Location,
} from '@shared/types';
import type { BookingFormData } from '@/lib/validations/booking.validation';
import type { PaymentFormData } from '@/lib/validations/payment.validation';

// Re-export PaymentFormData so it can be used by other modules
export type { PaymentFormData };

/**
 * Wizard step union type representing the 4 steps in the booking wizard
 * Step 1: Vehicle & Location Selection
 * Step 2: Customer & Dates Selection
 * Step 3: Payment Details
 * Step 4: Summary & Confirmation
 */
export type WizardStep = 1 | 2 | 3 | 4;

/**
 * Booking form data for Step 1 and Step 2
 * Represents the core booking information collected from the user
 */
export interface BookingWizardData extends BookingFormData {
  /** Optional notes added during the booking process */
  notes?: string;
}

/**
 * Result of the successful booking creation
 * Contains the new booking ID and related payment information
 */
export interface BookingResult {
  /** The created booking ID */
  bookingId: string;

  /** The generated booking number (e.g., BK-20240101-0001) */
  bookingNumber: string;

  /** Stripe payment intent ID for tracking */
  paymentIntentId: string | null;

  /** Full booking with relations (optional, for display purposes) */
  booking?: BookingWithRelations;
}

/**
 * Error information for a specific step or field
 */
export interface WizardError {
  /** Field name or step identifier where error occurred */
  field?: string;

  /** Human-readable error message */
  message: string;

  /** Machine-readable error code */
  code?: string;
}

/**
 * Complete wizard state management
 * Tracks current step, collected data, results, errors, and loading states
 */
export interface WizardState {
  /** Current active step (1-4) */
  currentStep: WizardStep;

  /** Step 1: Vehicle and location selection data */
  vehicleData: {
    vehicleId: string | null;
    pickupLocationId: string | null;
    dropoffLocationId: string | null;
  };

  /** Step 2: Customer and booking dates data */
  bookingData: BookingWizardData | null;

  /** Step 3: Payment method data */
  paymentData: PaymentFormData | null;

  /** Result data from successful booking creation */
  result: BookingResult | null;

  /** Map of step number to error information */
  errors: Record<WizardStep, WizardError | null>;

  /** Global error that spans multiple steps */
  globalError: WizardError | null;

  /** Loading state indicators for each step */
  loading: {
    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
  };

  /** Overall wizard completion status */
  isCompleted: boolean;

  /** Flag indicating if wizard can be accessed (e.g., has required permissions) */
  isAccessible: boolean;

  /** Timestamp of wizard initialization */
  initializedAt: Date;

  /** Timestamp of last state update */
  lastUpdatedAt: Date;
}

/**
 * Cached vehicle availability and pricing information for performance
 */
export interface VehicleAvailabilityCache {
  /** Vehicle ID being checked */
  vehicleId: string;

  /** Pickup date for availability check */
  pickupDate: string;

  /** Dropoff date for availability check */
  dropoffDate: string;

  /** Daily rate in cents */
  dailyRateCents: number;

  /** Number of days for the booking */
  numDays: number;

  /** Subtotal in cents (daily rate × number of days) */
  subtotalCents: number;

  /** Tax amount in cents */
  taxCents: number;

  /** Total amount in cents (subtotal + tax) */
  totalCents: number;

  /** When this cache entry was created */
  cachedAt: Date;
}

/**
 * Form step data for internal validation and error handling
 */
export interface FormStepData {
  /** Step number */
  step: WizardStep;

  /** Whether the step data is valid */
  isValid: boolean;

  /** List of validation errors for this step */
  errors: WizardError[];

  /** Timestamp when step was last validated */
  validatedAt: Date | null;
}

/**
 * Wizard context value provided to components
 * Contains the complete wizard state and navigation/action methods
 */
export interface WizardContextValue {
  /** Current wizard state */
  state: WizardState;

  /** Move to the next step (validation required) */
  next: () => Promise<void>;

  /** Move to the previous step (always allowed) */
  back: () => void;

  /** Jump to a specific step (if accessible) */
  goToStep: (step: WizardStep) => void;

  /** Reset wizard to initial state */
  reset: () => void;

  /** Update vehicle selection data (Step 1) */
  updateVehicleData: (data: Partial<WizardState['vehicleData']>) => void;

  /** Update booking data (Step 2) */
  updateBookingData: (data: Partial<BookingWizardData>) => void;

  /** Update payment data (Step 3) */
  updatePaymentData: (data: Partial<PaymentFormData>) => void;

  /** Set error for a specific step */
  setStepError: (step: WizardStep, error: WizardError | null) => void;

  /** Set global error spanning multiple steps */
  setGlobalError: (error: WizardError | null) => void;

  /** Clear all errors */
  clearErrors: () => void;

  /** Set loading state for a step */
  setStepLoading: (step: WizardStep, isLoading: boolean) => void;

  /** Submit booking (Step 4) */
  submitBooking: () => Promise<BookingResult>;

  /** Check if a step is complete and valid */
  isStepComplete: (step: WizardStep) => boolean;

  /** Get vehicle availability and pricing information */
  getVehicleAvailability: (vehicleId: string, pickupDate: string, dropoffDate: string) => Promise<VehicleAvailabilityCache | null>;

  /** Validate entire wizard before submission */
  validateAll: () => Promise<boolean>;

  /** Get combined booking data with customer and vehicle info */
  getBookingSummary: () => BookingSummary | null;
}

/**
 * Summary of the complete booking for display/confirmation
 * Combines all wizard steps' data into a single readable view
 */
export interface BookingSummary {
  /** Vehicle information */
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    imageUrls: string[];
  };

  /** Customer information */
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };

  /** Pickup location */
  pickupLocation: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  };

  /** Dropoff location */
  dropoffLocation: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
  };

  /** Pickup date and time */
  pickupDatetime: string;

  /** Dropoff date and time */
  dropoffDatetime: string;

  /** Number of days for the booking */
  numDays: number;

  /** Daily rental rate in cents */
  dailyRateCents: number;

  /** Subtotal in cents */
  subtotalCents: number;

  /** Tax amount in cents */
  taxCents: number;

  /** Total amount in cents */
  totalCents: number;

  /** Optional notes */
  notes?: string;

  /** Payment method details */
  paymentMethod?: {
    brand: string;
    last4: string;
    cardholderName: string;
  };
}

/**
 * Navigation history for tracking wizard flow
 * Useful for debugging and analytics
 */
export interface WizardNavigationHistory {
  /** Steps visited in order */
  visitedSteps: WizardStep[];

  /** Timestamp of each step visit */
  timestamps: Record<WizardStep, Date>;

  /** Number of times back button was clicked */
  backClicks: number;

  /** Abandoned steps (started but not completed) */
  abandonedSteps: WizardStep[];

  /** Total time spent in wizard */
  totalTimeMs: number;
}
