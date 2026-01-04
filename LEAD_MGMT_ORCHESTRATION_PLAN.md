# Lead Management UI - Orchestration Plan

**Feature:** Lead Management UI Implementation
**Status:** Awaiting Approval
**Created:** 2025-12-31

---

## 🎯 Objective

Implement a complete Lead Management UI with:
- List view with filtering and sorting
- Create/edit lead forms
- Lead detail view with timeline
- Lead assignment to users
- Lead conversion to deals
- Full integration with existing backend APIs

---

## 📋 Multi-Agent Orchestration Workflow

### Phase 1: Discovery & Context Gathering
**Agent:** `researcher`
**Purpose:** Understand existing patterns and gather context
**Duration:** ~5 minutes

**Tasks:**
1. Analyze existing CRUD page patterns:
   - `/frontend/app/(dealer)/vehicles/` - Vehicle list, detail, edit, new
   - `/frontend/app/(dealer)/customers/` - Customer list, detail, edit, new
   - `/frontend/app/(dealer)/bookings/` - Booking list, detail, new
2. Identify reusable components:
   - `PageHeader`, `Table`, `Card`, `Button`, `Form` components
   - Modal patterns
   - Badge/status components
3. Review API client patterns:
   - How hooks are structured (e.g., `useVehicles`, `useCustomers`)
   - Mutation patterns with React Query
   - Error handling approaches
4. Examine form validation patterns:
   - `react-hook-form` + `zod` usage
   - Validation schema structure
5. Study existing type definitions:
   - Shared types structure in `/shared/types/`
   - DTO patterns

**Output:**
- Summary document of patterns to follow
- List of reusable components identified
- Example code references for consistency

**Why This Agent:**
- Read-only exploration prevents accidental changes
- Designed to gather facts and patterns
- Provides foundation for accurate planning

---

### Phase 2: Implementation Planning
**Agent:** `planner`
**Purpose:** Create detailed, actionable implementation plan
**Duration:** ~10 minutes

**Tasks:**
1. Design file structure:
   - Page locations and routing
   - Component organization
   - Hook locations
   - Type definition placement
2. Break down implementation into phases:
   - Phase A: Types and API hooks
   - Phase B: Core components (LeadList, LeadForm)
   - Phase C: Pages (list, new, detail, edit)
   - Phase D: Advanced features (assign, convert modals)
3. Identify dependencies:
   - What needs to be built first
   - Integration points with existing code
   - Backend API contract verification
4. Plan risk mitigation:
   - What could go wrong
   - How to validate each step
   - Rollback strategy
5. Define test strategy:
   - Unit test requirements
   - E2E test scenarios
   - Test data requirements

**Output:**
- Detailed implementation plan document
- File tree showing all new files
- Step-by-step implementation sequence
- Risk assessment
- Test plan

**Why This Agent:**
- Specialized in software architecture
- Considers trade-offs and risks
- Produces actionable, scoped plans
- Ensures we think through the entire feature before coding

---

### Phase 3: Foundation - Types & Hooks
**Agent:** `code-writer`
**Purpose:** Implement shared types and API hooks
**Duration:** ~15 minutes

**Tasks:**
1. Create shared type definitions:
   - `/shared/types/lead.types.ts`
     - `Lead` interface matching backend model
     - `CreateLeadDto`, `UpdateLeadDto`
     - `AssignLeadDto`, `ConvertLeadDto`
     - `LeadQueryDto` for filtering
     - `LeadStatus` enum/union type
     - `LeadSource` enum/union type
2. Implement API hooks in `/frontend/lib/hooks/api/`:
   - `use-leads.ts` - List leads with query params
   - `use-lead.ts` - Get single lead by ID
   - `use-create-lead.ts` - Create lead mutation
   - `use-update-lead.ts` - Update lead mutation
   - `use-delete-lead.ts` - Delete lead mutation
   - `use-assign-lead.ts` - Assign lead mutation
   - `use-convert-lead.ts` - Convert lead mutation
3. Add Zod validation schemas:
   - `/frontend/lib/validations/lead.validation.ts`
   - Form validation for create/update
   - Query param validation
4. Update API client if needed:
   - Ensure endpoints are correctly configured

**Output:**
- All type definitions
- All API hooks with React Query integration
- Validation schemas
- Unit tests for validation logic

**Why This Agent:**
- Writes production-ready code
- Follows existing patterns
- Includes tests and validation
- Foundation for all UI work

---

### Phase 4: Core Components
**Agent:** `code-writer`
**Purpose:** Build reusable components
**Duration:** ~20 minutes

**Tasks:**
1. Status & Display Components:
   - `/frontend/components/features/leads/LeadStatusBadge.tsx`
     - Color-coded badges for: new, contacted, qualified, converted, lost
   - `/frontend/components/features/leads/LeadSourceBadge.tsx`
     - Display lead source (website, phone, walk_in)
