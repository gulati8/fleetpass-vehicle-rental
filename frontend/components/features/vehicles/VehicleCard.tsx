'use client';

import { Car, MapPin, Gauge, Fuel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import type { Vehicle } from '@shared/types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

export function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onView,
  viewMode = 'grid',
}: VehicleCardProps) {
  const dailyRate = (vehicle.dailyRateCents / 100).toFixed(2);
  const mileageDisplay = vehicle.mileage ? vehicle.mileage.toLocaleString() : 'N/A';

  if (viewMode === 'list') {
    return (
      <Card
        hover
        className="transition-all duration-200"
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Image placeholder */}
            <div className="w-32 h-24 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
              {vehicle.imageUrls.length > 0 ? (
                <img
                  src={vehicle.imageUrls[0]}
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Car className="w-8 h-8 text-neutral-400" />
              )}
            </div>

            {/* Vehicle info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 truncate">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle.trim && (
                    <p className="text-sm text-neutral-600">{vehicle.trim}</p>
                  )}
                </div>
                <Badge
                  variant={vehicle.isAvailableForRent ? 'success' : 'neutral'}
                  size="sm"
                >
                  {vehicle.isAvailableForRent ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                <span className="flex items-center gap-1">
                  <Gauge className="w-4 h-4" />
                  {mileageDisplay} mi
                </span>
                {vehicle.bodyType && (
                  <span className="capitalize">{vehicle.bodyType}</span>
                )}
                {vehicle.transmission && (
                  <span className="capitalize">{vehicle.transmission}</span>
                )}
                {vehicle.fuelType && (
                  <span className="flex items-center gap-1 capitalize">
                    <Fuel className="w-4 h-4" />
                    {vehicle.fuelType}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-primary-600">
                  ${dailyRate}
                  <span className="text-sm font-normal text-neutral-500">/day</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onView(vehicle.id)}>
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(vehicle.id)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(vehicle.id)}
                    className="text-error-600 hover:text-error-700 hover:bg-error-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card
      hover
      className="transition-all duration-200 group"
    >
      <CardContent className="p-0">
        {/* Image placeholder */}
        <div className="w-full h-48 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-t-xl flex items-center justify-center overflow-hidden relative">
          {vehicle.imageUrls.length > 0 ? (
            <img
              src={vehicle.imageUrls[0]}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Car className="w-16 h-16 text-neutral-300 group-hover:text-neutral-400 transition-colors" />
          )}

          {/* Status badge overlay */}
          <div className="absolute top-3 right-3">
            <Badge
              variant={vehicle.isAvailableForRent ? 'success' : 'neutral'}
              size="sm"
              className="shadow-sm"
            >
              {vehicle.isAvailableForRent ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h3 className="font-semibold text-lg text-neutral-900 truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.trim && (
              <p className="text-sm text-neutral-600 truncate">{vehicle.trim}</p>
            )}
          </div>

          {/* Specs */}
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5" />
              {mileageDisplay}
            </span>
            {vehicle.bodyType && (
              <span className="capitalize">{vehicle.bodyType}</span>
            )}
            {vehicle.fuelType && (
              <span className="flex items-center gap-1 capitalize">
                <Fuel className="w-3.5 h-3.5" />
                {vehicle.fuelType}
              </span>
            )}
          </div>

          {/* VIN */}
          <p className="text-xs text-neutral-500 font-mono truncate" title={vehicle.vin}>
            VIN: {vehicle.vin}
          </p>

          {/* Divider */}
          <div className="border-t border-neutral-200" />

          {/* Price and actions */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary-600">
              ${dailyRate}
              <span className="text-xs font-normal text-neutral-500 block">per day</span>
            </div>

            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(vehicle.id)}
                className="text-xs"
              >
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(vehicle.id)}
                className="text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
