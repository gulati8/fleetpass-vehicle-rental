'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Label } from '@/components/ui/label/Label';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useVehicles } from '@/lib/hooks/api/use-vehicles';
import { useUsers } from '@/lib/hooks/api/use-users';
import {
  leadSchema,
  type LeadFormData,
  formDataToCreateRequest,
  formDataToUpdateRequest,
  apiFormatToFormData,
} from '@/lib/validations/lead.validation';
import {
  LeadWithRelations,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadStatus,
  LeadSource,
} from '@shared/types';

interface LeadFormProps {
  initialData?: Partial<LeadWithRelations>;
  mode: 'create' | 'edit';
  onSubmit: (data: CreateLeadRequest | UpdateLeadRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function LeadForm({
  initialData,
  mode,
  onSubmit,
  onCancel,
  isSubmitting,
}: LeadFormProps) {
  // Fetch vehicles and users for dropdowns
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();

  // Convert initial data to form format if in edit mode
  const defaultValues: Partial<LeadFormData> =
    mode === 'edit' && initialData
      ? apiFormatToFormData(initialData as LeadWithRelations)
      : {
          customerName: '',
          customerEmail: null,
          customerPhone: null,
          source: null,
          vehicleInterestId: null,
          assignedToId: null,
          notes: null,
          status: LeadStatus.NEW,
        };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues,
  });

  const notesValue = watch('notes') || '';

  const handleFormSubmit = async (data: LeadFormData) => {
    const transformedData =
      mode === 'create'
        ? formDataToCreateRequest(data)
        : formDataToUpdateRequest(data);

    await onSubmit(transformedData);
  };

  const handleCancelClick = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  // Prepare vehicle options
  const vehicleOptions = vehicles.map((vehicle) => ({
    value: vehicle.id,
    label: `${vehicle.year} ${vehicle.make} ${vehicle.model}${
      vehicle.trim ? ` ${vehicle.trim}` : ''
    }`,
  }));

  // Prepare user options
  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.firstName} ${user.lastName}`,
  }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6">
      {/* Customer Information Section */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div className="md:col-span-2">
            <Label htmlFor="customerName" required>
              Customer Name
            </Label>
            <Input
              id="customerName"
              {...register('customerName')}
              error={errors.customerName?.message}
              placeholder="John Doe"
              disabled={isSubmitting}
            />
          </div>

          {/* Customer Email */}
          <div>
            <Label htmlFor="customerEmail" optional>
              Customer Email
            </Label>
            <Input
              id="customerEmail"
              type="email"
              {...register('customerEmail')}
              error={errors.customerEmail?.message}
              placeholder="john.doe@example.com"
              disabled={isSubmitting}
            />
          </div>

          {/* Customer Phone */}
          <div>
            <Label htmlFor="customerPhone" optional>
              Customer Phone
            </Label>
            <Input
              id="customerPhone"
              type="tel"
              {...register('customerPhone')}
              error={errors.customerPhone?.message}
              placeholder="(555) 555-5555"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </section>

      {/* Lead Details Section */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Lead Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source */}
          <div>
            <Label htmlFor="source" optional>
              Source
            </Label>
            <Select
              id="source"
              {...register('source')}
              error={errors.source?.message}
              options={[
                { value: '', label: 'Select source' },
                { value: LeadSource.WEBSITE, label: 'Website' },
                { value: LeadSource.PHONE, label: 'Phone' },
                { value: LeadSource.WALK_IN, label: 'Walk-in' },
                { value: LeadSource.REFERRAL, label: 'Referral' },
                { value: LeadSource.SOCIAL_MEDIA, label: 'Social Media' },
                { value: LeadSource.OTHER, label: 'Other' },
              ]}
              disabled={isSubmitting}
            />
          </div>

          {/* Vehicle Interest */}
          <div>
            <Label htmlFor="vehicleInterestId" optional>
              Vehicle Interest
            </Label>
            <Select
              id="vehicleInterestId"
              {...register('vehicleInterestId')}
              error={errors.vehicleInterestId?.message}
              options={[
                { value: '', label: 'None' },
                ...vehicleOptions,
              ]}
              disabled={isSubmitting || isLoadingVehicles}
            />
            {isLoadingVehicles && (
              <p className="text-xs text-neutral-500 mt-1">Loading vehicles...</p>
            )}
          </div>

          {/* Assigned To */}
          <div>
            <Label htmlFor="assignedToId" optional>
              Assigned To
            </Label>
            <Select
              id="assignedToId"
              {...register('assignedToId')}
              error={errors.assignedToId?.message}
              options={[
                { value: '', label: 'Unassigned' },
                ...userOptions,
              ]}
              disabled={isSubmitting || isLoadingUsers}
            />
            {isLoadingUsers && (
              <p className="text-xs text-neutral-500 mt-1">Loading users...</p>
            )}
          </div>

          {/* Status (only in edit mode) */}
          {mode === 'edit' && (
            <div>
              <Label htmlFor="status" optional>
                Status
              </Label>
              <Select
                id="status"
                {...register('status')}
                error={errors.status?.message}
                options={[
                  { value: LeadStatus.NEW, label: 'New' },
                  { value: LeadStatus.CONTACTED, label: 'Contacted' },
                  { value: LeadStatus.QUALIFIED, label: 'Qualified' },
                  { value: LeadStatus.CONVERTED, label: 'Converted' },
                  { value: LeadStatus.LOST, label: 'Lost' },
                ]}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>
      </section>

      {/* Notes Section */}
      <section>
        <h3 className="text-lg font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-200">
          Notes
        </h3>
        <div>
          <Label htmlFor="notes" optional>
            Notes
          </Label>
          <Textarea
            id="notes"
            {...register('notes')}
            error={!!errors.notes}
            placeholder="Add any additional notes about this lead..."
            disabled={isSubmitting}
            className="min-h-[100px]"
            maxLength={1000}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-error-600">{errors.notes.message}</p>
          )}
          <p className="text-xs text-neutral-500 mt-1">
            {notesValue.length}/1000 characters
          </p>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelClick}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : mode === 'create' ? (
            'Create Lead'
          ) : (
            'Update Lead'
          )}
        </Button>
      </div>
    </form>
  );
}
