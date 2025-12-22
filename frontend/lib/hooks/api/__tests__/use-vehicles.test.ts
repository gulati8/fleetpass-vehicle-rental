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
        locationId: 'loc1',
        vin: 'TEST123',
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        trim: null,
        bodyType: null,
        exteriorColor: null,
        interiorColor: null,
        transmission: null,
        fuelType: null,
        mileage: null,
        dailyRateCents: 5000,
        weeklyRateCents: null,
        monthlyRateCents: null,
        features: null,
        imageUrls: [],
        isAvailableForRent: true,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      locationId: 'loc1',
      vin: 'TEST123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      trim: null,
      bodyType: null,
      exteriorColor: null,
      interiorColor: null,
      transmission: null,
      fuelType: null,
      mileage: null,
      dailyRateCents: 5000,
      weeklyRateCents: null,
      monthlyRateCents: null,
      features: null,
      imageUrls: [],
      isAvailableForRent: true,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: mockVehicle },
    });

    const { result } = renderHook(() => useCreateVehicle(), {
      wrapper: QueryWrapper,
    });

    result.current.mutate({
      locationId: 'loc1',
      vin: 'TEST123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      dailyRateCents: 5000,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockVehicle);
  });
});
