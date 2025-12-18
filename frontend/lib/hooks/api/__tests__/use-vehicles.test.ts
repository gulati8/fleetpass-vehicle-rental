import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryWrapper } from '@/lib/test-utils/react-query';
import { useVehicles, useCreateVehicle } from '../use-vehicles';
import apiClient from '@/lib/api-client';

// Mock the API client
vi.mock('@/lib/api-client');

describe('useVehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch vehicles successfully', async () => {
    const mockVehicles = [
      {
        id: '1',
        vin: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        status: 'AVAILABLE',
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: mockVehicles },
    });

    const { result } = renderHook(() => useVehicles(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVehicles);
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Network error');
    vi.mocked(apiClient.get).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useVehicles(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(mockError);
  });
});

describe('useCreateVehicle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create vehicle successfully', async () => {
    const mockVehicle = {
      id: '1',
      vin: 'TEST123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: mockVehicle },
    });

    const { result } = renderHook(() => useCreateVehicle(), {
      wrapper: QueryWrapper,
    });

    result.current.mutate({
      vin: 'TEST123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      color: 'Blue',
      mileage: 0,
      licensePlate: 'ABC123',
      locationId: 'loc1',
      dailyRate: 50,
      fuelType: 'Gasoline',
      transmission: 'Automatic',
      seats: 5,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVehicle);
  });
});
