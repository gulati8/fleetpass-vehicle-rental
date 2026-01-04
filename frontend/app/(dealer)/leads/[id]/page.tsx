'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  UserCheck,
  Calendar,
  Tag,
  FileText,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card/Card';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';
import { useLead, useDeleteLead, useUpdateLead } from '@/lib/hooks/api/use-leads';
import { LeadStatusBadge } from '@/components/features/leads/LeadStatusBadge';
import { LeadSourceBadge } from '@/components/features/leads/LeadSourceBadge';
import { LeadAssignModal } from '@/components/features/leads/LeadAssignModal';
import { LeadConvertModal } from '@/components/features/leads/LeadConvertModal';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import { useToast } from '@/lib/hooks/useToast';
import { LeadStatus } from '@shared/types';

function LeadDetailPageContent() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const { data: lead, isLoading: leadLoading } = useLead(leadId);
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();

  const handleEdit = () => {
    router.push(`/leads/${leadId}/edit`);
  };

  const handleDeleteClick = () => {
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteLead.mutateAsync(leadId);
      toast.success('Lead deleted successfully');
      router.push('/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead. Please try again.');
    }
  };

  const handleMarkAsLost = async () => {
    if (!lead) return;

    const confirmed = window.confirm(
      'Are you sure you want to mark this lead as lost? This cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await updateLead.mutateAsync({
        id: leadId,
        status: LeadStatus.LOST,
      });
      toast.success('Lead marked as lost');
    } catch (error) {
      console.error('Failed to update lead status:', error);
      toast.error('Failed to update lead status. Please try again.');
    }
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

  const displayName = lead.customerName || 'Unnamed Lead';
  const displayEmail = lead.customerEmail || 'No email';
  const displayPhone = lead.customerPhone || 'No phone';
  const assignedName = lead.assignedTo
    ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
    : 'Unassigned';
  const createdDate = new Date(lead.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                {displayName}
              </h1>
              <div className="flex items-center gap-3">
                <LeadStatusBadge status={lead.status} size="lg" />
                {lead.source && <LeadSourceBadge source={lead.source} size="lg" />}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleEdit}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeleteClick}
                aria-label="Delete"
                className="text-error-600 hover:text-error-700 hover:bg-error-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left column - Customer Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Name</p>
                    <p className="font-medium text-neutral-900">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-neutral-400" />
                      <p className="text-neutral-900">{displayEmail}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-neutral-400" />
                      <p className="text-neutral-900">{displayPhone}</p>
                    </div>
                  </div>
                  {!lead.customerId && (
                    <div className="pt-4 border-t border-neutral-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push('/customers/new')}
                      >
                        Create Customer Profile
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Lead Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Lead Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Source</p>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-neutral-400" />
                      <p className="font-medium text-neutral-900 capitalize">
                        {lead.source || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Assigned To</p>
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-neutral-400" />
                      <p className="font-medium text-neutral-900">{assignedName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Created Date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-neutral-400" />
                      <p className="font-medium text-neutral-900">{createdDate}</p>
                    </div>
                  </div>
                  {lead.createdBy && (
                    <div className="col-span-2">
                      <p className="text-sm text-neutral-500 mb-1">Created By</p>
                      <p className="font-medium text-neutral-900">
                        {lead.createdBy.firstName} {lead.createdBy.lastName}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes Section */}
        {lead.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700 whitespace-pre-wrap">{lead.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() => setAssignModalOpen(true)}
                leftIcon={<UserCheck className="w-4 h-4" />}
              >
                Assign to User
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConvertModalOpen(true)}
                disabled={lead.status === LeadStatus.CONVERTED || lead.status === LeadStatus.LOST}
              >
                Convert to Deal
              </Button>
              <Button
                variant="outline"
                onClick={handleMarkAsLost}
                disabled={
                  lead.status === LeadStatus.CONVERTED ||
                  lead.status === LeadStatus.LOST ||
                  updateLead.isPending
                }
                className="text-neutral-700"
              >
                Mark as Lost
              </Button>
            </div>
          </CardContent>
        </Card>
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
              <ModalTitle>Delete Lead</ModalTitle>
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
                Are you sure you want to delete this lead?
              </p>
              <p className="text-sm text-neutral-600 mb-3">
                <strong>{displayName}</strong>
                <br />
                {lead.customerEmail && `Email: ${lead.customerEmail}`}
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
            disabled={deleteLead.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDeleteConfirm}
            isLoading={deleteLead.isPending}
            className="bg-error-600 hover:bg-error-700"
          >
            {deleteLead.isPending ? 'Deleting...' : 'Delete Lead'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Assign Lead Modal */}
      <LeadAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        lead={lead}
        onAssignSuccess={() => setAssignModalOpen(false)}
      />

      {/* Convert Lead Modal */}
      <LeadConvertModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        lead={lead}
        onConvertSuccess={(dealId) => {
          setConvertModalOpen(false);
          router.push(`/deals/${dealId}`);
        }}
      />
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <FeatureErrorBoundary featureName="Lead Details">
      <LeadDetailPageContent />
    </FeatureErrorBoundary>
  );
}
