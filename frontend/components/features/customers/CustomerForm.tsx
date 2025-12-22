'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Calendar, MapPin, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { customerSchema, type CustomerFormData } from '@/lib/validations/customer.validation';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
];

interface CustomerFormProps {
  defaultValues?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  showKYCOption?: boolean;
  onSubmitAndStartKYC?: (data: CustomerFormData) => Promise<void>;
}

export function CustomerForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Customer',
  showKYCOption = false,
  onSubmitAndStartKYC,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: null,
      driverLicenseNumber: null,
      driverLicenseState: null,
      driverLicenseExpiry: null,
    },
  });

  const handleFormSubmit = async (data: CustomerFormData) => {
    await onSubmit(data);
  };

  const handleSubmitAndKYC = async (data: CustomerFormData) => {
    if (onSubmitAndStartKYC) {
      await onSubmitAndStartKYC(data);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-1.5">
                First Name <span className="text-error-600">*</span>
              </label>
              <Input
                id="firstName"
                {...register('firstName')}
                error={errors.firstName?.message}
                disabled={isSubmitting}
                placeholder="John"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Last Name <span className="text-error-600">*</span>
              </label>
              <Input
                id="lastName"
                {...register('lastName')}
                error={errors.lastName?.message}
                disabled={isSubmitting}
                placeholder="Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email <span className="text-error-600">*</span>
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                disabled={isSubmitting}
                placeholder="john.doe@example.com"
                leftAddon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Phone <span className="text-error-600">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                error={errors.phone?.message}
                disabled={isSubmitting}
                placeholder="(555) 555-5555"
                leftAddon={<Phone className="w-4 h-4" />}
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Date of Birth
              </label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                error={errors.dateOfBirth?.message}
                disabled={isSubmitting}
                leftAddon={<Calendar className="w-4 h-4" />}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Customer must be at least 18 years old
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Driver's License */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900">
              Driver's License
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="driverLicenseNumber" className="block text-sm font-medium text-neutral-700 mb-1.5">
                License Number
              </label>
              <Input
                id="driverLicenseNumber"
                {...register('driverLicenseNumber')}
                error={errors.driverLicenseNumber?.message}
                disabled={isSubmitting}
                placeholder="D1234567"
              />
            </div>

            <div>
              <label htmlFor="driverLicenseState" className="block text-sm font-medium text-neutral-700 mb-1.5">
                State
              </label>
              <Select
                id="driverLicenseState"
                {...register('driverLicenseState')}
                error={errors.driverLicenseState?.message?.toString()}
                disabled={isSubmitting}
                options={[
                  { value: '', label: 'Select State' },
                  ...US_STATES.map((state) => ({ value: state, label: state })),
                ]}
              />
            </div>

            <div>
              <label htmlFor="driverLicenseExpiry" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Expiry Date
              </label>
              <Input
                id="driverLicenseExpiry"
                type="date"
                {...register('driverLicenseExpiry')}
                error={errors.driverLicenseExpiry?.message}
                disabled={isSubmitting}
                leftAddon={<Calendar className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="secondary"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {submitLabel}
        </Button>
        {showKYCOption && onSubmitAndStartKYC && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit(handleSubmitAndKYC)}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Save & Start KYC
          </Button>
        )}
      </div>
    </form>
  );
}
