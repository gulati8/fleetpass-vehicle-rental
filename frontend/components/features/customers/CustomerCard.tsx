'use client';

import { User, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { KYCStatusBadge } from './KYCStatusBadge';
import { formatPhoneDisplay } from '@/lib/validations/customer.validation';
import type { Customer } from '@shared/types';

interface CustomerCardProps {
  customer: Customer & { bookingCount?: number };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onStartKYC?: (id: string) => void;
  onCreateBooking?: (id: string) => void;
  viewMode?: 'grid' | 'list';
}

export function CustomerCard({
  customer,
  onView,
  onEdit,
  onStartKYC,
  onCreateBooking,
  viewMode = 'grid',
}: CustomerCardProps) {
  const fullName = `${customer.firstName} ${customer.lastName}`;
  const memberSince = new Date(customer.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
  const phoneDisplay = customer.phone ? formatPhoneDisplay(customer.phone) : 'No phone';
  const bookingCount = customer.bookingCount ?? 0;
  const isVerified = customer.kycStatus === 'approved';

  if (viewMode === 'list') {
    return (
      <Card hover className="transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex-shrink-0 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>

            {/* Customer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    {fullName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4" />
                      {customer.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      {phoneDisplay}
                    </span>
                  </div>
                </div>
                <KYCStatusBadge status={customer.kycStatus} size="sm" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Member since {memberSince}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    {bookingCount} {bookingCount === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(customer.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(customer.id)}
                  >
                    Edit
                  </Button>
                  {!isVerified && onStartKYC && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onStartKYC(customer.id)}
                    >
                      Start KYC
                    </Button>
                  )}
                  {isVerified && onCreateBooking && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onCreateBooking(customer.id)}
                    >
                      New Booking
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card hover className="transition-all duration-200 group">
      <CardContent className="p-0">
        {/* Avatar header */}
        <div className="relative h-32 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
            <User className="w-10 h-10 text-primary-600" />
          </div>

          {/* KYC badge overlay */}
          <div className="absolute top-3 right-3">
            <KYCStatusBadge status={customer.kycStatus} size="sm" />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Name and email */}
          <div className="text-center">
            <h3 className="font-semibold text-lg text-neutral-900 mb-1 truncate">
              {fullName}
            </h3>
            <p className="text-sm text-neutral-600 truncate flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {customer.email}
            </p>
          </div>

          {/* Contact info */}
          <div className="flex items-center justify-center gap-3 text-xs text-neutral-600 pb-3 border-b border-neutral-200">
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />
              {phoneDisplay}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="p-2 rounded-lg bg-neutral-50">
              <div className="text-xs text-neutral-600 mb-0.5">Member Since</div>
              <div className="font-semibold text-neutral-900">{memberSince}</div>
            </div>
            <div className="p-2 rounded-lg bg-neutral-50">
              <div className="text-xs text-neutral-600 mb-0.5">Bookings</div>
              <div className="font-semibold text-neutral-900">{bookingCount}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(customer.id)}
                className="text-xs"
              >
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(customer.id)}
                className="text-xs"
              >
                Edit
              </Button>
            </div>
            {!isVerified && onStartKYC && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onStartKYC(customer.id)}
                className="w-full text-xs"
              >
                Start KYC Verification
              </Button>
            )}
            {isVerified && onCreateBooking && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onCreateBooking(customer.id)}
                className="w-full text-xs"
              >
                Create Booking
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * CustomerSkeleton - Loading placeholder
 */
export function CustomerSkeleton({
  viewMode = 'grid',
  count = 1,
}: {
  viewMode?: 'grid' | 'list';
  count?: number;
}) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <>
        {skeletons.map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-neutral-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-neutral-200 rounded animate-pulse w-48" />
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-64" />
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {skeletons.map((i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <div className="h-32 bg-neutral-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-5 bg-neutral-200 rounded animate-pulse w-3/4 mx-auto" />
              <div className="h-4 bg-neutral-200 rounded animate-pulse w-full" />
              <div className="h-16 bg-neutral-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
