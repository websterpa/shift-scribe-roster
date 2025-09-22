import { test, expect } from '@playwright/test';

test('navigates to Coverage tab and sees table', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  
  // Click on Coverage tab
  await page.click('text=Coverage');
  
  // Wait for and verify table headers are visible
  await expect(page.getByText('Day')).toBeVisible();
  await expect(page.getByText('Shifts')).toBeVisible();
});

test('navigates to Teams tab and sees table', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  
  // Click on Team Lanes tab  
  await page.click('text=Team Lanes');
  
  // Wait for and verify team table is visible
  await expect(page.getByText('Team')).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
});

test('coverage strip shows variance pills correctly', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  await page.click('text=Coverage');
  
  // Wait for data to load
  await page.waitForTimeout(2000);
  
  // Look for shift variance indicators (planned/need format)
  const variancePills = page.locator('[class*="bg-red-100"], [class*="bg-green-100"], [class*="bg-blue-100"]');
  await expect(variancePills.first()).toBeVisible();
});

test('team roster shows shift tokens', async ({ page }) => {
  await page.goto('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  await page.click('text=Team Lanes');
  
  // Wait for data to load
  await page.waitForTimeout(2000);
  
  // Look for shift tokens (D, N, E, L, R)
  const shiftTokens = page.locator('span:has-text(/^[DNELR]$/)');
  await expect(shiftTokens.first()).toBeVisible();
});