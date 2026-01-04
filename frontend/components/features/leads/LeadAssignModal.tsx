'use client';

import { useState, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
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
import { useUsers } from '@/lib/hooks/api/use-users';
import { useAssignLead } from '@/lib/hooks/api/use-leads';
import { useToast } from '@/lib/hooks/useToast';
import type { LeadWithRelations } from '@shared/types';

interface LeadAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadWithRelations | null;
  onAssignSuccess?: () => void;
}

export function LeadAssignModal({
  isOpen,
  onClose,
  lead,
  onAssignSuccess,
}: LeadAssignModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const toast = useToast();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();
  const assignLead = useAssignLead();

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Reset state when modal closes
  const handleClose = () => {
    setSearchQuery('');
    setSelectedUserId(null);
    onClose();
  };

  // Handle assignment submission
  const handleAssign = async () => {
    if (!lead || !selectedUserId) return;

    try {
      await assignLead.mutateAsync({
        id: lead.id,
        assignedToId: selectedUserId,
      });

      const assignedUser = users.find((u) => u.id === selectedUserId);
      const userName = assignedUser
        ? `${assignedUser.firstName} ${assignedUser.lastName}`
        : 'user';

      toast.success(`Lead assigned to ${userName} successfully`);
      onAssignSuccess?.();
      handleClose();
    } catch (error) {
      toast.error('Failed to assign lead. Please try again.');
    }
  };

  // Get display name for customer
  const customerName = lead?.customerName || lead?.customer
    ? `${lead.customer?.firstName} ${lead.customer?.lastName}`
    : 'Unknown';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <ModalTitle>Assign Lead</ModalTitle>
            <ModalDescription>
              Assign &quot;{customerName}&quot; to a team member
            </ModalDescription>
          </div>
          <ModalCloseButton onClose={handleClose} />
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftAddon={<Search className="h-4 w-4" />}
            />
          </div>

          {/* User List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-neutral-500">
                {searchQuery ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isCurrentAssignment = user.id === lead?.assignedToId;
                const isSelected = user.id === selectedUserId;

                return (
                  <label
                    key={user.id}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="assignee"
                      value={user.id}
                      checked={isSelected}
                      onChange={() => setSelectedUserId(user.id)}
                      className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-900">
                          {user.firstName} {user.lastName}
                        </p>
                        {isCurrentAssignment && (
                          <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{user.email}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={assignLead.isPending}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAssign}
          disabled={!selectedUserId || assignLead.isPending}
          isLoading={assignLead.isPending}
        >
          Assign
        </Button>
      </ModalFooter>
    </Modal>
  );
}
