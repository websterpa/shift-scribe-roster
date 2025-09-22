import { test, expect } from '@playwright/test';

test('Teams tab shows fairness column and rest-risk legend', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  
  // Click on Teams tab
  await page.click('text=Team Lanes');
  
  // Should see fairness column header
  await expect(page.getByText('Fairness')).toBeVisible();
  
  // Should see rest-risk legend
  await expect(page.getByText('Rest-risk legend')).toBeVisible();
  
  // Should see legend items
  await expect(page.getByText('≥13h')).toBeVisible();
  await expect(page.getByText('11–13h')).toBeVisible();
  await expect(page.locator('text=11h').first()).toBeVisible();
});