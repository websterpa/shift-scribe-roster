import { test, expect } from '@playwright/test';

test('wizard help panel updates content between steps', async ({ page }) => {
  await page.goto('/wizard');
  
  // Open help panel
  await page.click('button:has-text("Show Help")');
  await expect(page.locator('[role="dialog"]')).toContainText('Wizard Help');
  
  // Check Step 1 (Basics) content
  await expect(page.locator('[role="dialog"]')).toContainText('Basics sets your shift system');
  
  // Navigate to Step 2 (Pattern)
  await page.click('button:has-text("Next")');
  await expect(page.locator('[role="dialog"]')).toContainText('Pattern is the rota template');
  
  // Navigate to Step 3 (Staffing Levels)
  await page.click('button:has-text("Next")');
  await expect(page.locator('[role="dialog"]')).toContainText('Staffing Levels define how many people');
  
  // Verify "Staffing Levels" appears in step navigation
  await expect(page.locator('text=3. Staffing Levels')).toBeVisible();
});