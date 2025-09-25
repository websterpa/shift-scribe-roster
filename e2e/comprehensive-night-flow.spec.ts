import { test, expect } from '@playwright/test';

test('Comprehensive Night Flow - Wizard to Summary', async ({ page }) => {
  // Navigate to wizard
  await page.goto('/wizard');
  
  // Step 1 - Select 8h system (includes Nights)
  await page.click('text=8 Hour System');
  await expect(page.getByText('8h (E/L/N)')).toBeVisible();
  await page.click('button:has-text("Next")');
  
  // Step 2 - Configure staff and set night shift requirements
  await page.fill('input[id="staffCount"]', '6');
  await page.fill('input[id="night_shift_staff_8h"]', '2');
  await page.fill('input[id="early_shift_staff"]', '2');
  await page.fill('input[id="late_shift_staff"]', '2');
  await page.click('button:has-text("Next")');
  
  // Step 3 - Select pattern and generate
  await page.click('text=Continental (7-day)');
  await page.fill('input[id="rosterName"]', 'Comprehensive Night Test');
  
  // Generate roster
  await page.click('button:has-text("Generate Roster")');
  
  // Wait for generation to complete
  await expect(page.getByText(/Generation complete|success/i)).toBeVisible({ timeout: 45000 });
  
  // Navigate to roster summary
  await expect(page).toHaveURL(/\/roster\/summary\?version=/);
  
  // Check Debug Drawer shows correct data
  await expect(page.getByText('Debug: tokens & Night gap')).toBeVisible();
  await page.click('summary:has-text("Debug: tokens & Night gap")');
  
  // Verify Requirements and Assignments show N tokens
  await expect(page.getByText(/Requirements:.*N:[1-9]/)).toBeVisible();
  await expect(page.getByText(/Assignments:.*N:[1-9]/)).toBeVisible();
  
  // Verify Night gap shows need=planned (no gap)
  await expect(page.getByText(/Night gap:.*gap:0/)).toBeVisible();
  
  // Check Night Diagnostic Banner shows success
  await expect(page.getByText('Night Shifts Working Correctly')).toBeVisible();
  
  // Verify Summary tab shows N tokens
  await expect(page.getByText(/N:[1-9]/)).toBeVisible();
  
  // Test Coverage tab
  await page.click('text=Coverage');
  await expect(page.getByText('N')).toBeVisible();
  
  // Test Team Lanes tab
  await page.click('text=Team Lanes');
  await expect(page.getByText('N')).toBeVisible();
  
  // Test Monthly Schedule tab  
  await page.click('text=Monthly Schedule');
  await expect(page.getByText(/Night.*N/)).toBeVisible();
  
  console.log('✅ Comprehensive night flow test passed');
});

test('Night Flow Error Handling - No Eligible Staff', async ({ page }) => {
  // This test verifies error handling when nights are required but no staff can work them
  await page.goto('/wizard');
  
  // Configure to require nights but restrict staff
  await page.click('text=12 Hour System');
  await page.click('button:has-text("Next")');
  
  // Set up scenario with supervisor-only staff (assuming supervisor nights disabled by default)
  await page.fill('input[id="staffCount"]', '1');
  await page.fill('input[id="night_shift_staff"]', '1'); // Require nights
  await page.click('button:has-text("Next")');
  
  await page.click('text=Continental (7-day)');
  await page.fill('input[id="rosterName"]', 'Error Test Roster');
  
  // Try to generate - should fail with specific error
  await page.click('button:has-text("Generate Roster")');
  
  // Expect specific error message about night readiness
  await expect(page.getByText(/Night readiness check failed/)).toBeVisible({ timeout: 30000 });
  
  console.log('✅ Night error handling test passed');
});

test('Mock Data Removal - No Fallbacks', async ({ page }) => {
  // Navigate to a roster summary with invalid version ID
  await page.goto('/roster/summary?version=invalid-version-id');
  
  // Should show real error, not mock data
  await expect(page.getByText(/Coverage query returned no data|Failed to load|error/i)).toBeVisible();
  
  // Should not show any mock coverage strips or placeholder data
  await expect(page.getByText('Mock')).not.toBeVisible();
  await expect(page.getByText('Demo')).not.toBeVisible();
  
  console.log('✅ Mock data removal test passed');
});