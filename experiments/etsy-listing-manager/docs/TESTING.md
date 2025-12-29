# Testing Strategy

## Overview

Tests are designed to run as **acceptance criteria** for commits and deployments, not as interactive development tools.

## Running Tests

### Quick Test Run (Default)
```bash
npm test
```
Runs all tests in Chromium, exits cleanly.

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

## Integration Options

### Option 1: Pre-commit Hook (Husky)
If you have Husky installed:
```bash
npm install --save-dev husky
npx husky install
```
The `.husky/pre-commit` hook will run tests automatically.

### Option 2: Manual Script
Before committing, run:
```bash
./scripts/test-acceptance.sh
```

### Option 3: CI/CD Pipeline
Add to your CI config:
```yaml
# Example GitHub Actions
- name: Run tests
  run: npm run test:ci
```

### Option 4: Git Hook (Simple)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
cd experiments/etsy-embroidery-pattern-manager/prototype
npm run test:ci
```

## Test Philosophy

- **Fast**: Tests complete in under 2 minutes
- **Reliable**: Tests are deterministic and don't hang
- **Acceptance Criteria**: Tests verify features work as expected
- **Non-blocking Development**: Run manually when needed, not on every save

## What Gets Tested

✅ Navigation between main views  
✅ Image paste UI  
🚧 Form validation (coming soon)  
🚧 API error handling (coming soon)  

## Skipping Tests

If you need to commit without running tests:
```bash
git commit --no-verify
```

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

