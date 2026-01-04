'use client';

import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { LeadForm } from '@/components/features/leads/LeadForm';
import { useLead, useUpdateLead } from '@/lib/hooks/api/use-leads';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import { useToast } from '@/lib/hooks/useToast';
import type { UpdateLeadRequest } from '@shared/types';

function EditLeadPageContent() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  const toast = useToast();

  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const updateLead = useUpdateLead();

  const handleSubmit = async (data: UpdateLeadRequest) => {
    try {
      await updateLead.mutateAsync({ id: leadId, ...data });
      toast.success('Lead updated successfully');
      router.push(`/leads/${leadId}`);
    } catch (error: any) {
      console.error('Failed to update lead:', error);
      const errorMessage =
        error?.response?.data?.message || 'Failed to update lead. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push(`/leads/${leadId}`);
  };

  // Loading state
  if (leadLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading lead...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!lead) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Lead not found</h2>
          <p className="text-neutral-600 mb-6">
            The lead you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/leads')}>Back to Leads</Button>
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
          size="sm"
          onClick={() => router.push(`/leads/${leadId}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Lead
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Edit Lead</h1>
          <p className="text-neutral-600">
            Update lead information and status
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            {lead.customerName || 'Unnamed Lead'}
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <LeadForm
              mode="edit"
              initialData={lead}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={updateLead.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditLeadPage() {
  return (
    <FeatureErrorBoundary featureName="Edit Lead">
      <EditLeadPageContent />
    </FeatureErrorBoundary>
  );
}
