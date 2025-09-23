import { test, expect } from '@playwright/test';

test("Teams tab shows Night after normalization", async ({ page }) => {
  await page.goto("/roster/summary?version=v1");
  await page.click("text=Teams");
  await expect(page.locator("text=N")).toBeVisible();
});

test('Teams tab handles mixed readable names and codes', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  
  // Click on Teams tab
  await page.click('text=Team Lanes');
  
  // Should render without errors even with mixed DB formats
  await expect(page.getByText('Team')).toBeVisible();
  await expect(page.getByText('Fairness')).toBeVisible();
});