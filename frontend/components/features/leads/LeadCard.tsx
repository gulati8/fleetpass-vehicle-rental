'use client';

import { UserCircle, Mail, Phone, UserCheck, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card/Card';
import { Button } from '@/components/ui/button/Button';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import { formatPhoneDisplay } from '@/lib/validations/lead.validation';
import type { LeadWithRelations } from '@shared/types';

interface LeadCardProps {
  lead: LeadWithRelations;
  viewMode: 'grid' | 'list';
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string) => void;
}

/**
 * Format date to human-readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LeadCard({
  lead,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onAssign,
}: LeadCardProps) {
  // Display values with fallbacks
  const displayName = lead.customerName || 'Unnamed Lead';
  const displayEmail = lead.customerEmail || 'No email';
  const displayPhone = formatPhoneDisplay(lead.customerPhone);
  const assignedName = lead.assignedTo
    ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
    : 'Unassigned';
  const createdDate = formatDate(lead.createdAt);
  const initials = getInitials(lead.customerName);

  if (viewMode === 'list') {
    return (
      <Card
        hover
        className="transition-all duration-200"
        data-testid="lead-card"
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex-shrink-0 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary-700">
                {initials}
              </span>
            </div>

            {/* Lead info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-4">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1 truncate">
                    {displayName}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-neutral-600">
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{displayEmail}</span>
                    </span>
                    {lead.customerPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        {displayPhone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <LeadStatusBadge status={lead.status} size="sm" />
                  {lead.source && <LeadSourceBadge source={lead.source} size="sm" />}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    {assignedName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {createdDate}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(lead.id)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(lead.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssign(lead.id)}
                  >
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(lead.id)}
                    className="text-error-600 hover:text-error-700 hover:bg-error-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      hover
      className="transition-all duration-200 group"
      data-testid="lead-card"
    >
      <CardContent className="p-0">
        {/* Avatar header */}
        <div className="relative h-32 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
            <span className="text-2xl font-semibold text-primary-700">
              {initials}
            </span>
          </div>

          {/* Status badges overlay */}
          <div className="absolute top-3 right-3 flex gap-2">
            <LeadStatusBadge status={lead.status} size="sm" />
            {lead.source && <LeadSourceBadge source={lead.source} size="sm" />}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Name and email */}
          <div className="text-center">
            <h3 className="font-semibold text-lg text-neutral-900 mb-1 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-neutral-600 truncate flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {displayEmail}
            </p>
          </div>

          {/* Contact and assignment info */}
          <div className="space-y-2 pb-3 border-b border-neutral-200">
            {lead.customerPhone && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-600">
                <Phone className="w-3.5 h-3.5" />
                <span>{displayPhone}</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-600">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{assignedName}</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{createdDate}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onView(lead.id)}
                className="text-xs"
              >
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(lead.id)}
                className="text-xs"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(lead.id)}
                className="text-xs text-error-600 hover:text-error-700 hover:bg-error-50"
              >
                Delete
              </Button>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onAssign(lead.id)}
              className="w-full text-xs"
            >
              Assign Lead
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
