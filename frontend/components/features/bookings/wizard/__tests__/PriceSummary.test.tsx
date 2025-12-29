import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceSummary } from '../PriceSummary';

const defaultProps = {
  subtotalCents: 45000,
  taxCents: 3600,
  totalCents: 48600,
  depositCents: 10000,
  numDays: 3,
  dailyRateCents: 15000,
};

describe('PriceSummary Component', () => {
  describe('Uncontrolled Mode (expanded prop not set)', () => {
    it('should render with default expanded state (true)', () => {
      render(<PriceSummary {...defaultProps} />);

      // Should show expanded content
      expect(screen.getByText(/Rental \(3 days/)).toBeInTheDocument();
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('Security Deposit:')).toBeInTheDocument();
    });

    it('should show toggle button when uncontrolled', () => {
      render(<PriceSummary {...defaultProps} />);

      // Should have a toggle button (ChevronUp icon visible in expanded state)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should allow toggling between expanded and collapsed states', async () => {
      render(<PriceSummary {...defaultProps} />);
      const user = userEvent.setup();

      // Get the header area (clickable div)
      const header = screen.getByText('Price Summary').closest('div').parentElement;

      // Should be expanded initially
      expect(screen.getByText('Tax')).toBeInTheDocument();

      // Click to collapse
      await user.click(header);
      expect(screen.queryByText('Tax')).not.toBeInTheDocument();

      // Click to expand again
      await user.click(header);
      expect(screen.getByText('Tax')).toBeInTheDocument();
    });

    it('should make header clickable when uncontrolled', () => {
      const { container } = render(<PriceSummary {...defaultProps} />);

      const headerDiv = container.querySelector('.cursor-pointer');
      expect(headerDiv).toBeInTheDocument();
    });
  });

  describe('Controlled Mode - expanded=true', () => {
    it('should always show expanded content when expanded=true', () => {
      render(<PriceSummary {...defaultProps} expanded={true} />);

      // Should always show expanded content
      expect(screen.getByText(/Rental \(3 days/)).toBeInTheDocument();
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('Security Deposit:')).toBeInTheDocument();
    });

    it('should not show toggle button when controlled with expanded=true', () => {
      render(<PriceSummary {...defaultProps} expanded={true} />);

      // Should NOT have a visible toggle button for chevron
      const buttons = screen.queryAllByRole('button');
      // No button should exist for the toggle
      expect(buttons.length).toBe(0);
    });

    it('should not be clickable when expanded=true', () => {
      const { container } = render(<PriceSummary {...defaultProps} expanded={true} />);

      // Header should NOT have cursor-pointer class
      const headerDiv = container.querySelector('.cursor-pointer');
      expect(headerDiv).not.toBeInTheDocument();
    });

    it('should prevent toggling when expanded=true', async () => {
      const { container } = render(<PriceSummary {...defaultProps} expanded={true} />);
      const user = userEvent.setup();

      const header = screen.getByText('Price Summary').closest('div').parentElement;

      // Click header multiple times
      await user.click(header);
      await user.click(header);

      // Should still show expanded content
      expect(screen.getByText('Tax')).toBeInTheDocument();
      expect(screen.getByText('Security Deposit:')).toBeInTheDocument();
    });
  });

  describe('Controlled Mode - expanded=false', () => {
    it('should always show collapsed content when expanded=false', () => {
      render(<PriceSummary {...defaultProps} expanded={false} />);

      // Should show collapsed view with only total
      expect(screen.getByText('Total')).toBeInTheDocument();

      // Should NOT show detailed breakdown
      expect(screen.queryByText('Tax')).not.toBeInTheDocument();
      expect(screen.queryByText('Security Deposit:')).not.toBeInTheDocument();
    });

    it('should not show toggle button when expanded=false', () => {
      render(<PriceSummary {...defaultProps} expanded={false} />);

      // Should NOT have a visible toggle button
      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBe(0);
    });

    it('should not be clickable when expanded=false', () => {
      const { container } = render(<PriceSummary {...defaultProps} expanded={false} />);

      // Header should NOT have cursor-pointer class
      const headerDiv = container.querySelector('.cursor-pointer');
      expect(headerDiv).not.toBeInTheDocument();
    });

    it('should prevent toggling when expanded=false', async () => {
      render(<PriceSummary {...defaultProps} expanded={false} />);
      const user = userEvent.setup();

      const header = screen.getByText('Price Summary').closest('div').parentElement;

      // Click header multiple times
      await user.click(header);
      await user.click(header);

      // Should still show collapsed content
      expect(screen.queryByText('Tax')).not.toBeInTheDocument();
    });
  });

  describe('Price calculations and formatting', () => {
    it('should correctly format currency values', () => {
      render(<PriceSummary {...defaultProps} />);

      // $450.00 (subtotal)
      expect(screen.getByText('$450.00')).toBeInTheDocument();
      // $36.00 (tax)
      expect(screen.getByText('$36.00')).toBeInTheDocument();
      // $486.00 (total)
      expect(screen.getByText('$486.00')).toBeInTheDocument();
      // $100.00 (deposit)
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('should display rental breakdown with correct day count', () => {
      render(<PriceSummary {...defaultProps} numDays={1} dailyRateCents={20000} />);

      // Should show "1 day" (singular) not "1 days"
      expect(screen.getByText(/Rental \(1 day/)).toBeInTheDocument();
    });
  });
});
