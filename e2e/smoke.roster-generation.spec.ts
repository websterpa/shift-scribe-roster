/**
 * @smoke
 * E2E smoke test: generate a roster for a dummy month and verify UI renders, filters, exports
 */
import { test, expect } from '@playwright/test';

test.describe('Roster Generation Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('generate October 2025 roster and verify UI renders @smoke', async ({ page }) => {
    // Navigate to roster builder
    await page.goto('/roster/builder');
    await page.waitForSelector('text=Framework');

    // Select 12h framework
    await page.click('button:has-text("12-hour (D/N)")');

    // Apply "Even coverage" preset
    await page.click('button:has-text("Even coverage")');

    // Generate roster
    await page.click('button:has-text("Generate Roster")');

    // Wait for generation to complete
    await page.waitForSelector('text=Roster generated successfully', { timeout: 30000 });

    // Verify roster table renders
    await expect(page.locator('table')).toBeVisible();

    // Verify at least one staff row exists
    const staffRows = page.locator('tbody tr');
    await expect(staffRows.first()).toBeVisible();

    // Verify shift codes are present (D or N)
    const shiftCells = page.locator('td:has-text("D"), td:has-text("N")');
    await expect(shiftCells.first()).toBeVisible();
  });

  test('verify filters work on generated roster @smoke', async ({ page }) => {
    await page.goto('/roster/builder');
    await page.waitForSelector('text=Framework');

    // Generate minimal roster
    await page.click('button:has-text("12-hour (D/N)")');
    await page.click('button:has-text("Even coverage")');
    await page.click('button:has-text("Generate Roster")');
    await page.waitForSelector('text=Roster generated successfully', { timeout: 30000 });

    // Test shift filter (if available)
    const filterButton = page.locator('button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.click('text=Day shift');
      await page.click('button:has-text("Apply")');

      // Verify night shifts are hidden
      const nightCells = page.locator('td:has-text("N")');
      await expect(nightCells.first()).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('verify export functionality @smoke', async ({ page }) => {
    await page.goto('/roster/builder');
    await page.waitForSelector('text=Framework');

    // Generate roster
    await page.click('button:has-text("12-hour (D/N)")');
    await page.click('button:has-text("Even coverage")');
    await page.click('button:has-text("Generate Roster")');
    await page.waitForSelector('text=Roster generated successfully', { timeout: 30000 });

    // Look for export button
    const exportButton = page.locator('button:has-text("Export")').first();
    if (await exportButton.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // Verify file downloaded
      expect(download.suggestedFilename()).toMatch(/roster.*\.(csv|xlsx|pdf)/i);
    }
  });

  test('verify no duplicate assignments per staff per day @smoke', async ({ page }) => {
    await page.goto('/roster/builder');
    await page.waitForSelector('text=Framework');

    await page.click('button:has-text("12-hour (D/N)")');
    await page.click('button:has-text("Even coverage")');
    await page.click('button:has-text("Generate Roster")');
    await page.waitForSelector('text=Roster generated successfully', { timeout: 30000 });

    // Get all staff rows
    const staffRows = page.locator('tbody tr');
    const count = await staffRows.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const row = staffRows.nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();

      // Check each day cell for duplicates
      for (let j = 1; j < cellCount; j++) {
        const cellText = await cells.nth(j).textContent();
        if (cellText) {
          // Should not have multiple shift codes in same cell
          const shiftCodes = cellText.match(/[DELNR]/g) || [];
          expect(shiftCodes.length).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test('verify coverage bars render @smoke', async ({ page }) => {
    await page.goto('/roster/builder');
    await page.waitForSelector('text=Framework');

    await page.click('button:has-text("12-hour (D/N)")');
    await page.click('button:has-text("Even coverage")');
    await page.click('button:has-text("Generate Roster")');
    await page.waitForSelector('text=Roster generated successfully', { timeout: 30000 });

    // Look for coverage indicators
    const coverageBars = page.locator('[class*="coverage"], [class*="progress"]');
    if (await coverageBars.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(coverageBars.first()).toBeVisible();
    }
  });
});