2. List Component:
   - `/frontend/components/features/leads/LeadList.tsx`
     - Table with columns: customer name, email, phone, status, source, assigned to, created date
     - Row actions: view, edit, delete, assign, convert
     - Sorting support
     - Loading and empty states
3. Filter Component:
   - `/frontend/components/features/leads/LeadFilters.tsx`
     - Filter by status (multi-select)
     - Filter by source
     - Filter by assigned user
     - Clear filters button
4. Form Component:
   - `/frontend/components/features/leads/LeadForm.tsx`
     - Customer info fields (or link to existing customer)
     - Vehicle interest selector
     - Source dropdown
     - Notes textarea
     - Form validation with error display
     - Loading states during submission

**Output:**
- All core components
- Component tests (Vitest)
- Storybook stories (if applicable)
- TypeScript types for props

**Why This Agent:**
- Maintains consistency with existing patterns
- Writes tested, reusable code
- Handles edge cases properly

---

### Phase 5: Modal Components
**Agent:** `code-writer`
**Purpose:** Build action modals
**Duration:** ~15 minutes

**Tasks:**
1. Assignment Modal:
   - `/frontend/components/features/leads/LeadAssignModal.tsx`
     - User selector dropdown
     - Confirm/cancel buttons
     - Loading state during assignment
     - Success/error feedback
2. Convert Modal:
   - `/frontend/components/features/leads/LeadConvertModal.tsx`
     - Show lead details
     - Deal value input
     - Notes field
     - Create deal and update lead status
     - Navigate to new deal on success
3. Delete Confirmation Modal:
   - Reuse existing confirmation pattern or create specific one
   - Show lead info before deletion
   - Confirm/cancel

**Output:**
- Modal components
- Component tests
- Integration with API hooks

**Why This Agent:**
- Consistent modal patterns
- Proper state management
- Error handling

---

### Phase 6: Pages Implementation
**Agent:** `code-writer`
**Purpose:** Create all page routes
**Duration:** ~25 minutes

**Tasks:**
1. Lead List Page:
   - `/frontend/app/(dealer)/leads/page.tsx`
     - Page header with "New Lead" button
     - Lead filters sidebar/panel
     - Lead list component
     - Pagination if needed
     - Loading/error states
2. New Lead Page:
   - `/frontend/app/(dealer)/leads/new/page.tsx`
     - Page header
     - LeadForm component
     - Navigate to lead detail on success
3. Lead Detail Page:
   - `/frontend/app/(dealer)/leads/[id]/page.tsx`
     - Lead information display
     - Customer details (link to customer page if exists)
     - Vehicle interest (link to vehicle page)
     - Status timeline/history
     - Action buttons: Edit, Assign, Convert, Delete
     - Notes section
4. Edit Lead Page:
   - `/frontend/app/(dealer)/leads/[id]/edit/page.tsx`
     - Pre-populated LeadForm
     - Navigate back to detail on success
5. Route Integration:
   - Update navigation menu to include Leads link
   - Ensure proper auth protection

**Output:**
- All page files
- Proper routing configuration
- Navigation integration
- Auth guards applied

**Why This Agent:**
- Maintains Next.js App Router patterns
- Proper data fetching with React Query
- Consistent layout and navigation

---

### Phase 7: E2E Testing
**Agent:** `test-writer`
**Purpose:** Create comprehensive E2E tests
**Duration:** ~20 minutes

**Tasks:**
1. Test Setup:
   - `/e2e-tests/specs/leads.spec.ts`
   - Create test fixtures for lead data
   - Set up authentication
2. Test Scenarios:
   - **Lead Creation:**
     - Navigate to new lead page
     - Fill form with valid data
     - Submit and verify redirect to detail page
     - Verify lead appears in list
   - **Lead List & Filtering:**
     - Create multiple leads with different statuses
     - Test status filter
     - Test source filter
     - Test search functionality
   - **Lead Assignment:**
     - Open assign modal
     - Select user
     - Verify assignment success
     - Verify lead shows assigned user
   - **Lead Conversion:**
     - Open convert modal
     - Fill deal details
     - Convert lead
     - Verify navigation to deal page
     - Verify lead status updated to "converted"
   - **Lead Edit:**
     - Navigate to edit page
     - Update fields
     - Save and verify changes
   - **Lead Delete:**
     - Open delete confirmation
     - Confirm deletion
     - Verify lead removed from list
   - **Validation:**
     - Test required field validation
     - Test email format validation
     - Test error messages display
3. Edge Cases:
   - Loading states
   - Error handling (API failures)
   - Empty states
   - Concurrent edits

**Output:**
- Complete E2E test suite
- Test fixtures and helpers
- All tests passing
- Test coverage report

**Why This Agent:**
- Specialized in test creation
- Understands Playwright patterns
- Writes clear, maintainable tests
- Ensures comprehensive coverage

---

