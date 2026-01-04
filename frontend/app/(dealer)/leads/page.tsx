'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button/Button';
import { useLeads, useDeleteLead } from '@/lib/hooks/api/use-leads';
import { useUsers } from '@/lib/hooks/api/use-users';
import { LeadCard } from '@/components/features/leads/LeadCard';
import { LeadFilters } from '@/components/features/leads/LeadFilters';
import { LeadEmptyState } from '@/components/features/leads/LeadEmptyState';
import { LeadSkeleton } from '@/components/features/leads/LeadSkeleton';
import { LeadAssignModal } from '@/components/features/leads/LeadAssignModal';
import { LeadConvertModal } from '@/components/features/leads/LeadConvertModal';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@/components/ui/modal/Modal';
import { FeatureErrorBoundary } from '@/components/error/FeatureErrorBoundary';
import { useToast } from '@/lib/hooks/useToast';
import type { LeadWithRelations } from '@shared/types';

function LeadsPageContent() {
  const router = useRouter();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<LeadWithRelations | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<LeadWithRelations | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<LeadWithRelations | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: '',
    assignedToId: '',
  });

  // Fetch data
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const deleteLead = useDeleteLead();

  // Client-side filtering
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.customerName?.toLowerCase().includes(searchLower) ||
          lead.customerEmail?.toLowerCase().includes(searchLower) ||
          lead.customerPhone?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && lead.status !== filters.status) {
        return false;
      }

      // Source filter
      if (filters.source && lead.source !== filters.source) {
        return false;
      }

      // Assigned to filter
      if (filters.assignedToId) {
        if (filters.assignedToId === 'unassigned') {
          if (lead.assignedToId !== null) return false;
        } else if (lead.assignedToId !== filters.assignedToId) {
          return false;
        }
      }

      return true;
    });
  }, [leads, filters]);

  // Handlers
  const handleAddLead = () => {
    router.push('/leads/new');
  };

  const handleViewLead = (id: string) => {
    router.push(`/leads/${id}`);
  };

  const handleEditLead = (id: string) => {
    router.push(`/leads/${id}/edit`);
  };

  const handleDeleteClick = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setLeadToDelete(lead);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;

    try {
      await deleteLead.mutateAsync(leadToDelete.id);
      toast.success('Lead deleted successfully');
      setDeleteModalOpen(false);
      setLeadToDelete(null);
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead. Please try again.');
    }
  };

  const handleAssignClick = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setLeadToAssign(lead);
      setAssignModalOpen(true);
    }
  };

  const handleConvertClick = (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      setLeadToConvert(lead);
      setConvertModalOpen(true);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      source: '',
      assignedToId: '',
    });
  };

  const isLoading = leadsLoading || usersLoading;
  const hasFilters = Object.values(filters).some((value) => value !== '');
  const hasResults = filteredLeads.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-neutral-900">Leads</h1>
            <Button
              onClick={handleAddLead}
              leftIcon={<Plus className="w-5 h-5" />}
              disabled={isLoading}
            >
              Add Lead
            </Button>
          </div>
          <p className="text-neutral-600">
            Manage your sales leads and track your pipeline
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <LeadFilters
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={handleClearFilters}
            users={users}
            isLoading={isLoading}
          />
        </div>

        {/* View toggle and results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-neutral-600">
            {isLoading ? (
              'Loading leads...'
            ) : hasFilters ? (
              <>
                <span className="font-semibold">{filteredLeads.length}</span> lead
                {filteredLeads.length !== 1 ? 's' : ''} found
              </>
            ) : (
              <>
                <span className="font-semibold">{leads.length}</span> total lead
                {leads.length !== 1 ? 's' : ''}
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              disabled={isLoading}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              disabled={isLoading}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Leads grid/list */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            <LeadSkeleton viewMode={viewMode} count={8} />
          </div>
        ) : !hasResults ? (
          hasFilters ? (
            <LeadEmptyState type="no-results" onClearFilters={handleClearFilters} />
          ) : (
            <LeadEmptyState type="no-leads" onAddLead={handleAddLead} />
          )
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }
          >
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                viewMode={viewMode}
                onView={handleViewLead}
                onEdit={handleEditLead}
                onDelete={handleDeleteClick}
                onAssign={handleAssignClick}
              />
            ))}
          </div>
        )}
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
              {leadToDelete && (
                <p className="text-sm text-neutral-600 mb-3">
                  <strong>{leadToDelete.customerName || 'Unnamed Lead'}</strong>
                  <br />
                  {leadToDelete.customerEmail && `Email: ${leadToDelete.customerEmail}`}
                </p>
              )}
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
        lead={leadToAssign}
        onAssignSuccess={() => {
          setAssignModalOpen(false);
          setLeadToAssign(null);
        }}
      />

      {/* Convert Lead Modal */}
      <LeadConvertModal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        lead={leadToConvert}
        onConvertSuccess={(dealId) => {
          setConvertModalOpen(false);
          setLeadToConvert(null);
          router.push(`/deals/${dealId}`);
        }}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <FeatureErrorBoundary featureName="Lead Management">
      <LeadsPageContent />
    </FeatureErrorBoundary>
  );
}
