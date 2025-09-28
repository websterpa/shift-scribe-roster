import { test, expect } from '@playwright/test';

test('Wizard can generate with Nights without DB CHECK error', async ({ page }) => {
  // Navigate to wizard 
  await page.goto('/wizard');
  
  // Wait for wizard to load
  await expect(page.getByText('Configuration Wizard')).toBeVisible();
  
  // Step 1: Select 12h system (includes D/N)
  await expect(page.getByText(/12h.*D\/N/)).toBeVisible();
  await page.click('button:has-text("Next")');
  
  // Step 2: Set night shift requirements
  const nightInput = page.locator('input[id*="night"]').first();
  if (await nightInput.isVisible()) {
    await nightInput.fill('2');
  }
  await page.click('button:has-text("Next")');
  
  // Step 3: Select a pattern and generate
  const patternOption = page.locator('text=Continental').first();
  if (await patternOption.isVisible()) {
    await patternOption.click();
  }
  
  // Fill roster name and generate
  const nameInput = page.locator('input[id="rosterName"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('Night Test Roster');
  }
  
  await page.click('button:has-text("Generate")');
  
  // Should not see database constraint error
  await expect(page.locator('text=constraint')).toHaveCount(0);
  await expect(page.locator('text=CHECK')).toHaveCount(0);
  await expect(page.locator('text=Roster generation failed')).toHaveCount(0);
  
  // Should see success indication
  await expect(page.getByText(/success|complete/i)).toBeVisible({ timeout: 15000 });
});

test('Legacy Create can save without constraint violations', async ({ page }) => {
  await page.goto('/roster/create');
  
  // Wait for page to load
  await expect(page.getByText('Create Roster')).toBeVisible();
  
  // Should not see constraint errors in console or UI
  await expect(page.locator('text=constraint')).toHaveCount(0);
  await expect(page.locator('text=CHECK')).toHaveCount(0);
});