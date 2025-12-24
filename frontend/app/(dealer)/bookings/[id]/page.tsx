'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle, PlayCircle, Package, XCircle, Calendar, DollarSign, MapPin, User, Car, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import {
  useBooking,
  useDeleteBooking,
  useConfirmBooking,
  useActivateBooking,
  useCompleteBooking,
  useCancelBooking,
} from '@/lib/hooks/api/use-bookings';
import { BookingStatusIndicator } from '@/components/features/bookings/BookingStatusBadge';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'confirm' | 'activate' | 'complete' | 'cancel' | null>(null);

  const { data: booking, isLoading } = useBooking(params.id);
  const deleteBooking = useDeleteBooking();
  const confirmBooking = useConfirmBooking();
  const activateBooking = useActivateBooking();
  const completeBooking = useCompleteBooking();
  const cancelBooking = useCancelBooking();

  const handleDelete = async () => {
    try {
      await deleteBooking.mutateAsync(params.id);
      router.push('/bookings');
    } catch (error) {
      console.error('Failed to delete booking:', error);
      alert('Failed to delete booking. Please try again.');
    }
  };

  const handleStatusAction = async () => {
    try {
      if (actionType === 'confirm') {
        await confirmBooking.mutateAsync(params.id);
      } else if (actionType === 'activate') {
        await activateBooking.mutateAsync(params.id);
      } else if (actionType === 'complete') {
        await completeBooking.mutateAsync(params.id);
      } else if (actionType === 'cancel') {
        await cancelBooking.mutateAsync(params.id);
      }
      setActionModalOpen(false);
      setActionType(null);
    } catch (error) {
      console.error('Failed to update booking status:', error);
      alert('Failed to update booking status. Please try again.');
    }
  };

  const openActionModal = (type: typeof actionType) => {
    setActionType(type);
    setActionModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-neutral-200 rounded w-1/4" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-neutral-200 rounded-xl" />
                <div className="h-96 bg-neutral-200 rounded-xl" />
              </div>
              <div className="h-96 bg-neutral-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Booking not found
          </h2>
          <p className="text-neutral-600 mb-6">
            The booking you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/bookings')}>
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
  const vehicleName = `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`;
  const totalAmount = (booking.totalCents / 100).toFixed(2);
  const depositAmount = (booking.depositCents / 100).toFixed(2);
  const subtotal = (booking.subtotalCents / 100).toFixed(2);
  const tax = (booking.taxCents / 100).toFixed(2);

  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';
  const isActive = booking.status === 'active';
  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  const actionInfo = {
    confirm: {
      title: 'Confirm Booking',
      description: 'Confirm this booking and notify the customer?',
      icon: CheckCircle,
      color: 'primary',
    },
    activate: {
      title: 'Activate Rental',
      description: 'Mark this rental as active (vehicle picked up)?',
      icon: PlayCircle,
      color: 'success',
    },
    complete: {
      title: 'Complete Rental',
      description: 'Mark this rental as completed (vehicle returned)?',
      icon: Package,
      color: 'success',
    },
    cancel: {
      title: 'Cancel Booking',
      description: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      icon: XCircle,
      color: 'error',
    },
  };

  const currentAction = actionType ? actionInfo[actionType] : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/bookings')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Bookings
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{booking.bookingNumber}</h1>
            <p className="text-neutral-600">
              Created {new Date(booking.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {!isCompleted && !isCancelled && (
              <Button
                variant="ghost"
                onClick={() => setDeleteModalOpen(true)}
                className="text-error-600 hover:text-error-700 hover:bg-error-50"
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status */}
            <BookingStatusIndicator
              status={booking.status}
              pickupDate={booking.pickupDatetime}
              dropoffDate={booking.dropoffDatetime}
            />

            {/* Customer Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Customer</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Name</div>
                      <div className="text-neutral-900 font-medium">{customerName}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="text-sm text-neutral-600">Email</div>
                      <div className="text-neutral-900 font-medium">{booking.customer.email}</div>
                    </div>
                  </div>
                  {booking.customer.phone && (
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-neutral-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <div className="text-sm text-neutral-600">Phone</div>
                        <div className="text-neutral-900 font-medium">{booking.customer.phone}</div>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/customers/${booking.customerId}`)}
                  >
                    View Customer Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Vehicle</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Car className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Vehicle</div>
                      <div className="text-neutral-900 font-medium">{vehicleName}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">VIN</div>
                      <div className="text-neutral-900 font-medium font-mono">{booking.vehicle.vin}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/vehicles/${booking.vehicleId}`)}
                  >
                    View Vehicle Details
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Rental Details */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Rental Period</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Pickup</div>
                      <div className="text-neutral-900 font-medium">
                        {new Date(booking.pickupDatetime).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div className="text-sm text-neutral-600 mt-0.5">
                        {booking.pickupLocation.name}, {booking.pickupLocation.city}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Drop-off</div>
                      <div className="text-neutral-900 font-medium">
                        {new Date(booking.dropoffDatetime).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div className="text-sm text-neutral-600 mt-0.5">
                        {booking.dropoffLocation.name}, {booking.dropoffLocation.city}
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="text-sm text-neutral-600">Duration</div>
                    <div className="text-neutral-900 font-semibold">
                      {booking.numDays} {booking.numDays === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {booking.notes && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-3">Notes</h2>
                  <p className="text-neutral-700 whitespace-pre-wrap">{booking.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Actions */}
            {!isCompleted && !isCancelled && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Actions</h2>
                  <div className="space-y-2">
                    {isPending && (
                      <Button
                        variant="primary"
                        onClick={() => openActionModal('confirm')}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                        className="w-full"
                      >
                        Confirm Booking
                      </Button>
                    )}
                    {isConfirmed && (
                      <Button
                        variant="primary"
                        onClick={() => openActionModal('activate')}
                        leftIcon={<PlayCircle className="w-4 h-4" />}
                        className="w-full"
                      >
                        Activate Rental
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        variant="primary"
                        onClick={() => openActionModal('complete')}
                        leftIcon={<Package className="w-4 h-4" />}
                        className="w-full"
                      >
                        Complete Rental
                      </Button>
                    )}
                    {!isCompleted && !isCancelled && (
                      <Button
                        variant="outline"
                        onClick={() => openActionModal('cancel')}
                        leftIcon={<XCircle className="w-4 h-4" />}
                        className="w-full text-error-600 hover:text-error-700 hover:bg-error-50"
                      >
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Pricing</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Daily Rate</span>
                    <span className="text-neutral-900 font-medium">
                      ${(booking.dailyRateCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Days</span>
                    <span className="text-neutral-900 font-medium">{booking.numDays}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="text-neutral-900 font-medium">${subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Tax</span>
                    <span className="text-neutral-900 font-medium">${tax}</span>
                  </div>
                  <div className="pt-3 border-t-2 border-neutral-300">
                    <div className="flex justify-between">
                      <span className="font-semibold text-neutral-900">Total</span>
                      <span className="text-xl font-bold text-neutral-900">${totalAmount}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">Deposit</span>
                      <span className="text-neutral-900 font-medium">${depositAmount}</span>
                    </div>
                    {booking.depositPaidAt && (
                      <div className="text-xs text-success-600 mt-1">
                        Paid on {new Date(booking.depositPaidAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="md">
        <ModalHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <ModalTitle>Delete Booking</ModalTitle>
            </div>
            <ModalCloseButton onClose={() => setDeleteModalOpen(false)} />
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-error-600" />
            </div>
            <div>
              <p className="text-neutral-900 font-medium mb-2">
                Are you sure you want to delete this booking?
              </p>
              <p className="text-sm text-neutral-600 mb-3">
                <strong>{booking.bookingNumber}</strong>
                <br />
                Customer: {customerName}
              </p>
              <p className="text-sm text-neutral-600">
                This action cannot be undone. All associated data will be permanently removed.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleteBooking.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            isLoading={deleteBooking.isPending}
            className="bg-error-600 hover:bg-error-700"
          >
            {deleteBooking.isPending ? 'Deleting...' : 'Delete Booking'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Status Action Modal */}
      {currentAction && (
        <Modal isOpen={actionModalOpen} onClose={() => setActionModalOpen(false)} size="md">
          <ModalHeader>
            <div className="flex items-start justify-between w-full">
              <div>
                <ModalTitle>{currentAction.title}</ModalTitle>
              </div>
              <ModalCloseButton onClose={() => setActionModalOpen(false)} />
            </div>
          </ModalHeader>

          <ModalBody>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full bg-${currentAction.color}-100 flex items-center justify-center flex-shrink-0`}>
                <currentAction.icon className={`w-6 h-6 text-${currentAction.color}-600`} />
              </div>
              <div>
                <p className="text-neutral-900 font-medium mb-2">
                  {currentAction.description}
                </p>
                <p className="text-sm text-neutral-600">
                  Booking: <strong>{booking.bookingNumber}</strong>
                </p>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setActionModalOpen(false)}
              disabled={confirmBooking.isPending || activateBooking.isPending || completeBooking.isPending || cancelBooking.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleStatusAction}
              isLoading={confirmBooking.isPending || activateBooking.isPending || completeBooking.isPending || cancelBooking.isPending}
              className={actionType === 'cancel' ? 'bg-error-600 hover:bg-error-700' : ''}
            >
              Confirm
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
