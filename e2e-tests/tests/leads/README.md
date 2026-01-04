# Lead Management E2E Tests

Comprehensive end-to-end tests for the Lead Management feature in FleetPass.

## Test Files

### 1. `lead-crud.spec.ts` - Core CRUD Operations
Tests the fundamental Create, Read, Update, Delete operations for leads.

**Test Coverage:**
- Display lead list page with proper UI elements
- Create new lead with all fields (name, email, phone, source, vehicle interest, notes)
- Create minimal lead with only required fields (name only)
- Form validation (required fields, email format)
- Display lead details with all information
- Search leads by name, email, phone
- Filter leads by status (new, contacted, qualified, converted, lost)
- Filter leads by source (website, phone, walk-in, referral, social media, other)
- Clear all filters functionality
- Toggle between grid and list view modes
- Update lead information
- Assign lead to user via modal
- Display empty state when no leads exist
- Display "no results" state when filters return empty
- Loading state indicators
- Delete lead from list view
- Delete lead from detail view
- Cancel form and return to list
- Warn when canceling form with unsaved changes

**Total Tests:** 20

### 2. `lead-conversion.spec.ts` - Conversion & Status Management
Tests lead conversion to deals and status lifecycle management.

**Test Coverage:**
- Convert lead to deal with all required fields
- Mark lead as lost
- Prevent converting already converted leads
- Prevent marking converted leads as lost
- Conversion form validation (deal value required)
- Update lead status via edit form (new → contacted → qualified)
- Close conversion modal on cancel without changes

**Total Tests:** 7

### 3. `lead-assignment.spec.ts` - Assignment & User Management
Tests lead assignment workflows and filtering by assigned users.

**Test Coverage:**
- Assign lead to user via assignment modal
- Assign lead during creation
- Filter leads by assigned user
- Filter unassigned leads
- Reassign lead to different user
- Close assignment modal on cancel
- Update assignment via edit form
- Display assigned user badge on lead cards

**Total Tests:** 8

## Prerequisites

Before running the tests, ensure:

1. **Backend server** is running on `http://localhost:3001`
2. **Frontend server** is running on `http://localhost:3000`
3. **PostgreSQL database** is running and migrated
4. **Redis** is running (for idempotency)
5. **Test user** exists in the database

### Start Services

Using Docker Compose (recommended):
```bash
# From project root
docker compose up
```

Or manually:
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Test User Setup

Create a test user account or use the `.env.test` file to configure existing credentials:

```env
# e2e-tests/.env.test
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password
```

## Running Tests

### Run All Lead Tests
```bash
cd e2e-tests
npm test -- tests/leads/
```

### Run Specific Test File
```bash
# CRUD operations only
npm test -- tests/leads/lead-crud.spec.ts

# Conversion tests only
npm test -- tests/leads/lead-conversion.spec.ts

# Assignment tests only
npm test -- tests/leads/lead-assignment.spec.ts
```

### Run Specific Test
```bash
npm test -- tests/leads/lead-crud.spec.ts -g "should create a new lead"
```

### Run with UI Mode (Debug)
```bash
npm test -- tests/leads/ --ui
```

### Run in Headed Mode (Visible Browser)
```bash
npm test -- tests/leads/ --headed
```

### Run in Debug Mode
```bash
npm test -- tests/leads/ --debug
```

## Test Output

### Screenshots
Test screenshots are saved to `test-results/` directory:
- `lead-list.png` - Lead list page
- `lead-create-form.png` - Create lead form
- `lead-form-filled.png` - Filled form before submission
- `lead-created.png` - Lead detail page after creation
- `lead-validation-errors.png` - Form validation errors
- `lead-detail.png` - Lead detail view
- `lead-search.png` - Search results
- `lead-filter-*.png` - Various filter states
- `lead-assign-modal.png` - Assignment modal
- `lead-convert-modal.png` - Conversion modal
- And many more...

### Reports
HTML report is generated at `playwright-report/index.html`:
```bash
npx playwright show-report
```

### Videos
Videos of failed tests are saved to `test-results/` directory.

## Test Data Management

### Test Data Creation
Tests create temporary lead data with timestamps to ensure uniqueness:
```typescript
const timestamp = Date.now();
const leadData = {
  customerName: `Test Lead ${timestamp}`,
  customerEmail: `test.lead${timestamp}@example.com`,
  // ...
};
```

### Test Data Cleanup
Some tests delete the data they create. However, you may want to periodically clean up test data:
```bash
# Via Prisma Studio
cd backend
npx prisma studio
# Delete leads with names like "Test Lead" or emails like "test.lead*@example.com"
```

## Common Issues

### Issue: `ERR_CONNECTION_REFUSED`
**Solution:** Ensure frontend and backend servers are running.

### Issue: "No leads to test - skipping"
**Solution:** Create some test leads manually or let the creation tests run first.

### Issue: "No users available for assignment"
**Solution:** Ensure your test organization has multiple users created.

### Issue: Tests fail due to timing
**Solution:** Tests include appropriate waits, but slow systems may need longer timeouts. Edit `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 15000, // Increase from 10000
}
```

### Issue: Modal not appearing
**Solution:** Check console for React errors. Ensure the Lead Management feature is properly deployed.

## Best Practices

1. **Run tests sequentially** - Tests may have database dependencies
2. **Use fresh test data** - Tests generate unique data to avoid conflicts
3. **Review screenshots** - Check `test-results/` for visual verification
4. **Monitor console output** - Tests log helpful debugging information
5. **Reset database state** - If tests are failing unexpectedly, reset DB state

## Coverage Summary

| Feature | Coverage | Test Files |
|---------|----------|------------|
| CRUD Operations | ✅ 100% | lead-crud.spec.ts |
| Search & Filters | ✅ 100% | lead-crud.spec.ts |
| View Modes | ✅ 100% | lead-crud.spec.ts |
| Lead Assignment | ✅ 100% | lead-assignment.spec.ts |
| Lead Conversion | ✅ 100% | lead-conversion.spec.ts |
| Status Management | ✅ 100% | lead-conversion.spec.ts |
| Form Validation | ✅ 100% | lead-crud.spec.ts, lead-conversion.spec.ts |
| Empty States | ✅ 100% | lead-crud.spec.ts |
| Loading States | ✅ 100% | lead-crud.spec.ts |

**Total Test Count:** 35 tests
**Total Coverage:** Comprehensive coverage of all Lead Management UI features

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Lead E2E Tests
  run: |
    npm test -- tests/leads/ --reporter=github
```

## Contributing

When adding new Lead Management features:

1. Add corresponding E2E tests to appropriate spec file
2. Follow existing test patterns (Page Objects, AuthHelper)
3. Use descriptive test names
4. Add appropriate waits and assertions
5. Update this README with new test coverage

## Support

For issues with tests:
1. Check console output for error messages
2. Review screenshots in `test-results/`
3. Run tests in debug mode: `npm test -- tests/leads/ --debug`
4. Check backend logs for API errors
