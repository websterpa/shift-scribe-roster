import { test, expect } from '@playwright/test';

test('Shows Night callout when version lacks Night shifts', async ({ page }) => {
  // Use the current version that we know has no Night shifts
  await page.goto('/roster/summary?version=1404c604-4449-4864-832b-d083bfe6804b');
  
  // Should see the Night callout appear
  await expect(page.getByText('Night shifts aren\'t present in this roster version')).toBeVisible();
  
  // Should show token counts
  await expect(page.getByText(/Token counts:/)).toBeVisible();
  
  // Should have action buttons
  await expect(page.getByRole('button', { name: /Regenerate with Nights/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open Wizard/ })).toBeVisible();
});

test('Night callout appears in all relevant tabs', async ({ page }) => {
  await page.goto('/roster/summary?version=1404c604-4449-4864-832b-d083bfe6804b');
  
  // Check Summary tab
  await expect(page.getByText('Night shifts aren\'t present')).toBeVisible();
  
  // Check Coverage tab
  await page.click('text=Coverage');
  await expect(page.getByText('Night shifts aren\'t present')).toBeVisible();
  
  // Check Teams tab
  await page.click('text=Team Lanes');
  await expect(page.getByText('Night shifts aren\'t present')).toBeVisible();
  
  // Check Monthly Schedule tab
  await page.click('text=Monthly Schedule');
  await expect(page.getByText('Night shifts aren\'t present')).toBeVisible();
});

test('Regenerate with Nights button shows toast', async ({ page }) => {
  await page.goto('/roster/summary?version=1404c604-4449-4864-832b-d083bfe6804b');
  
  await page.click('text=Regenerate with Nights');
  
  // Should show toast notification
  await expect(page.getByText('Night shift regeneration would be triggered here')).toBeVisible();
});

test('Open Wizard button navigates correctly', async ({ page }) => {
  await page.goto('/roster/summary?version=1404c604-4449-4864-832b-d083bfe6804b');
  
  await page.click('text=Open Wizard (enable Nights)');
  
  // Should navigate to wizard with query params
  await expect(page).toHaveURL(/\/wizard\?version=.*&preset=dn/);
});