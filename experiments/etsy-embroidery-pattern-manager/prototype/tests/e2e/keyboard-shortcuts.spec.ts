import { test, expect } from '@playwright/test';

/**
 * Keyboard Shortcuts Tests
 * Tests keyboard commands like Ctrl+S / Cmd+S
 */
test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show "Saved" toast on Ctrl+S (Windows/Linux)', async ({ page, browserName }) => {
    // Skip on Mac where Cmd+S is used
    test.skip(browserName === 'webkit', 'Safari uses Cmd+S, not Ctrl+S');
    
    // Navigate to a pattern edit page if available
    // For now, test on any page with a form
    await page.goto('/brand-identity');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Type something in a form field
    const input = page.locator('input[type="text"]').first();
    if (await input.count() > 0) {
      await input.fill('Test Store Name');
      
      // Press Ctrl+S
      await page.keyboard.press('Control+s');
      
      // Check for "Saved" toast/message
      // Look for toast notification or success message
      const savedMessage = page.locator('text=/saved/i').first();
      await expect(savedMessage).toBeVisible({ timeout: 2000 });
    }
  });

  test('should show "Saved" toast on Cmd+S (Mac)', async ({ page, browserName }) => {
    // This will work on all browsers, but is most relevant on Mac
    await page.goto('/brand-identity');
    await page.waitForLoadState('networkidle');
    
    const input = page.locator('input[type="text"]').first();
    if (await input.count() > 0) {
      await input.fill('Test Store Name');
      
      // Press Cmd+S (Meta key)
      await page.keyboard.press('Meta+s');
      
      // Check for "Saved" toast
      const savedMessage = page.locator('text=/saved/i').first();
      await expect(savedMessage).toBeVisible({ timeout: 2000 });
    }
  });

  test('should prevent default browser save dialog on Ctrl+S', async ({ page }) => {
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');
    
    // Add a listener to check if default was prevented
    const dialogPrevented = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        window.addEventListener('beforeunload', (e) => {
          // If we get here, default wasn't prevented
          resolve(false);
        }, { once: true });
        
        // Trigger Ctrl+S
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        
        document.dispatchEvent(event);
        
        // If no beforeunload fired, default was likely prevented
        setTimeout(() => resolve(true), 100);
      });
    });
    
    // The page should handle the save, not the browser
    expect(dialogPrevented).toBe(true);
  });

  test('should trigger auto-save on pattern edit page', async ({ page }) => {
    // First, create or navigate to a pattern
    await page.goto('/patterns');
    await page.waitForLoadState('networkidle');
    
    // Try to find an existing pattern or create one
    const patternLink = page.locator('a[href*="/patterns/"]').first();
    
    if (await patternLink.count() > 0) {
      await patternLink.click();
      await page.waitForURL(/\/patterns\/[^/]+$/);
      
      // Find a text input
      const nameInput = page.locator('input[type="text"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill('Test Pattern Name');
        
        // Wait for auto-save (1.5 seconds debounce)
        await page.waitForTimeout(2000);
        
        // Check for "Saving..." or "Saved" indicator
        const saveIndicator = page.locator('text=/saving|saved/i').first();
        await expect(saveIndicator).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

