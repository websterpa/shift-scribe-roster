import { test, expect } from '@playwright/test';

test('Wizard 12h system generates Night assignments end-to-end', async ({ page }) => {
  // Navigate to wizard
  await page.goto('/wizard');
  
  // Wait for wizard to load
  await expect(page.getByText('Roster Wizard')).toBeVisible();
  
  // Step 1: Select 12h system (should automatically include D/N)
  const systemSelect = page.locator('select').first();
  if (await systemSelect.isVisible()) {
    await systemSelect.selectOption('12h');
  }
  
  // Continue to staffing requirements
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 2: Set Day and Night shift requirements
  const dayInput = page.locator('input[id*="day"]').first();
  if (await dayInput.isVisible()) {
    await dayInput.fill('2');
  }
  
  const nightInput = page.locator('input[id*="night"]').first();
  if (await nightInput.isVisible()) {
    await nightInput.fill('2');
  }
  
  // Continue to pattern selection
  await page.getByRole('button', { name: /next/i }).click();
  
  // Step 3: Select a pattern and generate
  const continentalPattern = page.getByText('Continental', { exact: false });
  if (await continentalPattern.isVisible()) {
    await continentalPattern.click();
  }
  
  // Set roster name
  const nameInput = page.locator('input[id="rosterName"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('12h Night Test Roster');
  }
  
  // Generate roster
  const generateBtn = page.getByRole('button', { name: /generate/i });
  await generateBtn.click();
  
  // Wait for generation to complete (with generous timeout)
  await expect(page.getByText(/generation complete|success|summary/i)).toBeVisible({ 
    timeout: 45000 
  });
  
  // Should navigate to summary page
  await expect(page).toHaveURL(/\/roster\/summary/);
  
  // Verify Night assignments in summary
  // Check for Night token count display
  const nightTokenDisplay = page.locator('text=/N:\\s*[1-9]/');
  await expect(nightTokenDisplay).toBeVisible({ timeout: 10000 });
  
  // Verify debug drawer shows Night assignments (if in dev mode)
  const debugDrawer = page.locator('details:has-text("Debug")');
  if (await debugDrawer.isVisible()) {
    await debugDrawer.click();
    await expect(page.getByText(/N:/)).toBeVisible();
  }
  
  // Navigate to Teams view to verify Night chips
  await page.click('text=Team Lanes');
  await expect(page.getByText('N')).toBeVisible();
  
  // Navigate to Monthly view to verify Night assignments 
  await page.click('text=Monthly Schedule');
  await expect(page.getByText(/Night|N/)).toBeVisible();
});

test('Wizard 8h system with Night demand generates Night assignments', async ({ page }) => {
  await page.goto('/wizard');
  
  // Select 8h system
  const systemSelect = page.locator('select').first();
  if (await systemSelect.isVisible()) {
    await systemSelect.selectOption('8h');
  }
  
  await page.getByRole('button', { name: /next/i }).click();
  
  // Set Early, Late, and Night requirements
  const earlyInput = page.locator('input[id*="early"]').first();
  if (await earlyInput.isVisible()) {
    await earlyInput.fill('1');
  }
  
  const lateInput = page.locator('input[id*="late"]').first();
  if (await lateInput.isVisible()) {
    await lateInput.fill('1');
  }
  
  const nightInput = page.locator('input[id*="night"]').first();
  if (await nightInput.isVisible()) {
    await nightInput.fill('2');
  }
  
  await page.getByRole('button', { name: /next/i }).click();
  
  // Select pattern
  const pattern = page.getByText('Continental', { exact: false });
  if (await pattern.isVisible()) {
    await pattern.click();
  }
  
  const nameInput = page.locator('input[id="rosterName"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('8h Night Test Roster');
  }
  
  await page.getByRole('button', { name: /generate/i }).click();
  
  await expect(page.getByText(/generation complete|success|summary/i)).toBeVisible({ 
    timeout: 45000 
  });
  
  // Verify Night assignments exist
  const nightTokenDisplay = page.locator('text=/N:\\s*[1-9]/');
  await expect(nightTokenDisplay).toBeVisible({ timeout: 10000 });
});

test('Wizard prevents generation when no Night-eligible staff and supervisor nights disabled', async ({ page }) => {
  // This test would need to be run in an environment where all staff are supervisors
  // and allow_supervisor_nights is false - this would be integration test data setup
  
  await page.goto('/wizard');
  
  const systemSelect = page.locator('select').first();
  if (await systemSelect.isVisible()) {
    await systemSelect.selectOption('12h');
  }
  
  await page.getByRole('button', { name: /next/i }).click();
  
  // Set Night requirements
  const nightInput = page.locator('input[id*="night"]').first();
  if (await nightInput.isVisible()) {
    await nightInput.fill('1');
  }
  
  await page.getByRole('button', { name: /next/i }).click();
  
  const pattern = page.getByText('Continental', { exact: false });
  if (await pattern.isVisible()) {
    await pattern.click();
  }
  
  const nameInput = page.locator('input[id="rosterName"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('Error Test Roster');
  }
  
  await page.getByRole('button', { name: /generate/i }).click();
  
  // Should show error about no eligible staff (if test data is set up correctly)
  // This would depend on the specific test environment setup
  await expect(page.getByText(/error|failed/i)).toBeVisible({ timeout: 30000 });
});