import { test, expect } from '@playwright/test';

test.describe('Guided Roster Builder v2', () => {
  test('generates 12h roster with D/N shifts successfully', async ({ page }) => {
    await page.goto('/roster/builder');
    
    // Wait for page to load
    await expect(page.getByText('Guided Roster Builder v2')).toBeVisible();
    
    // Select 12h system
    await page.getByLabel('Shift System').click();
    await page.getByText('12 Hour (D/N)').click();
    
    // Set pattern to 2D-2N-4R
    await page.getByLabel('Pattern Sequence').fill('DDNNRRRR');
    
    // Verify pattern preview shows D and N tokens
    await expect(page.locator('text=Day')).toBeVisible();
    await expect(page.locator('text=Night')).toBeVisible();
    
    // Open staffing section and verify D/N columns are shown
    const staffingSection = page.locator('text=3. Staffing Requirements').locator('..').locator('..');
    await staffingSection.click();
    
    await expect(page.locator('text=Day').nth(1)).toBeVisible(); // Column header
    await expect(page.locator('text=Night').nth(1)).toBeVisible(); // Column header
    
    // Set some night requirements
    const mondayNightInput = page.locator('input').nth(9); // Approximate Monday Night input
    await mondayNightInput.fill('2');
    
    // Wait for preview to update
    await page.waitForTimeout(1000);
    
    // Verify live preview shows night count
    await expect(page.locator('text=Night Shifts')).toBeVisible();
    
    // Generate roster
    await page.getByRole('button', { name: /Generate Roster/ }).click();
    
    // Should not see constraint errors
    await expect(page.locator('text=constraint')).toHaveCount(0);
    await expect(page.locator('text=CHECK')).toHaveCount(0);
    
    // Should see success (either redirect to summary or success message)
    await page.waitForURL(/\/roster\/summary/, { timeout: 15000 });
  });

  test('generates 8h roster with E/L/N shifts successfully', async ({ page }) => {
    await page.goto('/roster/builder');
    
    // Wait for page to load
    await expect(page.getByText('Guided Roster Builder v2')).toBeVisible();
    
    // Default should be 8h system
    await expect(page.locator('text=8 Hour (E/L/N)')).toBeVisible();
    
    // Set pattern
    await page.getByLabel('Pattern Sequence').fill('EELLNNRRRR');
    
    // Verify preview shows E, L, N tokens
    await expect(page.locator('text=Early')).toBeVisible();
    await expect(page.locator('text=Late')).toBeVisible(); 
    await expect(page.locator('text=Night')).toBeVisible();
    
    // Open staffing section
    const staffingSection = page.locator('text=3. Staffing Requirements').locator('..').locator('..');
    await staffingSection.click();
    
    // Should show E/L/N columns
    await expect(page.locator('text=Early').nth(1)).toBeVisible();
    await expect(page.locator('text=Late').nth(1)).toBeVisible();
    await expect(page.locator('text=Night').nth(1)).toBeVisible();
    
    // Generate roster
    await page.getByRole('button', { name: /Generate Roster/ }).click();
    
    // Should succeed without constraint errors
    await expect(page.locator('text=constraint')).toHaveCount(0);
    await expect(page.locator('text=CHECK')).toHaveCount(0);
    
    await page.waitForURL(/\/roster\/summary/, { timeout: 15000 });
  });

  test('validates shift-set consistency', async ({ page }) => {
    await page.goto('/roster/builder');
    
    // Select 12h system
    await page.getByLabel('Shift System').click();
    await page.getByText('12 Hour (D/N)').click();
    
    // Try to set 8h pattern with 12h system
    await page.getByLabel('Pattern Sequence').fill('EELLNN');
    
    // Should show validation warning
    await expect(page.locator('text=Inconsistent shift-set')).toBeVisible({ timeout: 2000 });
    
    // Generate button should be disabled
    await expect(page.getByRole('button', { name: /Generate Roster/ })).toBeDisabled();
  });

  test('validates night eligibility when supervisors only', async ({ page }) => {
    await page.goto('/roster/builder');
    
    // Select 12h system (requires nights)
    await page.getByLabel('Shift System').click();
    await page.getByText('12 Hour (D/N)').click();
    
    // Set pattern with nights
    await page.getByLabel('Pattern Sequence').fill('DDNN');
    
    // Wait for validation
    await page.waitForTimeout(1000);
    
    // If all staff are supervisors and supervisor nights disabled, should warn
    const hasWarning = await page.locator('text=No staff eligible for Night shifts').isVisible();
    if (hasWarning) {
      // Enable supervisor nights
      const ratesSection = page.locator('text=4. Rates & Settings').locator('..').locator('..');
      await ratesSection.click();
      
      await page.getByRole('checkbox', { name: /Allow supervisors on night shifts/ }).check();
      
      // Warning should disappear
      await expect(page.locator('text=No staff eligible for Night shifts')).toHaveCount(0, { timeout: 2000 });
    }
  });

  test('shows deprecation banner on legacy wizard', async ({ page }) => {
    await page.goto('/wizard');
    
    // Should show deprecation banner
    await expect(page.locator('text=This wizard is deprecated')).toBeVisible();
    await expect(page.getByRole('button', { name: /Try New Builder/ })).toBeVisible();
    
    // Click to go to new builder
    await page.getByRole('button', { name: /Try New Builder/ }).click();
    await expect(page).toHaveURL('/roster/builder');
  });

  test('legacy wizard still works with legacy=1', async ({ page }) => {
    await page.goto('/wizard?legacy=1');
    
    // Should not show deprecation banner
    await expect(page.locator('text=This wizard is deprecated')).toHaveCount(0);
    
    // Should show the actual wizard content
    await expect(page.locator('text=Configuration Wizard')).toBeVisible();
  });
});