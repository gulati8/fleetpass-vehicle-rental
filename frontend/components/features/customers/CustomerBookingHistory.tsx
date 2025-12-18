'use client';

import { Calendar, DollarSign, Car } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Badge } from '@/components/ui/badge/Badge';
import { Button } from '@/components/ui/button/Button';
import type { Booking } from '@shared/types';

interface CustomerBookingHistoryProps {
  bookings: Booking[];
  onViewBooking: (id: string) => void;
  isLoading?: boolean;
}

export function CustomerBookingHistory({
  bookings,
  onViewBooking,
  isLoading = false,
}: CustomerBookingHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-200 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-neutral-200 rounded animate-pulse w-1/2" />
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-neutral-400" />
        </div>
        <h4 className="text-sm font-semibold text-neutral-900 mb-1">
          No bookings yet
        </h4>
        <p className="text-sm text-neutral-600 text-center max-w-sm">
          This customer hasn't made any bookings yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const startDate = new Date(booking.startDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const endDate = new Date(booking.endDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const totalAmount = (booking.totalAmountCents / 100).toFixed(2);

        // Status configuration
        const statusConfig = {
          pending: { variant: 'neutral' as const, label: 'Pending' },
          confirmed: { variant: 'success' as const, label: 'Confirmed' },
          active: { variant: 'primary' as const, label: 'Active' },
          completed: { variant: 'success' as const, label: 'Completed' },
          cancelled: { variant: 'error' as const, label: 'Cancelled' },
        };

        const status = statusConfig[booking.status as keyof typeof statusConfig] || {
          variant: 'neutral' as const,
          label: booking.status,
        };

        return (
          <Card key={booking.id} hover className="transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Car className="w-6 h-6 text-primary-600" />
                </div>

                {/* Booking details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-neutral-900 truncate">
                        {booking.bookingNumber}
                      </h4>
                      <p className="text-sm text-neutral-600">
                        {(booking as any).vehicle?.year} {(booking as any).vehicle?.make}{' '}
                        {(booking as any).vehicle?.model}
                      </p>
                    </div>
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {startDate} - {endDate}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-neutral-900">
                      <DollarSign className="w-3.5 h-3.5" />
                      ${totalAmount}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewBooking(booking.id)}
                    className="text-xs"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
