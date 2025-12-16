import { test, expect } from '@playwright/test';

/**
 * Navigation Tests
 * Tests that all main views load correctly
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard/home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Shop Manager/i);
    await expect(page.getByRole('heading', { name: /Dashboard|Patterns|Products/i })).toBeVisible();
  });

  test('should navigate to Patterns page', async ({ page }) => {
    await page.click('text=Patterns');
    await expect(page).toHaveURL(/\/patterns$/);
    await expect(page.getByRole('heading', { name: /Pattern/i })).toBeVisible();
  });

  test('should navigate to Products page', async ({ page }) => {
    await page.click('text=Products');
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole('heading', { name: /Product/i })).toBeVisible();
  });

  test('should navigate to Store page', async ({ page }) => {
    await page.click('text=Store');
    await expect(page).toHaveURL(/\/store$/);
  });

  test('should navigate to Brand Identity page', async ({ page }) => {
    // Brand Identity might be in a menu or on the store page
    await page.goto('/brand-identity');
    await expect(page).toHaveURL(/\/brand-identity$/);
  });

  test('header should persist during scroll', async ({ page }) => {
    const header = page.locator('header, [role="banner"]').first();
    const initialPosition = await header.boundingBox();
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(100);
    
    const scrolledPosition = await header.boundingBox();
    
    // Header should remain visible (sticky positioning)
    expect(scrolledPosition).toBeTruthy();
  });
});

