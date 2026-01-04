'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardContent } from '@/components/ui/card/Card';
import { LeadForm } from '@/components/features/leads/LeadForm';
import { useCreateLead } from '@/lib/hooks/api/use-leads';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import { useToast } from '@/lib/hooks/useToast';
import type { CreateLeadRequest } from '@shared/types';

function NewLeadPageContent() {
  const router = useRouter();
  const toast = useToast();
  const createLead = useCreateLead();

  const handleSubmit = async (data: CreateLeadRequest) => {
    try {
      const result = await createLead.mutateAsync(data);
      toast.success('Lead created successfully');
      router.push(`/leads/${result.id}`);
    } catch (error: any) {
      console.error('Failed to create lead:', error);
      const errorMessage =
        error?.response?.data?.message || 'Failed to create lead. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push('/leads');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leads')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          Back to Leads
        </Button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Create Lead</h1>
          <p className="text-neutral-600">
            Add a new lead to track potential customers
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardContent className="p-6 md:p-8">
            <LeadForm
              mode="create"
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={createLead.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NewLeadPage() {
  return (
    <FeatureErrorBoundary featureName="Create Lead">
      <NewLeadPageContent />
    </FeatureErrorBoundary>
  );
}
