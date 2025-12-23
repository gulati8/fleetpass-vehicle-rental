'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { apiClient } from '@/lib/api-client';

interface UploadImageParams {
  vehicleId: string;
  file: File;
}

interface UploadImageResponse {
  imageUrl: string;
  vehicleId: string;
  message: string;
}

interface DeleteImageParams {
  vehicleId: string;
  imageUrl: string;
}

interface SetPrimaryImageParams {
  vehicleId: string;
  imageUrl: string;
}

interface ReorderImagesParams {
  vehicleId: string;
  imageUrls: string[];
}

/**
 * Hook for uploading a vehicle image
 */
export function useUploadVehicleImage() {
  const queryClient = useQueryClient();

  return useMutation<UploadImageResponse, Error, UploadImageParams>({
    mutationFn: async ({ vehicleId, file }) => {
      const formData = new FormData();
      formData.append('images', file);

      const response = await apiClient.post<UploadImageResponse>(
        `/vehicles/${vehicleId}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    },
    onSuccess: (_, { vehicleId }) => {
      // Invalidate vehicle queries to refetch with new image
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}

/**
 * Hook for deleting a vehicle image
 */
export function useDeleteVehicleImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteImageParams>({
    mutationFn: async ({ vehicleId, imageUrl }) => {
      await apiClient.delete(`/vehicles/${vehicleId}/images`, {
        data: { imageUrl },
      });
    },
    onSuccess: (_, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}

/**
 * Hook for setting primary vehicle image
 */
export function useSetPrimaryVehicleImage() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, SetPrimaryImageParams>({
    mutationFn: async ({ vehicleId, imageUrl }) => {
      await apiClient.patch(`/vehicles/${vehicleId}/images/primary`, {
        imageUrl,
      });
    },
    onSuccess: (_, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}

/**
 * Hook for reordering vehicle images
 */
export function useReorderVehicleImages() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ReorderImagesParams>({
    mutationFn: async ({ vehicleId, imageUrls }) => {
      await apiClient.patch(`/vehicles/${vehicleId}/images/reorder`, {
        imageUrls,
      });
    },
    onSuccess: (_, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() });
    },
  });
}
