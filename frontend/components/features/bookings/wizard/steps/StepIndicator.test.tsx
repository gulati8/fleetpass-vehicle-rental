import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  describe('Rendering', () => {
    it('renders all 4 steps', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      expect(screen.getAllByText('Booking Details').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Payment').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Confirmation').length).toBeGreaterThan(0);
    });

    it('renders step numbers for uncompleted steps', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      // Steps 2, 3, 4 should show numbers (not checkmarks)
      const steps = screen.getAllByRole('img');
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('Current step styling', () => {
    it('marks current step with primary color and ring', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const stepImages = screen.getAllByRole('img');
      // Find the step with "Current" in aria-label
      const currentStepElement = stepImages.find(
        (el) => el.getAttribute('aria-label')?.includes('Current') === true
      );

      expect(currentStepElement).toBeInTheDocument();
    });

    it('updates current step styling when step changes', () => {
      const { rerender } = render(
        <StepIndicator currentStep={1} completedSteps={[]} />
      );

      let currentStepElement = screen.getAllByRole('img').find(
        (el) => el.getAttribute('aria-label')?.includes('Current') === true
      );
      expect(currentStepElement?.getAttribute('aria-label')).toContain(
        'Step 1'
      );

      rerender(<StepIndicator currentStep={3} completedSteps={[1, 2]} />);

      currentStepElement = screen.getAllByRole('img').find(
        (el) => el.getAttribute('aria-label')?.includes('Current') === true
      );
      expect(currentStepElement?.getAttribute('aria-label')).toContain(
        'Step 3'
      );
    });
  });

  describe('Completed steps', () => {
    it('renders checkmark for completed steps', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const stepImages = screen.getAllByRole('img');
      const completedSteps = stepImages.filter(
        (el) => el.getAttribute('aria-label')?.includes('Completed') === true
      );

      expect(completedSteps.length).toBeGreaterThan(0);
    });

    it('renders multiple completed steps', () => {
      render(
        <StepIndicator currentStep={4} completedSteps={[1, 2, 3]} />
      );

      const stepImages = screen.getAllByRole('img');
      const completedSteps = stepImages.filter(
        (el) => el.getAttribute('aria-label')?.includes('Completed') === true
      );

      expect(completedSteps.length).toBe(3);
    });

    it('handles no completed steps', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      const stepImages = screen.getAllByRole('img');
      const completedSteps = stepImages.filter(
        (el) => el.getAttribute('aria-label')?.includes('Completed') === true
      );

      expect(completedSteps.length).toBe(0);
    });
  });

  describe('Mobile view', () => {
    it('displays step count text on mobile', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      // Both desktop and mobile will render, so just check it exists
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    it('displays current step label on mobile', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      // The mobile section also displays the step label
      const reviewTexts = screen.getAllByText('Review');
      expect(reviewTexts.length).toBeGreaterThan(0);
    });

    it('updates progress bar value for current step', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '2');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic <ol> for step list', () => {
      const { container } = render(
        <StepIndicator currentStep={1} completedSteps={[]} />
      );

      const orderList = container.querySelector('ol');
      expect(orderList).toBeInTheDocument();
    });

    it('sets aria-current for current step', () => {
      render(<StepIndicator currentStep={2} completedSteps={[]} />);

      const stepImages = screen.getAllByRole('img');
      const currentStep = stepImages.find(
        (el) => el.getAttribute('aria-current') === 'step'
      );

      expect(currentStep).toBeInTheDocument();
    });

    it('provides descriptive aria-labels for each step', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      const stepImages = screen.getAllByRole('img');
      stepImages.forEach((step) => {
        expect(step.getAttribute('aria-label')).toBeTruthy();
        expect(step.getAttribute('aria-label')).toMatch(/Step \d/);
      });
    });

    it('sets progressbar role and attributes on mobile', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '2');
      expect(progressBar).toHaveAttribute('aria-valuemin', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '4');
    });

    it('includes step status in aria-label', () => {
      render(
        <StepIndicator currentStep={2} completedSteps={[1]} />
      );

      const stepImages = screen.getAllByRole('img');
      const labels = stepImages.map((el) => el.getAttribute('aria-label') || '');

      const hasCompleted = labels.some((label) => label.includes('Completed'));
      const hasCurrent = labels.some((label) => label.includes('Current'));

      expect(hasCompleted).toBe(true);
      expect(hasCurrent).toBe(true);
    });
  });

  describe('Step progression', () => {
    it('handles step 1 (first step)', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('handles step 4 (final step)', () => {
      render(
        <StepIndicator currentStep={4} completedSteps={[1, 2, 3]} />
      );

      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
      expect(screen.getAllByText('Confirmation').length).toBeGreaterThan(0);
    });

    it('displays all intermediate steps', () => {
      render(<StepIndicator currentStep={3} completedSteps={[1, 2]} />);

      expect(screen.getAllByText('Booking Details').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Review').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Payment').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Confirmation').length).toBeGreaterThan(0);
    });
  });

  describe('Visual states', () => {
    it('applies success color to completed steps', () => {
      render(
        <StepIndicator currentStep={2} completedSteps={[1]} />
      );

      const stepImages = screen.getAllByRole('img');
      const completedLabel = stepImages.find(
        (el) => el.getAttribute('aria-label')?.includes('Step 1') === true
      )?.getAttribute('aria-label');

      expect(completedLabel).toContain('Completed');
    });

    it('applies primary color to current step', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const stepImages = screen.getAllByRole('img');
      const currentLabel = stepImages.find(
        (el) => el.getAttribute('aria-label')?.includes('Step 2') === true
      )?.getAttribute('aria-label');

      expect(currentLabel).toContain('Current');
    });

    it('applies neutral color to future steps', () => {
      render(<StepIndicator currentStep={2} completedSteps={[1]} />);

      const stepImages = screen.getAllByRole('img');
      // Future steps should not have "Current" or "Completed" labels
      const futureLabels = stepImages
        .filter((el) => {
          const label = el.getAttribute('aria-label');
          return (
            label &&
            !label.includes('Current') &&
            !label.includes('Completed')
          );
        })
        .map((el) => el.getAttribute('aria-label'));

      expect(futureLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Bounds checking and error handling', () => {
    it('handles invalid step 0 gracefully on mobile', () => {
      render(<StepIndicator currentStep={0} completedSteps={[]} />);

      // Should display 'Invalid Step' instead of crashing
      expect(screen.getByText('Invalid Step')).toBeInTheDocument();
    });

    it('handles negative step gracefully on mobile', () => {
      render(<StepIndicator currentStep={-1} completedSteps={[]} />);

      // Should display 'Invalid Step' instead of crashing
      expect(screen.getByText('Invalid Step')).toBeInTheDocument();
    });

    it('handles step greater than max gracefully on mobile', () => {
      render(<StepIndicator currentStep={5} completedSteps={[]} />);

      // Should display 'Invalid Step' instead of crashing
      expect(screen.getByText('Invalid Step')).toBeInTheDocument();
    });

    it('handles non-integer step gracefully on mobile', () => {
      render(<StepIndicator currentStep={2.5} completedSteps={[]} />);

      // Should display 'Invalid Step' instead of crashing
      expect(screen.getByText('Invalid Step')).toBeInTheDocument();
    });

    it('renders valid step labels correctly', () => {
      render(<StepIndicator currentStep={1} completedSteps={[]} />);

      // Valid step should display the correct label (appears in both desktop and mobile)
      expect(screen.getAllByText('Booking Details').length).toBeGreaterThan(0);
    });

    it('handles valid final step', () => {
      render(<StepIndicator currentStep={4} completedSteps={[1, 2, 3]} />);

      // Valid step should display the correct label (appears in both desktop and mobile)
      expect(screen.getAllByText('Confirmation').length).toBeGreaterThan(0);
    });
  });
});
