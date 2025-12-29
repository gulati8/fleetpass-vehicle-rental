/**
 * Tests for Step1BookingDetails component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Step1BookingDetails } from '../Step1BookingDetails';
import { WizardProvider } from '../../BookingWizardContext';

// Mock API hooks
vi.mock('@/lib/hooks/api/use-customers', () => ({
  useCustomers: () => ({
    data: [
      {
        id: 'customer-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/api/use-vehicles', () => ({
  useVehicles: () => ({
    data: [
      {
        id: 'vehicle-1',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        vin: 'ABC123',
        dailyRateCents: 5000,
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/api/use-locations', () => ({
  useLocations: () => ({
    data: [
      {
        id: 'location-1',
        name: 'Downtown',
        city: 'San Francisco',
        state: 'CA',
      },
    ],
    isLoading: false,
  }),
}));

describe('Step1BookingDetails', () => {
  let queryClient: QueryClient;
  const mockOnNext = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockOnNext.mockClear();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WizardProvider enablePersistence={false}>
          {ui}
        </WizardProvider>
      </QueryClientProvider>
    );
  };

  it('renders all form sections', () => {
    renderWithProviders(<Step1BookingDetails onNext={mockOnNext} />);

    expect(screen.getByText('Customer')).toBeInTheDocument();
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByText('Rental Period')).toBeInTheDocument();
    expect(screen.getByText('Additional Details')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderWithProviders(<Step1BookingDetails onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    await waitFor(() => {
      // Use getAllByText since the error appears both in the field and step error
      expect(screen.getAllByText(/customer is required/i).length).toBeGreaterThan(0);
    });

    expect(mockOnNext).not.toHaveBeenCalled();
  });

  it('displays Next button', () => {
    renderWithProviders(<Step1BookingDetails onNext={mockOnNext} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();
  });

  it('loads customer, vehicle, and location options', () => {
    renderWithProviders(<Step1BookingDetails onNext={mockOnNext} />);

    expect(screen.getByText(/select a customer/i)).toBeInTheDocument();
    expect(screen.getByText(/select a vehicle/i)).toBeInTheDocument();
    // "Select location" appears twice (pickup and dropoff), so use getAllByText
    expect(screen.getAllByText(/select location/i).length).toBeGreaterThan(0);
  });
});
