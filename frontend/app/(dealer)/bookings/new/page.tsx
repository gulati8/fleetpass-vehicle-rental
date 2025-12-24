'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCreateBooking } from '@/lib/hooks/api/use-bookings';
import { BookingForm } from '@/components/features/bookings/BookingForm';
import type { CreateBookingRequest } from '@shared/types';

function NewBookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createBooking = useCreateBooking();

  const customerId = searchParams?.get('customerId') || undefined;

  const handleSubmit = async (data: CreateBookingRequest) => {
    try {
      const booking = await createBooking.mutateAsync(data);
      router.push(`/bookings/${booking.id}`);
    } catch (error: any) {
      console.error('Failed to create booking:', error);
      alert(error.message || 'Failed to create booking. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/bookings');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={handleCancel}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Bookings
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Create New Booking
          </h1>
          <p className="text-neutral-600">
            Set up a new vehicle rental booking for a customer
          </p>
        </div>

        {/* Form */}
        <BookingForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createBooking.isPending}
          initialCustomerId={customerId}
        />
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-neutral-200 rounded w-1/4" />
            <div className="h-64 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <NewBookingPageContent />
    </Suspense>
  );
}
