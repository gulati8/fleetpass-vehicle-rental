'use client';

import { useRouter } from 'next/navigation';
import { useCustomer } from '@/lib/hooks/api/use-customers';
import { KYCWizard } from '@/components/features/customers/KYCWizard';
import { formatPhoneDisplay } from '@/lib/validations/customer.validation';

export default function CustomerKYCPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(params.id);

  const handleComplete = () => {
    router.push(`/customers/${params.id}`);
  };

  const handleCancel = () => {
    router.push(`/customers/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-neutral-200 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-neutral-200 rounded w-48" />
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
          <p className="text-neutral-600">
            The customer you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const fullName = `${customer.firstName} ${customer.lastName}`;
  const phoneDisplay = customer.phone ? formatPhoneDisplay(customer.phone) : 'Not provided';

  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <KYCWizard
          customerId={customer.id}
          customerName={fullName}
          customerEmail={customer.email}
          customerPhone={phoneDisplay}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
