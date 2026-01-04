# Lead Components

This directory contains all React components related to lead management.

## Components

### LeadAssignModal

Modal for assigning a lead to a team member.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal closes
- `lead: LeadWithRelations | null` - The lead to assign
- `onAssignSuccess?: () => void` - Optional callback on successful assignment

**Features:**
- User search/filter
- Radio button selection
- Highlights current assignee
- Toast notifications
- Loading states

**Example:**
```tsx
import { LeadAssignModal } from '@/components/features/leads';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);

  return (
    <>
      <button onClick={() => {
        setSelectedLead(lead);
        setIsOpen(true);
      }}>
        Assign Lead
      </button>

      <LeadAssignModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lead={selectedLead}
        onAssignSuccess={() => {
          // Refresh leads list or show success message
        }}
      />
    </>
  );
}
```

---

### LeadConvertModal

Modal for converting a lead to a deal.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal closes
- `lead: LeadWithRelations | null` - The lead to convert
- `onConvertSuccess?: (dealId: string) => void` - Optional callback with deal ID on success

**Features:**
- Form validation with zod
- Automatic dollar to cents conversion
- Vehicle dropdown (filtered to available vehicles)
- Optional notes field
- Toast notifications
- Navigation to deal page or custom callback

**Example:**
```tsx
import { LeadConvertModal } from '@/components/features/leads';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);

  return (
    <>
      <button onClick={() => {
        setSelectedLead(lead);
        setIsOpen(true);
      }}>
        Convert to Deal
      </button>

      <LeadConvertModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lead={selectedLead}
        onConvertSuccess={(dealId) => {
          // Custom handling, or let it navigate automatically
          console.log('Deal created:', dealId);
        }}
      />
    </>
  );
}
```

---

### Other Components

- **LeadCard** - Display lead information in card format
- **LeadEmptyState** - Empty state when no leads exist
- **LeadFilters** - Filter controls for lead list
- **LeadForm** - Create/edit lead form
- **LeadSkeleton** - Loading skeleton for lead cards
- **LeadSourceBadge** - Badge showing lead source
- **LeadStatusBadge** - Badge showing lead status
