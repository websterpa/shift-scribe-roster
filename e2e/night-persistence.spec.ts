import { test, expect } from '@playwright/test';

test.describe('@nights Night Persistence E2E', () => {
  test('generated nights persist after hard reload', async ({ page }) => {
    // Navigate to roster builder
    await page.goto('/roster/builder');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Select 8h system with nights
    await page.selectOption('select[name="system"]', '8h');
    
    // Set pattern with nights
    await page.fill('input[name="pattern"]', 'EELLNNRRRR');
    
    // Set staffing requirements (ensure N > 0)
    const nightInputs = page.locator('input[aria-label*="Night"]');
    const count = await nightInputs.count();
    for (let i = 0; i < count; i++) {
      await nightInputs.nth(i).fill('1');
    }
    
    // Generate roster
    await page.click('button:has-text("Generate Roster")');
    
    // Wait for navigation to summary
    await page.waitForURL(/\/roster\/summary/);
    
    // Wait for roster to load
    await page.waitForLoadState('networkidle');
    
    // Check that Night shifts are visible
    const nightCells = page.locator('[data-shift-code="N"]');
    await expect(nightCells.first()).toBeVisible({ timeout: 10000 });
    
    // Get the version ID from URL
    const url = new URL(page.url());
    const versionId = url.searchParams.get('version');
    expect(versionId).toBeTruthy();
    
    // Hard reload the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Verify Night shifts are still visible after reload
    const nightCellsAfterReload = page.locator('[data-shift-code="N"]');
    await expect(nightCellsAfterReload.first()).toBeVisible({ timeout: 10000 });
    
    // Verify count is the same
    const initialCount = await nightCells.count();
    const afterReloadCount = await nightCellsAfterReload.count();
    expect(afterReloadCount).toBeGreaterThan(0);
    expect(afterReloadCount).toBe(initialCount);
  });

  test('night count matches requirements after save', async ({ page }) => {
    await page.goto('/roster/builder');
    await page.waitForLoadState('networkidle');
    
    // Configure 12h system with consistent night requirements
    await page.selectOption('select[name="system"]', '12h');
    await page.fill('input[name="pattern"]', 'DDNNRRRR');
    
    // Set 2 nights per day for all days
    const nightInputs = page.locator('input[aria-label*="Night"]');
    const dayCount = await nightInputs.count();
    for (let i = 0; i < dayCount; i++) {
      await nightInputs.nth(i).fill('2');
    }
    
    // Generate
    await page.click('button:has-text("Generate Roster")');
    await page.waitForURL(/\/roster\/summary/);
    await page.waitForLoadState('networkidle');
    
    // Check diagnostics banner shows nights
    const diagnosticsBanner = page.locator('[data-testid="diagnostics-banner"]');
    if (await diagnosticsBanner.isVisible()) {
      const bannerText = await diagnosticsBanner.textContent();
      expect(bannerText).toContain('N:');
      expect(bannerText).not.toContain('N: 0');
    }
    
    // Verify night cells exist
    const nightCells = page.locator('[data-shift-code="N"]');
    const nightCount = await nightCells.count();
    expect(nightCount).toBeGreaterThan(0);
    
    // Expected: 2 nights/day × 7 days = 14 minimum for first week
    expect(nightCount).toBeGreaterThanOrEqual(14);
  });
});
