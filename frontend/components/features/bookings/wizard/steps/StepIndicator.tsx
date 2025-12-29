'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepIndicatorProps {
  currentStep: number;
  completedSteps: number[];
}

/**
 * Validates that the currentStep is within valid bounds
 * @param step - The current step number
 * @param maxSteps - The maximum number of steps
 * @returns true if step is valid, false otherwise
 */
function isValidStep(step: number, maxSteps: number): boolean {
  return step >= 1 && step <= maxSteps && Number.isInteger(step);
}

interface Step {
  number: number;
  label: string;
}

const steps: Step[] = [
  { number: 1, label: 'Booking Details' },
  { number: 2, label: 'Review' },
  { number: 3, label: 'Payment' },
  { number: 4, label: 'Confirmation' },
];

export function StepIndicator({
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  // Validate props in development
  if (process.env.NODE_ENV === 'development' && !isValidStep(currentStep, steps.length)) {
    console.warn(
      `[StepIndicator] Invalid currentStep prop: ${currentStep}. Expected a number between 1 and ${steps.length}.`
    );
  }

  return (
    <>
      {/* Desktop stepper - horizontal with labels */}
      <div className="hidden sm:block">
        <ol className="flex items-center gap-4">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            const isNext = step.number > currentStep;

            return (
              <li key={step.number} className="flex items-center gap-4 flex-1">
                {/* Step circle */}
                <div
                  className={cn(
                    'relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-200',
                    isCompleted
                      ? 'bg-success-600 text-white'
                      : isCurrent
                        ? 'bg-primary-600 text-white ring-4 ring-primary-200'
                        : 'bg-neutral-200 text-neutral-600'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                  role="img"
                  aria-label={`Step ${step.number}: ${step.label}${isCompleted ? ' - Completed' : isCurrent ? ' - Current' : ''}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent
                        ? 'text-primary-600'
                        : isCompleted
                          ? 'text-success-600'
                          : 'text-neutral-600'
                    )}
                  >
                    {step.label}
                  </p>
                </div>

                {/* Connector line - only render between steps */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 transition-colors',
                      completedSteps.includes(step.number)
                        ? 'bg-success-600'
                        : 'bg-neutral-200'
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile progress bar - compact version */}
      <div className="sm:hidden">
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
              role="progressbar"
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={steps.length}
            />
          </div>

          {/* Step text */}
          <p className="text-center text-sm font-medium text-neutral-600">
            Step {currentStep} of {steps.length}
          </p>

          {/* Current step label */}
          <p className="text-center text-sm text-neutral-900 font-semibold">
            {isValidStep(currentStep, steps.length)
              ? steps[currentStep - 1]?.label || 'Unknown Step'
              : 'Invalid Step'}
          </p>
        </div>
      </div>
    </>
  );
}