### Phase 8: Code Review
**Agent:** `code-reviewer`
**Purpose:** Staff-level review for quality assurance
**Duration:** ~10 minutes

**Tasks:**
1. Review for correctness:
   - Component logic correctness
   - API integration accuracy
   - Data flow validation
   - State management review
2. Security checks:
   - Input validation completeness
   - XSS prevention
   - Auth guard verification
   - Data leakage prevention
3. Performance review:
   - Unnecessary re-renders
   - Memoization opportunities
   - Bundle size impact
   - Query optimization
4. Maintainability:
   - Code consistency with existing patterns
   - Proper TypeScript usage
   - Component reusability
   - Clear naming conventions
5. Accessibility:
   - Keyboard navigation
   - ARIA labels
   - Form accessibility
   - Color contrast

**Output:**
- Code review report
- List of issues found (if any)
- Recommendations for improvements
- Approval or revision requests

**Why This Agent:**
- Staff-level expertise
- Catches issues early
- Ensures production readiness
- Maintains code quality standards

---

### Phase 9: Refinement (if needed)
**Agent:** `code-writer`
**Purpose:** Address code review feedback
**Duration:** ~10 minutes (only if issues found)

**Tasks:**
- Fix any issues identified in code review
- Implement recommended improvements
- Re-run tests to ensure fixes don't break anything
- Update documentation if needed

**Output:**
- All review issues resolved
- Tests still passing
- Clean, production-ready code

**Why This Agent:**
- Same agent that wrote the code
- Maintains context and consistency
- Quick iteration

---

### Phase 10: Documentation
**Agent:** `documentation-writer`
**Purpose:** Create user and developer documentation
**Duration:** ~10 minutes

**Tasks:**
1. User Documentation:
   - How to create and manage leads
   - How to assign leads to team members
   - How to convert leads to deals
   - Lead status workflow explanation
2. Developer Documentation:
   - Component API documentation
   - Hook usage examples
   - Integration guide for future features
   - Type definitions reference
3. Update Existing Docs:
   - Update TODO.md to mark Lead Management as complete
   - Update README.md if needed
   - Add API endpoint documentation

**Output:**
- Complete documentation
- Updated project docs
- Code comments where needed
- Usage examples

**Why This Agent:**
- Specialized in documentation
- Ensures docs match implementation
- Clear, concise writing

---

## 📊 Implementation Summary

### Total Phases: 10
### Estimated Duration: ~2.5 hours
### Agents Used: 5 specialized agents

**Agent Breakdown:**
1. **researcher** (1x) - Discovery
2. **planner** (1x) - Planning
3. **code-writer** (4x) - Implementation phases
4. **test-writer** (1x) - Testing
5. **code-reviewer** (1x) - Quality assurance
6. **documentation-writer** (1x) - Documentation

---

## 🎯 Success Criteria

Before marking this feature as complete, we must verify:

- [ ] All pages accessible via navigation
- [ ] CRUD operations work correctly
- [ ] Filtering and sorting functional
- [ ] Lead assignment works
- [ ] Lead conversion creates deal
- [ ] All E2E tests passing
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Consistent with existing UI patterns

---

## 🔄 Rollback Strategy

If issues arise during implementation:

1. **Git commits per phase** - Each phase gets its own commit
2. **Feature flag** (optional) - Hide Leads menu item until ready
3. **Incremental deployment** - Can deploy foundation without full UI
4. **Easy revert** - Each phase is independently revertable

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Backend API mismatch | Low | High | Validate API contracts in Phase 2 |
| Pattern inconsistency | Medium | Medium | Researcher phase ensures pattern alignment |
| Performance issues | Low | Medium | Code review includes performance check |
| Test flakiness | Medium | Low | Test-writer follows existing stable patterns |
| TypeScript errors | Low | Medium | Progressive type checking per phase |

---

## 📦 Deliverables

### Code
- 4 new pages
- 8+ new components
- 7 API hooks
- Type definitions
- Validation schemas

### Tests
- E2E test suite with 10+ scenarios
- Component unit tests
- Hook tests

### Documentation
- User guide
- Developer docs
- Updated project docs

---

## 🤔 Decision Points

Before starting, please confirm:

1. **Agent orchestration approach** - Do you approve this multi-agent workflow?
2. **Implementation order** - Should we follow phases 1-10 as outlined?
3. **Scope adjustments** - Any features to add/remove from initial scope?
4. **Review gates** - Should I pause for your review after specific phases?
5. **Testing approach** - Is E2E testing after implementation acceptable, or prefer TDD?

---

## 🚀 Next Steps (Upon Approval)

1. You approve this plan
2. I execute Phase 1 (researcher)
3. I execute Phase 2 (planner)
4. I share the detailed plan from Phase 2 for your review
5. Upon approval, proceed with implementation phases
6. Provide progress updates after each phase
7. Final review and delivery

---

**Awaiting your approval to proceed with this orchestration plan.**
