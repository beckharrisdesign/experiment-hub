# Test Suite

This directory contains automated tests for the Shop Manager prototype.

## Test Structure

- **`e2e/`**: End-to-end tests using Playwright
  - `navigation.spec.ts`: Tests for loading main views and navigation
  - `image-paste.spec.ts`: Tests for paste-to-upload functionality

## Running Tests

### Quick Test Run (Default - for acceptance)
```bash
npm test
```
Runs all tests in Chromium, exits cleanly. Use this as acceptance criteria.

### CI/Commit Hook
```bash
npm run test:ci
```
Optimized for automated runs with minimal output.

### Manual Acceptance Check
```bash
./scripts/test-acceptance.sh
```
Use this before committing to verify everything works.

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run a specific test file
```bash
npx playwright test tests/e2e/navigation.spec.ts
```

### Run tests in debug mode
```bash
npm run test:debug
```

### View test report
```bash
npx playwright show-report
```

## Integration with Workflow

Tests are designed to run as **acceptance criteria** for commits, not as interactive development tools. See `TESTING.md` for integration options (pre-commit hooks, CI/CD, etc.).

## Writing New Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Use Playwright's test API:
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test('my test', async ({ page }) => {
     await page.goto('/');
     await expect(page).toHaveTitle(/Shop Manager/);
   });
   ```

3. Or use the AI test generator agent to create tests automatically

## Test Coverage Goals

- ✅ All main navigation routes
- ✅ Image paste functionality
- 🚧 Form validation
- 🚧 API error handling
- 🚧 Data persistence
- 🚧 User workflows (create pattern → generate listing)

## CI/CD Integration

Tests can be run in CI/CD pipelines. The Playwright config includes:
- Retry logic for flaky tests
- Screenshot capture on failure
- HTML test reports
- Multiple browser testing (Chrome, Firefox, Safari)

