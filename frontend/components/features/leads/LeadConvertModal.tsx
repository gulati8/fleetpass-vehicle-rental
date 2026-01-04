'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';
import { Button } from '@/components/ui/button/Button';
import { Input } from '@/components/ui/input/Input';
import { Select } from '@/components/ui/select/Select';
import { Label } from '@/components/ui/label/Label';
import { Textarea } from '@/components/ui/textarea/Textarea';
import { useVehicles } from '@/lib/hooks/api/use-vehicles';
import { useConvertLead } from '@/lib/hooks/api/use-leads';
import { useToast } from '@/lib/hooks/useToast';
import type { LeadWithRelations } from '@shared/types';

// Validation schema
const convertLeadSchema = z.object({
  dealValue: z
    .string()
    .min(1, 'Deal value is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Deal value must be a positive number',
    }),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  notes: z.string().optional(),
});

type ConvertLeadFormData = z.infer<typeof convertLeadSchema>;

interface LeadConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadWithRelations | null;
  onConvertSuccess?: (dealId: string) => void;
}

export function LeadConvertModal({
  isOpen,
  onClose,
  lead,
  onConvertSuccess,
}: LeadConvertModalProps) {
  const toast = useToast();
  const router = useRouter();
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles({
    isAvailableForRent: true,
  });
  const convertLead = useConvertLead();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConvertLeadFormData>({
    resolver: zodResolver(convertLeadSchema),
    defaultValues: {
      dealValue: '',
      vehicleId: '',
      notes: '',
    },
  });

  // Reset form when modal closes
  const handleClose = () => {
    reset();
    onClose();
  };

  // Handle form submission
  const onSubmit = async (data: ConvertLeadFormData) => {
    if (!lead) return;

    try {
      // Convert dollars to cents
      const dealValueCents = Math.round(Number(data.dealValue) * 100);

      const result = await convertLead.mutateAsync({
        id: lead.id,
        dealValueCents,
        vehicleId: data.vehicleId,
        notes: data.notes || undefined,
      });

      toast.success('Lead converted to deal successfully');

      // Call success callback or navigate to deal page
      if (onConvertSuccess && result.deal?.id) {
        onConvertSuccess(result.deal.id);
      } else if (result.deal?.id) {
        router.push(`/deals/${result.deal.id}`);
      }

      handleClose();
    } catch (error) {
      toast.error('Failed to convert lead. Please try again.');
    }
  };

  // Get display name and email for customer
  const customerName = lead?.customerName || lead?.customer
    ? `${lead.customer?.firstName} ${lead.customer?.lastName}`
    : 'Unknown';
  const customerEmail =
    lead?.customerEmail || lead?.customer?.email || 'No email provided';

  // Format status for display
  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <ModalTitle>Convert Lead to Deal</ModalTitle>
            <ModalDescription>
              Create a new deal from this lead
            </ModalDescription>
          </div>
          <ModalCloseButton onClose={handleClose} />
        </div>
      </ModalHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody>
          <div className="space-y-6">
            {/* Lead Summary */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-neutral-700">
                  Converting Lead:
                </p>
                <p className="text-base font-semibold text-neutral-900">
                  {customerName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-neutral-500">Email:</span>
                  <p className="text-neutral-900 truncate">{customerEmail}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Current Status:</span>
                  <p className="text-neutral-900">{formatStatus(lead?.status)}</p>
                </div>
              </div>
            </div>

            {/* Deal Value Input */}
            <div>
              <Label htmlFor="dealValue">
                Deal Value ($) <span className="text-error-600">*</span>
              </Label>
              <Input
                id="dealValue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('dealValue')}
                error={errors.dealValue?.message}
                disabled={convertLead.isPending}
              />
              {errors.dealValue && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.dealValue.message}
                </p>
              )}
            </div>

            {/* Vehicle Select */}
            <div>
              <Label htmlFor="vehicleId">
                Vehicle <span className="text-error-600">*</span>
              </Label>
              {isLoadingVehicles ? (
                <div className="h-10 animate-pulse bg-neutral-200 rounded-lg" />
              ) : (
                <Select
                  id="vehicleId"
                  {...register('vehicleId')}
                  options={[
                    ...vehicles.map((vehicle) => ({
                      value: vehicle.id,
                      label: `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.vin}`,
                    })),
                  ]}
                  placeholder="Select vehicle"
                  error={errors.vehicleId?.message}
                  disabled={convertLead.isPending}
                />
              )}
              {errors.vehicleId && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.vehicleId.message}
                </p>
              )}
            </div>

            {/* Notes Textarea */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Add any additional notes about this deal..."
                {...register('notes')}
                disabled={convertLead.isPending}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={convertLead.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={convertLead.isPending}
            disabled={convertLead.isPending}
          >
            Convert to Deal
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
