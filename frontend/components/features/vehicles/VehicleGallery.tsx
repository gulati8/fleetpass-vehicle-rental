'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';

interface VehicleGalleryProps {
  imageUrls: string[];
  vehicleName: string;
  className?: string;
}

export function VehicleGallery({
  imageUrls,
  vehicleName,
  className = '',
}: VehicleGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className={`bg-neutral-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 bg-neutral-200 rounded-lg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-neutral-600 font-medium">No images available</p>
        </div>
      </div>
    );
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* Gallery Component */}
      <div className={`space-y-4 ${className}`}>
        {/* Main Image */}
        <div className="relative aspect-[16/10] bg-neutral-100 rounded-lg overflow-hidden group">
          <img
            src={imageUrls[currentIndex]}
            alt={`${vehicleName} - Image ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />

          {/* Zoom Button */}
          <button
            onClick={() => openLightbox(currentIndex)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            aria-label="Open fullscreen view"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {/* Navigation Arrows - Only show if more than 1 image */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg text-sm font-medium">
                {currentIndex + 1} / {imageUrls.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail Strip - Only show if more than 1 image */}
        {imageUrls.length > 1 && (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {imageUrls.map((url, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`
                  relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                  ${
                    index === currentIndex
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }
                `}
                aria-label={`View image ${index + 1}`}
              >
                <img
                  src={url}
                  alt={`${vehicleName} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={imageUrls}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCurrentIndex}
          vehicleName={vehicleName}
        />
      )}
    </>
  );
}

/* Lightbox Component */
interface LightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  vehicleName: string;
}

function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
  vehicleName,
}: LightboxProps) {
  const goToNext = () => {
    onNavigate((currentIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    onNavigate((currentIndex - 1 + images.length) % images.length);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrevious();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery lightbox"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-neutral-300 p-2 z-10"
        aria-label="Close lightbox"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 text-white text-lg font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main Image */}
      <div
        className="relative w-full h-full flex items-center justify-center p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`${vehicleName} - Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-neutral-300 p-3 bg-black bg-opacity-50 rounded-lg transition-all"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-neutral-300 p-3 bg-black bg-opacity-50 rounded-lg transition-all"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-4 py-2 bg-black bg-opacity-50 rounded-lg">
          {images.map((url, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(index);
              }}
              className={`
                flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all
                ${
                  index === currentIndex
                    ? 'border-white ring-2 ring-white'
                    : 'border-neutral-400 hover:border-neutral-300'
                }
              `}
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={url}
                alt={`${vehicleName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
