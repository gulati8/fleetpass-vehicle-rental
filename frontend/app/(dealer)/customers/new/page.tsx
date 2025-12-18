'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useCreateCustomer } from '@/lib/hooks/api/use-customers';
import { CustomerForm } from '@/components/features/customers/CustomerForm';
import type { CustomerFormData } from '@/lib/validations/customer.validation';

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      const customer = await createCustomer.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth || undefined,
        driverLicenseNumber: data.driverLicenseNumber || undefined,
        driverLicenseState: data.driverLicenseState || undefined,
        driverLicenseExpiry: data.driverLicenseExpiry || undefined,
      });

      router.push(`/customers/${customer.id}`);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert(error.message || 'Failed to create customer. Please try again.');
    }
  };

  const handleSubmitAndStartKYC = async (data: CustomerFormData) => {
    try {
      const customer = await createCustomer.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth || undefined,
        driverLicenseNumber: data.driverLicenseNumber || undefined,
        driverLicenseState: data.driverLicenseState || undefined,
        driverLicenseExpiry: data.driverLicenseExpiry || undefined,
      });

      router.push(`/customers/${customer.id}/kyc`);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      alert(error.message || 'Failed to create customer. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/customers');
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
          Back to Customers
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Add New Customer
          </h1>
          <p className="text-neutral-600">
            Create a new customer profile and optionally start KYC verification
          </p>
        </div>

        {/* Form */}
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={createCustomer.isPending}
          submitLabel="Save Customer"
          showKYCOption={true}
          onSubmitAndStartKYC={handleSubmitAndStartKYC}
        />
      </div>
    </div>
  );
}
