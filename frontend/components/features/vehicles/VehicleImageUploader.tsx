'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import {
  useUploadVehicleImage,
  useDeleteVehicleImage,
  useSetPrimaryVehicleImage,
  useReorderVehicleImages,
} from '@/lib/hooks/api/use-vehicle-images';

interface VehicleImageUploaderProps {
  vehicleId?: string; // Optional - undefined in create mode
  imageUrls: string[];
  maxImages?: number;
  onImagesChange?: (imageUrls: string[]) => void;
}

export function VehicleImageUploader({
  vehicleId,
  imageUrls,
  maxImages = 10,
  onImagesChange,
}: VehicleImageUploaderProps) {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadVehicleImage();
  const deleteMutation = useDeleteVehicleImage();
  const setPrimaryMutation = useSetPrimaryVehicleImage();
  const reorderMutation = useReorderVehicleImages();


  const handleFileChange = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploadErrors([]);
      const remainingSlots = maxImages - imageUrls.length;

      if (remainingSlots <= 0) {
        setUploadErrors([`Maximum ${maxImages} images allowed`]);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const errors: string[] = [];

      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Not an image file`);
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          errors.push(`${file.name}: File too large (max 5MB)`);
          continue;
        }

        try {
          if (!vehicleId) {
            errors.push(`${file.name}: Vehicle ID required`);
            continue;
          }
          await uploadMutation.mutateAsync({ vehicleId, file });
        } catch (error) {
          errors.push(
            `${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`
          );
        }
      }

      if (errors.length > 0) {
        setUploadErrors(errors);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [vehicleId, imageUrls.length, maxImages, uploadMutation]
  );


  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    if (!vehicleId) return;

    try {
      await deleteMutation.mutateAsync({ vehicleId, imageUrl });
      onImagesChange?.(imageUrls.filter((url) => url !== imageUrl));
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleSetPrimary = async (imageUrl: string) => {
    if (!vehicleId) return;

    try {
      await setPrimaryMutation.mutateAsync({ vehicleId, imageUrl });
      // Move this image to the front
      const newOrder = [imageUrl, ...imageUrls.filter((url) => url !== imageUrl)];
      onImagesChange?.(newOrder);
    } catch (error) {
      console.error('Failed to set primary image:', error);
    }
  };

  const isUploading = uploadMutation.isPending;
  const canUploadMore = imageUrls.length < maxImages;

  // Show message in create mode
  if (!vehicleId) {
    return (
      <div className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
        <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-neutral-700 mb-1">
          Save Vehicle First
        </p>
        <p className="text-xs text-neutral-500">
          You can upload images after creating the vehicle
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {canUploadMore && (
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Images
              </>
            )}
          </Button>

          <p className="text-sm text-neutral-500">
            {imageUrls.length} of {maxImages} images • PNG, JPG up to 5MB
          </p>
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <p className="text-sm font-medium text-error-900 mb-2">Upload Errors:</p>
          <ul className="text-xs text-error-700 space-y-1">
            {uploadErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Image Gallery */}
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imageUrls.map((url, index) => (
            <div
              key={url}
              className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50"
            >
              {/* Image */}
              <img
                src={url}
                alt={`Vehicle image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-warning-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {index !== 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(url)}
                    disabled={setPrimaryMutation.isPending}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteImage(url)}
                  disabled={deleteMutation.isPending}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 text-error-600 hover:text-error-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Loading Overlay */}
              {(deleteMutation.isPending || setPrimaryMutation.isPending) && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {imageUrls.length === 0 && !canUploadMore && (
        <div className="text-center py-12 border border-neutral-200 rounded-lg bg-neutral-50">
          <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-sm text-neutral-600">No images uploaded yet</p>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-neutral-500">
        The first image will be used as the primary image in listings. You can reorder
        images by setting a new primary image.
      </p>
    </div>
  );
}
