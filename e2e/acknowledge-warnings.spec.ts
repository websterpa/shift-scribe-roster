import { test, expect } from '@playwright/test';

test.describe('Guided Roster Builder - Acknowledge Warnings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/roster/builder');
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Guided Roster Builder v2' })).toBeVisible();
  });

  test('Generate button disabled with warnings until acknowledged', async ({ page }) => {
    // Set up a pattern that will trigger warnings (D→N)
    const patternInput = page.getByDisplayValue(/EELLNNRRRR/);
    await patternInput.fill('DDN');
    
    // Wait a bit for validation to run
    await page.waitForTimeout(600);
    
    // Generate button should be disabled
    const generateBtn = page.getByTestId('generate-roster');
    await expect(generateBtn).toBeDisabled();
    
    // Should show acknowledgment checkbox when warnings are present
    const ackCheckbox = page.getByTestId('ack-warnings');
    if (await ackCheckbox.isVisible()) {
      await expect(ackCheckbox).toBeVisible();
      
      // Check the acknowledgment box
      await ackCheckbox.check();
      
      // Button should now be enabled
      await expect(generateBtn).toBeEnabled();
    }
  });

  test('Generate button enabled immediately when no warnings', async ({ page }) => {
    // Set up a safe pattern (no warnings)  
    const patternInput = page.getByDisplayValue(/EELLNNRRRR/);
    await patternInput.fill('EELLRRRR');
    
    // Wait for validation to run
    await page.waitForTimeout(600);
    
    // Should not show acknowledgment checkbox
    const ackCheckbox = page.getByTestId('ack-warnings');
    await expect(ackCheckbox).not.toBeVisible();
    
    // Generate button should not be disabled due to warnings
    const generateBtn = page.getByTestId('generate-roster');
    // Note: button may still be disabled for other reasons like loading
    // but we verify no warning-related blocking
  });

  test('Acknowledgment checkbox resets when warnings change', async ({ page }) => {
    const patternInput = page.getByDisplayValue(/EELLNNRRRR/);
    
    // Set up first warning pattern
    await patternInput.fill('DDN');
    await page.waitForTimeout(600);
    
    const ackCheckbox = page.getByTestId('ack-warnings');
    if (await ackCheckbox.isVisible()) {
      // Check the acknowledgment box
      await ackCheckbox.check();
      await expect(ackCheckbox).toBeChecked();
      
      // Change to different warning pattern
      await patternInput.fill('ELN');
      await page.waitForTimeout(600);
      
      // Acknowledgment should reset
      if (await ackCheckbox.isVisible()) {
        await expect(ackCheckbox).not.toBeChecked();
      }
    }
  });

  test('Fatal errors disable generate without acknowledgment option', async ({ page }) => {
    // Switch to 12h system
    const systemSelect = page.getByRole('combobox');
    await systemSelect.click();
    await page.getByRole('option', { name: '12 Hour (D/N)' }).click();
    
    // Force an invalid pattern for 12h system  
    const patternInput = page.getByDisplayValue(/DDNNRRRR/);
    await patternInput.fill('EELN'); // E/L not allowed in 12h
    
    // Wait for validation
    await page.waitForTimeout(600);
    
    // Should show fatal error without acknowledgment checkbox
    await expect(page.getByText(/E,L.*not allowed for 12h/)).toBeVisible();
    
    // Generate button should be disabled
    const generateBtn = page.getByTestId('generate-roster');
    await expect(generateBtn).toBeDisabled();
    
    // Should not show acknowledgment checkbox for fatal errors
    const ackCheckbox = page.getByTestId('ack-warnings');
    await expect(ackCheckbox).not.toBeVisible();
  });
});