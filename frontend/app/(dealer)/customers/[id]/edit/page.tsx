'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCustomer, useUpdateCustomer } from '@/lib/hooks/api/use-customers';
import { CustomerForm } from '@/components/features/customers/CustomerForm';
import type { CustomerFormData } from '@/lib/validations/customer.validation';

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(params.id);
  const updateCustomer = useUpdateCustomer();

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      await updateCustomer.mutateAsync({
        id: params.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth || undefined,
        driverLicenseNumber: data.driverLicenseNumber || undefined,
        driverLicenseState: data.driverLicenseState || undefined,
        driverLicenseExpiry: data.driverLicenseExpiry || undefined,
      });

      router.push(`/customers/${params.id}`);
    } catch (error: any) {
      console.error('Failed to update customer:', error);
      alert(error.message || 'Failed to update customer. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push(`/customers/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-neutral-200 rounded w-1/4" />
            <div className="h-96 bg-neutral-200 rounded-xl" />
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
          Back to Customer
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Edit Customer
          </h1>
          <p className="text-neutral-600">
            Update {customer.firstName} {customer.lastName}'s information
          </p>
        </div>

        {/* Form */}
        <CustomerForm
          defaultValues={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone || '',
            dateOfBirth: customer.dateOfBirth || null,
            driverLicenseNumber: customer.driverLicenseNumber || null,
            driverLicenseState: customer.driverLicenseState || null,
            driverLicenseExpiry: customer.driverLicenseExpiry || null,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={updateCustomer.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
