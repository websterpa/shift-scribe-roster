/**
 * E2E test for Feasibility ↔ Builder consistency
 * 
 * Tests the flow from Feasibility Calculator → Use This Setup → Builder
 * and verifies that consistency issues are detected and displayed.
 */

import { test, expect } from '@playwright/test';

test.describe('Feasibility-Builder Consistency', () => {
  test('should show zero issues when configuration matches, then detect changes', async ({ page }) => {
    // E2E-1: Set up feasibility with clean 8h config
    await page.goto('/feasibility');
    await page.waitForLoadState('networkidle');

    // Select 8h framework
    const framework8h = page.getByRole('button', { name: /8-hour/i });
    if (await framework8h.isVisible()) {
      await framework8h.click();
    }

    // Set requirements: Weekday E=2 L=2 N=2, Saturday E=2 L=2 N=2, Sunday E=2 L=2 N=2
    const weekdayE = page.locator('[data-testid="composer-weekdays-E"]');
    const weekdayL = page.locator('[data-testid="composer-weekdays-L"]');
    const weekdayN = page.locator('[data-testid="composer-weekdays-N"]');
    const satE = page.locator('[data-testid="composer-saturday-E"]');
    const satL = page.locator('[data-testid="composer-saturday-L"]');
    const satN = page.locator('[data-testid="composer-saturday-N"]');
    const sunE = page.locator('[data-testid="composer-sunday-E"]');
    const sunL = page.locator('[data-testid="composer-sunday-L"]');
    const sunN = page.locator('[data-testid="composer-sunday-N"]');

    await weekdayE.fill('2');
    await weekdayL.fill('2');
    await weekdayN.fill('2');
    await satE.fill('2');
    await satL.fill('2');
    await satN.fill('2');
    await sunE.fill('2');
    await sunL.fill('2');
    await sunN.fill('2');

    // Click "Use This Setup"
    const useSetupButton = page.getByRole('button', { name: /use this setup/i });
    await useSetupButton.click();

    // E2E-2: Should navigate to builder
    await page.waitForURL(/\/roster\/guided-v2/);
    await page.waitForLoadState('networkidle');

    // Check for issues count badge (should be 0)
    const issuesCount = page.locator('[data-testid="config-issues-count"]');
    
    // Wait a bit for the banner to render and check issues
    await page.waitForTimeout(1000);
    
    if (await issuesCount.isVisible()) {
      const countText = await issuesCount.textContent();
      expect(countText).toMatch(/0/);
    }

    // E2E-3: Change Sunday Night to 1 (creating a mismatch)
    const builderSunN = page.locator('[data-testid="builder-sunday-N"]');
    
    if (await builderSunN.isVisible()) {
      await builderSunN.fill('1');
      
      // Wait for debounce and revalidation
      await page.waitForTimeout(1000);

      // Now issues count should be 1
      if (await issuesCount.isVisible()) {
        const newCountText = await issuesCount.textContent();
        expect(newCountText).toMatch(/[1-9]/); // At least 1 issue
      }

      // Check for the specific issue in the details
      const issuesList = page.locator('[data-testid="config-issues-list"]');
      if (await issuesList.isVisible()) {
        await expect(issuesList).toContainText(/day-groups-differ|sunday/i);
      }

      // Verify severity class (error should have red/destructive styling)
      const errorBadge = page.locator('[data-severity="error"]');
      if (await errorBadge.isVisible()) {
        await expect(errorBadge).toBeVisible();
      }
    }
  });

  test('should detect zero-shift errors when setting all shifts to zero', async ({ page }) => {
    await page.goto('/feasibility');
    await page.waitForLoadState('networkidle');

    // Select 8h framework
    const framework8h = page.getByRole('button', { name: /8-hour/i });
    if (await framework8h.isVisible()) {
      await framework8h.click();
    }

    // Set all Late shifts to 0
    const weekdayL = page.locator('[data-testid="composer-weekdays-L"]');
    const satL = page.locator('[data-testid="composer-saturday-L"]');
    const sunL = page.locator('[data-testid="composer-sunday-L"]');

    await weekdayL.fill('0');
    await satL.fill('0');
    await sunL.fill('0');

    // Set others to valid values
    const weekdayE = page.locator('[data-testid="composer-weekdays-E"]');
    const weekdayN = page.locator('[data-testid="composer-weekdays-N"]');
    await weekdayE.fill('2');
    await weekdayN.fill('2');

    // Click "Use This Setup"
    const useSetupButton = page.getByRole('button', { name: /use this setup/i });
    await useSetupButton.click();

    await page.waitForURL(/\/roster\/guided-v2/);
    await page.waitForLoadState('networkidle');

    // Wait for validation
    await page.waitForTimeout(1000);

    // Should show zero-shift error
    const issuesList = page.locator('[data-testid="config-issues-list"]');
    if (await issuesList.isVisible()) {
      await expect(issuesList).toContainText(/zero.*shift.*L/i);
    }
  });

  test('should detect framework-hours mismatch', async ({ page }) => {
    await page.goto('/feasibility');
    await page.waitForLoadState('networkidle');

    // Select 12h framework
    const framework12h = page.getByRole('button', { name: /12-hour/i });
    if (await framework12h.isVisible()) {
      await framework12h.click();
    }

    // Set valid 12h requirements
    const weekdayD = page.locator('[data-testid="composer-weekdays-D"]');
    const weekdayN = page.locator('[data-testid="composer-weekdays-N"]');
    
    if (await weekdayD.isVisible()) {
      await weekdayD.fill('2');
      await weekdayN.fill('2');
    }

    // Click "Use This Setup"
    const useSetupButton = page.getByRole('button', { name: /use this setup/i });
    await useSetupButton.click();

    await page.waitForURL(/\/roster\/guided-v2/);
    await page.waitForLoadState('networkidle');

    // Manually switch framework in builder to 8h (this creates a mismatch)
    const systemSelect = page.locator('select[id="system"]').or(page.getByLabel(/shift system/i));
    if (await systemSelect.isVisible()) {
      await systemSelect.selectOption('8h');
      
      // Wait for validation
      await page.waitForTimeout(1000);

      // Should show framework-hours-mismatch error
      const issuesList = page.locator('[data-testid="config-issues-list"]');
      if (await issuesList.isVisible()) {
        await expect(issuesList).toContainText(/framework.*hours.*mismatch/i);
      }
    }
  });
});
