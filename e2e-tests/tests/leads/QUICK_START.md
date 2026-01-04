# Lead Management E2E Tests - Quick Start

## TL;DR
```bash
# 1. Start services
docker compose up -d

# 2. Run tests
cd e2e-tests
npm test -- tests/leads/
```

## Test Files
- `lead-crud.spec.ts` - Create, read, update, delete (20 tests)
- `lead-conversion.spec.ts` - Convert to deals, status management (7 tests)
- `lead-assignment.spec.ts` - User assignment workflows (8 tests)

## Common Commands

### Run All Lead Tests
```bash
npm test -- tests/leads/
```

### Run Single File
```bash
npm test -- tests/leads/lead-crud.spec.ts
```

### Run Specific Test
```bash
npm test -- tests/leads/lead-crud.spec.ts -g "should create a new lead"
```

### Debug Mode
```bash
npm test -- tests/leads/ --debug
```

### UI Mode
```bash
npm test -- tests/leads/ --ui
```

### Watch Mode
```bash
npm test -- tests/leads/ --headed
```

## What's Tested?

### CRUD (20 tests)
- ✅ Create lead (full form, minimal form)
- ✅ View leads (list, detail, search, filter)
- ✅ Update lead (edit form, status change)
- ✅ Delete lead (from list, from detail)
- ✅ Form validation (required fields, email format)
- ✅ UI states (empty, loading, no results)

### Conversion (7 tests)
- ✅ Convert lead to deal
- ✅ Mark lead as lost
- ✅ Status lifecycle (new → contacted → qualified → converted)
- ✅ Business rules (can't convert twice, etc.)

### Assignment (8 tests)
- ✅ Assign/reassign leads to users
- ✅ Filter by assigned user
- ✅ Unassigned lead filtering

## Prerequisites Checklist
- [ ] Frontend running: http://localhost:3000
- [ ] Backend running: http://localhost:3001
- [ ] Database migrated
- [ ] Redis running
- [ ] Test user exists (see `.env.test`)

## Quick Troubleshooting

### "ERR_CONNECTION_REFUSED"
→ Start frontend/backend: `docker compose up`

### "No leads to test - skipping"
→ Let creation tests run first, or create leads manually

### "No users available"
→ Create multiple users in your test organization

### Tests timing out
→ Increase timeout in `playwright.config.ts`

### Flaky tests
→ Run with `--headed` to see what's happening

## Output

### Reports
- HTML: `npx playwright show-report`
- Screenshots: `test-results/*.png`
- Videos: `test-results/*.webm` (failures only)

## Test Coverage
35 tests covering:
- All CRUD operations
- All search/filter combinations
- Lead assignment workflows
- Lead conversion to deals
- Status lifecycle management
- Form validation
- Empty/loading states
- Modal interactions

## Need Help?
1. Check `README.md` for detailed docs
2. Check `TEST_SUMMARY.md` for complete test matrix
3. Run with `--debug` flag
4. Check screenshots in `test-results/`
