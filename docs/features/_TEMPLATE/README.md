# [Feature Name]

> **Status**: ✅ Production | 🚧 In Development | 📋 Planned
> **Owner**: [Team/Person]
> **Last Updated**: YYYY-MM-DD

## Overview

[2-3 sentence description of what this feature does and why it exists]

## User Stories

### Primary Use Cases

**As a [user type], I want to [action] so that [benefit].**

- **Example**: As a dealership manager, I want to add new vehicles to the system so that customers can browse and book them.

### Supported Workflows

1. **[Workflow Name]**
   - Step 1: [User action]
   - Step 2: [System response]
   - Step 3: [Outcome]

2. **[Workflow Name]**
   - Step 1: [User action]
   - Step 2: [System response]
   - Step 3: [Outcome]

## Business Rules

### Validations
- [Rule 1]: [Description and rationale]
- [Rule 2]: [Description and rationale]

### Constraints
- [Constraint 1]: [Description]
- [Constraint 2]: [Description]

### Permissions
- **Who can access**: [User roles/types]
- **Access level**: [Read/Write/Admin/etc.]
- **Multi-tenant isolation**: [How data is isolated between organizations]

## User Interface

### Key Screens/Components

**[Screen/Component Name]**
- **Location**: `/path/to/page` or `ComponentName`
- **Purpose**: [What users do here]
- **Key Actions**: [List of main user actions]

**[Screen/Component Name]**
- **Location**: `/path/to/page`
- **Purpose**: [What users do here]
- **Key Actions**: [List of main user actions]

### User Flow Diagram

```
[Start] → [Action 1] → [Decision?] → [Action 2] → [End]
                           ↓
                       [Alt Path]
```

_(Or include image: `![Flow](./diagrams/user-flow.png)`)_

## Data Model

### Key Entities

**[Entity Name]** (e.g., `Vehicle`, `Booking`)
- **Fields**:
  - `field1` (type): Description
  - `field2` (type): Description
- **Relationships**:
  - Belongs to `Organization`
  - Has many `RelatedEntity`

## Integration Points

### Internal Dependencies
- **[Feature/Module Name]**: [How this feature depends on it]
- **[Feature/Module Name]**: [How this feature depends on it]

### External Services
- **[Service Name]** (e.g., Stripe, Persona): [What it's used for]

## Error Scenarios & Edge Cases

### Common Errors
| Error | Cause | User Impact | Resolution |
|-------|-------|-------------|------------|
| [Error message] | [What causes it] | [What user sees] | [How to fix] |

### Edge Cases
- **[Scenario]**: [How the system handles it]
- **[Scenario]**: [How the system handles it]

## Testing

### Test Coverage
- ✅ Unit Tests: [Location of tests]
- ✅ Integration Tests: [Location of tests]
- ✅ E2E Tests: [Location of tests]

### Manual Testing Checklist
- [ ] [Test case 1]
- [ ] [Test case 2]
- [ ] [Test case 3]

## Performance Considerations

- **Expected Load**: [Typical usage patterns]
- **Optimization**: [Caching, indexing, etc.]
- **Limits**: [Rate limits, size limits, etc.]

## Security Considerations

- **Authentication**: [How users are authenticated]
- **Authorization**: [How permissions are enforced]
- **Data Protection**: [Sensitive data handling]
- **Vulnerabilities Addressed**: [OWASP considerations, etc.]

## Known Limitations

- [Limitation 1]: [Description and potential future fix]
- [Limitation 2]: [Description and potential future fix]

## Future Enhancements

- [Enhancement 1]: [Description]
- [Enhancement 2]: [Description]

## Related Documentation

- [Technical Implementation](./TECHNICAL.md)
- [API Documentation](../../api/endpoints.md#feature-name)
- [Related Feature](../related-feature/README.md)

## Changelog

| Date | Change | Author |
|------|--------|--------|
| YYYY-MM-DD | Initial documentation | [Name] |
