'use client';

import { Calendar, MapPin, User, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { BookingStatusBadge } from './BookingStatusBadge';
import type { BookingWithRelations } from '@shared/types';

interface BookingCardProps {
  booking: BookingWithRelations;
  onView: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

export function BookingCard({ booking, onView, viewMode = 'grid' }: BookingCardProps) {
  const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
  const vehicleName = `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`;
  const pickupDate = new Date(booking.pickupDatetime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dropoffDate = new Date(booking.dropoffDatetime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const totalAmount = (booking.totalCents / 100).toFixed(2);

  if (viewMode === 'list') {
    return (
      <Card hover className="transition-all duration-200" data-testid="booking-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Booking visual indicator */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex-shrink-0 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-primary-600" />
            </div>

            {/* Booking info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {booking.bookingNumber}
                    </h3>
                    <BookingStatusBadge status={booking.status} size="sm" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {customerName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Car className="w-4 h-4" />
                        {vehicleName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {pickupDate} - {dropoffDate} ({booking.numDays} {booking.numDays === 1 ? 'day' : 'days'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-900">${totalAmount}</span> total
                </div>

                <Button size="sm" variant="secondary" onClick={() => onView(booking.id)}>
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card hover className="transition-all duration-200 h-full" data-testid="booking-card">
      <CardContent className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-900 mb-1">{booking.bookingNumber}</h3>
            <BookingStatusBadge status={booking.status} size="sm" />
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-primary-600" />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 flex-1">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-neutral-600">Customer</div>
              <div className="font-medium text-neutral-900">{customerName}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Car className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-neutral-600">Vehicle</div>
              <div className="font-medium text-neutral-900">{vehicleName}</div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="text-neutral-600">Duration</div>
              <div className="font-medium text-neutral-900">
                {pickupDate} - {dropoffDate}
              </div>
              <div className="text-xs text-neutral-500">{booking.numDays} {booking.numDays === 1 ? 'day' : 'days'}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-neutral-600">Total</span>
            <span className="text-lg font-semibold text-neutral-900">${totalAmount}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onView(booking.id)} className="w-full">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Booking card skeleton for loading states
 */
export function BookingSkeleton({
  viewMode = 'grid',
  count = 1,
}: {
  viewMode?: 'grid' | 'list';
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            {viewMode === 'list' ? (
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-neutral-200 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-neutral-200 rounded w-1/3" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="h-6 bg-neutral-200 rounded w-1/2" />
                  <div className="w-12 h-12 bg-neutral-200 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-full" />
                  <div className="h-4 bg-neutral-200 rounded w-4/5" />
                  <div className="h-4 bg-neutral-200 rounded w-3/5" />
                </div>
                <div className="h-10 bg-neutral-200 rounded w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
