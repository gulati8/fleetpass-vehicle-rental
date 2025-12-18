'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Plus, Mail, Phone, Calendar, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { useCustomer, useDeleteCustomer } from '@/lib/hooks/api/use-customers';
import { KYCStatusIndicator, KYCSteps } from '@/components/features/customers/KYCStatusBadge';
import { CustomerBookingHistory } from '@/components/features/customers/CustomerBookingHistory';
import { formatPhoneDisplay, formatDateDisplay } from '@/lib/validations/customer.validation';
import { useState } from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const { data: customer, isLoading } = useCustomer(params.id);
  const deleteCustomer = useDeleteCustomer();

  // For now, mock bookings - in real implementation, fetch from API
  const customerBookings: any[] = [];

  const handleEdit = () => {
    router.push(`/customers/${params.id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer.mutateAsync(params.id);
      router.push('/customers');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const handleStartKYC = () => {
    router.push(`/customers/${params.id}/kyc`);
  };

  const handleCreateBooking = () => {
    router.push(`/bookings/new?customerId=${params.id}`);
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`);
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

  if (!customer) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Customer not found
          </h2>
          <p className="text-neutral-600 mb-6">
            The customer you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/customers')}>
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const memberSince = formatDateDisplay(customer.createdAt);
  const phoneDisplay = customer.phone ? formatPhoneDisplay(customer.phone) : 'Not provided';
  const isVerified = customer.kycStatus === 'approved';

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/customers')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Customers
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">{fullName}</h1>
            <p className="text-neutral-600">Member since {memberSince}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit} leftIcon={<Edit className="w-4 h-4" />}>
              Edit
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(true)}
              className="text-error-600 hover:text-error-700 hover:bg-error-50"
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Contact & Driver Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Email</div>
                      <div className="text-neutral-900 font-medium">{customer.email}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-neutral-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-neutral-600">Phone</div>
                      <div className="text-neutral-900 font-medium">{phoneDisplay}</div>
                    </div>
                  </div>
                  {customer.dateOfBirth && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                      <div>
                        <div className="text-sm text-neutral-600">Date of Birth</div>
                        <div className="text-neutral-900 font-medium">
                          {formatDateDisplay(customer.dateOfBirth)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Driver's License */}
            {(customer.driverLicenseNumber || customer.driverLicenseState) && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                    Driver's License
                  </h2>
                  <div className="space-y-4">
                    {customer.driverLicenseNumber && (
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-neutral-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-neutral-600">License Number</div>
                          <div className="text-neutral-900 font-medium font-mono">
                            {customer.driverLicenseNumber}
                          </div>
                        </div>
                      </div>
                    )}
                    {customer.driverLicenseState && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-neutral-600">State</div>
                          <div className="text-neutral-900 font-medium">
                            {customer.driverLicenseState}
                          </div>
                        </div>
                      </div>
                    )}
                    {customer.driverLicenseExpiry && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-neutral-400 mt-0.5" />
                        <div>
                          <div className="text-sm text-neutral-600">Expiry Date</div>
                          <div className="text-neutral-900 font-medium">
                            {formatDateDisplay(customer.driverLicenseExpiry)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking History */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Booking History
                  </h2>
                  {isVerified && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleCreateBooking}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      New Booking
                    </Button>
                  )}
                </div>
                <CustomerBookingHistory
                  bookings={customerBookings}
                  onViewBooking={handleViewBooking}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column - KYC Verification */}
          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  KYC Verification
                </h2>

                <KYCStatusIndicator
                  status={customer.kycStatus}
                  verifiedAt={customer.kycVerifiedAt}
                  className="mb-6"
                />

                {customer.kycInquiryId && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                      Verification Steps
                    </h3>
                    <KYCSteps
                      governmentIdVerified={isVerified}
                      selfieVerified={isVerified}
                      addressVerified={false}
                    />
                  </div>
                )}

                {customer.kycInquiryId && (
                  <div className="text-xs text-neutral-500 mb-4 p-3 bg-neutral-50 rounded-lg font-mono">
                    <div className="font-semibold text-neutral-700 mb-1">Inquiry ID</div>
                    {customer.kycInquiryId}
                  </div>
                )}

                {!isVerified && (
                  <Button
                    variant="primary"
                    onClick={handleStartKYC}
                    className="w-full"
                  >
                    {customer.kycStatus === 'pending'
                      ? 'Start KYC Verification'
                      : customer.kycStatus === 'rejected'
                      ? 'Retry KYC Verification'
                      : 'Continue KYC Verification'}
                  </Button>
                )}

                {isVerified && !customer.kycVerifiedAt && (
                  <div className="text-xs text-neutral-500 text-center">
                    Verified customer
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        size="md"
      >
        <ModalHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <ModalTitle>Delete Customer</ModalTitle>
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
                Are you sure you want to delete this customer?
              </p>
              <p className="text-sm text-neutral-600 mb-3">
                <strong>{fullName}</strong>
                <br />
                {customer.email}
              </p>
              <p className="text-sm text-neutral-600">
                This action cannot be undone. All associated data will be permanently
                removed.
              </p>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteModalOpen(false)}
            disabled={deleteCustomer.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            isLoading={deleteCustomer.isPending}
            className="bg-error-600 hover:bg-error-700"
          >
            {deleteCustomer.isPending ? 'Deleting...' : 'Delete Customer'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
