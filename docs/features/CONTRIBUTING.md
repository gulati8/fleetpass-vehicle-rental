# Contributing Features to FleetPass

Welcome! This guide explains how to request new features, understand existing features, and contribute to FleetPass development.

## 📋 Table of Contents

- [Requesting a New Feature](#requesting-a-new-feature)
- [Understanding Existing Features](#understanding-existing-features)
- [Feature Documentation Structure](#feature-documentation-structure)
- [Development Workflow](#development-workflow)
- [Working with Claude Code](#working-with-claude-code)

## 🚀 Requesting a New Feature

### Before You Request

1. **Check Existing Features**: Browse [Feature Documentation](.) to see if similar functionality exists
2. **Search Issues**: Look through [GitHub Issues](../../issues?q=label%3Afeature-request) for duplicate requests
3. **Understand the Product**: Review [CLAUDE.md](../../CLAUDE.md) for architecture context

### How to Submit a Feature Request

1. **Go to Issues**: Navigate to [GitHub Issues](../../issues/new/choose)
2. **Select Template**: Choose "Feature Request"
3. **Fill Out Template**: Complete all required fields:
   - **Feature Area**: Which module this affects (Vehicle, Booking, etc.)
   - **Problem Statement**: What problem are you solving?
   - **Proposed Solution**: How should it work from user perspective?
   - **Acceptance Criteria**: What defines "done"? (use checkboxes)
   - **Priority**: How urgently is this needed?
   - **User Type**: Who benefits from this?

4. **Add Details**: Include mockups, examples, or technical notes if helpful
5. **Submit**: Create the issue - it will be automatically labeled `needs-triage`

### What Happens Next?

```
You submit issue → Auto-labeled "needs-triage"
    ↓
Maintainer reviews (within 48h) → Adds priority label, asks questions
    ↓
Approved → Added to project board → Assigned milestone
    ↓
Development starts → PR linked to issue
    ↓
PR merged → Issue auto-closes → Feature deployed
```

## 📖 Understanding Existing Features

Each feature has **dual-layer documentation**:

### Business Documentation (`README.md`)
**For**: Product managers, stakeholders, QA, new team members

Contains:
- User stories and workflows
- Business rules and validations
- UI/UX details
- Error scenarios
- Testing checklist

📁 **Location**: `docs/features/[feature-name]/README.md`

### Technical Documentation (`TECHNICAL.md`)
**For**: Developers, DevOps engineers, Claude Code agents

Contains:
- Architecture and design patterns
- API endpoints and database schema
- Code structure and key files
- Testing strategy
- Security and performance details
- Troubleshooting guide

📁 **Location**: `docs/features/[feature-name]/TECHNICAL.md`

### Current Features

| Feature | Status | Business Docs | Technical Docs |
|---------|--------|---------------|----------------|
| Authentication | ✅ Production | [README](./authentication/README.md) | [TECHNICAL](./authentication/TECHNICAL.md) |
| Vehicle Management | ✅ Production | [README](./vehicle-management/README.md) | [TECHNICAL](./vehicle-management/TECHNICAL.md) |
| Booking System | ✅ Production | [README](./booking-system/README.md) | [TECHNICAL](./booking-system/TECHNICAL.md) |
| Customer Management | ✅ Production | [README](./customer-management/README.md) | [TECHNICAL](./customer-management/TECHNICAL.md) |
| KYC Integration | ✅ Production | [README](./kyc-integration/README.md) | [TECHNICAL](./kyc-integration/TECHNICAL.md) |
| Payment Processing | ✅ Production | [README](./payment-processing/README.md) | [TECHNICAL](./payment-processing/TECHNICAL.md) |
| Lead Management | ✅ Production | [README](./lead-management/README.md) | [TECHNICAL](./lead-management/TECHNICAL.md) |
| Deal Tracking | ✅ Production | [README](./deal-tracking/README.md) | [TECHNICAL](./deal-tracking/TECHNICAL.md) |
| Location Management | ✅ Production | [README](./location-management/README.md) | [TECHNICAL](./location-management/TECHNICAL.md) |

## 📁 Feature Documentation Structure

When documenting a new feature, follow this structure:

```
docs/features/[feature-name]/
├── README.md              # Business documentation
├── TECHNICAL.md           # Technical documentation
└── diagrams/              # (Optional) Architecture diagrams, user flows
    ├── user-flow.png
    └── architecture.png
```

Use the templates:
- **Business Template**: [_TEMPLATE/README.md](./_TEMPLATE/README.md)
- **Technical Template**: [_TEMPLATE/TECHNICAL.md](./_TEMPLATE/TECHNICAL.md)

## 🔧 Development Workflow

### For Developers Building Features

1. **Start with Documentation**: Read both business and technical docs for context
2. **Create Branch**: `git checkout -b feature/[feature-name]`
3. **Follow Architecture**: Match patterns in [CLAUDE.md](../../CLAUDE.md)
4. **Write Tests**: Unit → Integration → E2E (see [Testing Guide](../testing/))
5. **Update Docs**: Update technical docs as you build
6. **Create PR**: Link to original feature request issue

### Testing Requirements

All features must have:
- ✅ **Unit Tests**: Service layer logic (80%+ coverage)
- ✅ **Integration Tests**: Full request/response with database
- ✅ **E2E Tests**: Critical user workflows

See [Testing Documentation](../testing/) for details.

### Code Review Checklist

Before submitting PR:
- [ ] Tests passing (unit, integration, E2E)
- [ ] Code follows existing patterns
- [ ] Security considerations addressed (input validation, auth, rate limiting)
- [ ] Documentation updated (both README and TECHNICAL)
- [ ] No console.log or debug code
- [ ] Environment variables documented

## 🤖 Working with Claude Code

### Requesting Features from Claude

When asking Claude Code to implement a feature from an issue:

```bash
# Example prompt:
"Implement the feature from GitHub issue #42.
Review the feature documentation first to understand the context."
```

Claude will:
1. Read the issue and feature request details
2. Review existing feature documentation
3. Create an implementation plan
4. Build the feature following established patterns
5. Write tests
6. Update documentation

### Documentation for AI Agents

The **TECHNICAL.md** files are specifically structured for Claude Code agents:
- Code references with line numbers (e.g., `service.ts:123`)
- Explicit file paths for all key files
- Architecture patterns to follow
- Testing patterns to replicate

This ensures consistent, high-quality implementations.

## 📊 Priority Levels

**Critical**: Blocking core business operations (dealers can't operate)
- Response: Same day
- Timeline: Immediate fix

**High**: Needed within 2-4 weeks (important but not blocking)
- Response: Within 2 days
- Timeline: Next sprint

**Medium**: Nice to have soon (quality of life improvements)
- Response: Within 1 week
- Timeline: Backlog, prioritized by value

**Low**: Future consideration (ideas for later)
- Response: Acknowledged
- Timeline: Tracked for future roadmap

## 🏷️ Labels Guide

| Label | Meaning |
|-------|---------|
| `feature-request` | New feature proposal |
| `bug` | Something broken |
| `needs-triage` | Awaiting maintainer review |
| `priority:critical` | Urgent, blocking issue |
| `priority:high` | Important, needed soon |
| `priority:medium` | Nice to have |
| `priority:low` | Future consideration |
| `in-progress` | Actively being worked on |
| `needs-review` | PR ready for review |
| `blocked` | Waiting on external dependency |

## 📞 Getting Help

- **Questions**: Ask in [GitHub Discussions](../../discussions)
- **Bugs**: Use [Bug Report template](../../issues/new?template=bug-report.yml)
- **Feature Ideas**: Use [Feature Request template](../../issues/new?template=feature-request.yml)
- **Urgent Issues**: Tag with `priority:critical`

## 🎯 Best Practices

### For Feature Requests
- ✅ **Be Specific**: "Add bulk upload for vehicles" not "improve vehicle management"
- ✅ **Explain Why**: Include business context and user impact
- ✅ **Define Success**: Clear acceptance criteria
- ❌ **Avoid**: Vague requests like "make it better"

### For Implementation
- ✅ **Follow Patterns**: Match existing code structure
- ✅ **Write Tests First**: TDD approach when possible
- ✅ **Keep PRs Focused**: One feature per PR
- ❌ **Avoid**: Combining features, refactoring unrelated code

### For Documentation
- ✅ **Update as You Build**: Don't leave it for the end
- ✅ **Include Examples**: Code snippets, API requests/responses
- ✅ **Link References**: Connect related documentation
- ❌ **Avoid**: Generic templates without specifics

## 📚 Additional Resources

- [Architecture Overview](../../CLAUDE.md#architecture-overview)
- [API Standards](../api/)
- [Security Guidelines](../security/)
- [Testing Patterns](../testing/)
- [Design System](../../frontend/DESIGN_SYSTEM.md)

---

**Questions?** Open a [discussion](../../discussions) or reach out to maintainers.
