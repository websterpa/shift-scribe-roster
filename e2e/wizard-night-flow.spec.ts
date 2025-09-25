import { test, expect } from '@playwright/test';

test('Wizard with Nights generates proper Night tokens', async ({ page }) => {
  // Navigate to wizard
  await page.goto('/wizard?preset=dn');
  
  // Step 1 - Select 8h system (should include Nights)
  await expect(page.getByText('8h (E/L/N)')).toBeVisible();
  
  // Continue through wizard steps
  await page.click('button:has-text("Next")');
  
  // Step 2 - Ensure night shift staffing is set
  const nightInput = page.locator('input[id="night_shift_staff_8h"]');
  await expect(nightInput).toBeVisible();
  await nightInput.fill('2');
  
  await page.click('button:has-text("Next")');
  
  // Step 3 - Select a pattern that includes N
  await page.click('text=Continental (7-day)');
  
  // Generate roster
  await page.fill('input[id="rosterName"]', 'Night Test Roster');
  await page.click('button:has-text("Generate Roster")');
  
  // Wait for generation to complete
  await expect(page.getByText(/Generation complete|success/i)).toBeVisible({ timeout: 30000 });
  
  // Navigate to roster summary
  await expect(page).toHaveURL(/\/roster\/summary\?version=/);
  
  // Verify Summary shows Night tokens
  await expect(page.getByText('N:')).toBeVisible();
  const nightCount = await page.locator('text=/N:\\d+/').textContent();
  expect(nightCount).toMatch(/N:[1-9]\d*/); // N: followed by a positive number
  
  // Verify Teams tab shows Night tokens
  await page.click('text=Team Lanes');
  await expect(page.getByText('N')).toBeVisible();
  
  // Verify Monthly tab shows Night assignments
  await page.click('text=Monthly Schedule');
  await expect(page.getByText('Night (N)')).toBeVisible();
});