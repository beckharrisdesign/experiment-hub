# Test Generator Agent

## Purpose
Generate automated test cases for the Shop Manager prototype using Playwright.

## Context
The Shop Manager is a Next.js prototype for managing an Etsy embroidery pattern store. It includes:
- Pattern management (CRUD operations)
- Product/listing generation
- Brand identity setup
- Auto-save functionality
- Keyboard shortcuts (Ctrl+S / Cmd+S)
- Image paste-to-upload
- Navigation between views (Dashboard, Patterns, Products, Store)

## Test Framework
- **Framework**: Playwright
- **Language**: TypeScript
- **Test Location**: `tests/e2e/*.spec.ts`
- **Config**: `playwright.config.ts`

## Test Patterns

### Navigation Tests
```typescript
test('should navigate to [page]', async ({ page }) => {
  await page.goto('/');
  await page.click('text=[Link Text]');
  await expect(page).toHaveURL(/\/[route]$/);
});
```

### Keyboard Shortcut Tests
```typescript
test('should handle [shortcut]', async ({ page }) => {
  await page.goto('/[page]');
  await page.keyboard.press('[Modifier]+[Key]');
  await expect(page.locator('text=/[expected message]/i')).toBeVisible();
});
```

### Auto-Save Tests
```typescript
test('should auto-save [field] changes', async ({ page }) => {
  await page.goto('/[edit-page]');
  const input = page.locator('[selector]');
  await input.fill('[test value]');
  await page.waitForTimeout(2000); // Wait for debounce
  await expect(page.locator('text=/saved/i')).toBeVisible();
});
```

### Form Interaction Tests
```typescript
test('should [action] when [condition]', async ({ page }) => {
  await page.goto('/[page]');
  await page.fill('[selector]', '[value]');
  await page.click('button:has-text("[button text]")');
  await expect(page.locator('[result selector]')).toBeVisible();
});
```

## Guidelines

1. **Test Structure**: Use `test.describe()` to group related tests
2. **Naming**: Use descriptive test names: `'should [expected behavior] when [condition]'`
3. **Selectors**: Prefer text-based selectors (`text=...`) or semantic selectors (`[role="button"]`)
4. **Wait Strategy**: Use `waitForLoadState('networkidle')` after navigation
5. **Assertions**: Use Playwright's `expect()` API
6. **Timeouts**: Set appropriate timeouts for async operations (auto-save debounce is 1.5s)
7. **Conditional Tests**: Use `test.skip()` or `if (await element.count() > 0)` for optional features

## Common Test Scenarios

### Page Loading
- Verify page title
- Verify key elements are visible
- Verify navigation works

### Form Interactions
- Fill inputs
- Select dropdowns
- Submit forms
- Verify validation

### Auto-Save
- Type in field
- Wait for debounce (1.5s)
- Verify "Saving..." indicator
- Verify "Saved [time]" message
- Reload and verify persistence

### Keyboard Shortcuts
- Test Ctrl+S (Windows/Linux)
- Test Cmd+S (Mac)
- Verify toast notification
- Verify default browser behavior is prevented

### Image Upload
- Verify paste hint is visible
- Test file upload
- Verify preview appears
- Test remove functionality

## Output Format

When generating tests:
1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import `test` and `expect` from `@playwright/test`
3. Use descriptive `test.describe()` blocks
4. Include comments explaining test purpose
5. Follow the existing test patterns

## Example Test File Structure

```typescript
import { test, expect } from '@playwright/test';

/**
 * [Feature] Tests
 * [Brief description of what these tests cover]
 */
test.describe('[Feature Name]', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/[starting-page]');
  });

  test('should [expected behavior]', async ({ page }) => {
    // Test implementation
  });
});
```

## Notes

- The app runs on port 3001
- Base URL is configured in `playwright.config.ts`
- Tests should be independent and not rely on test order
- Use `test.skip()` for tests that require specific conditions (e.g., existing data)
- Consider using test fixtures for common setup (login, data creation, etc.)

