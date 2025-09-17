import { test, expect } from '@playwright/test';

test.describe('Help & Support Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
  });

  test('can navigate from main navigation to Help & Support', async ({ page }) => {
    // Find and click the Help & Support link in navigation
    await page.getByRole('link', { name: /help & support/i }).click();

    // Verify we're on the help page
    await expect(page).toHaveURL('/help');
    
    // Verify the main heading is present
    await expect(page.getByRole('heading', { name: /help & support/i })).toBeVisible();
  });

  test('can navigate back to dashboard from Help page', async ({ page }) => {
    // Go to help page first
    await page.goto('/help');
    
    // Verify we're on the help page
    await expect(page.getByRole('heading', { name: /help & support/i })).toBeVisible();
    
    // Click the Back to Dashboard link
    await page.getByRole('link', { name: /back to dashboard/i }).click();
    
    // Verify we're back on the dashboard
    await expect(page).toHaveURL('/');
  });

  test('help navigation link is visible in main navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify Help & Support link exists in navigation
    await expect(page.getByRole('link', { name: /help & support/i })).toBeVisible();
  });

  test('help page has search functionality', async ({ page }) => {
    await page.goto('/help');
    
    // Verify search input is present
    await expect(page.getByPlaceholder(/search help topics/i)).toBeVisible();
    
    // Test search functionality
    await page.getByPlaceholder(/search help topics/i).fill('roster');
    
    // Should show filtered results (at least one section should remain visible)
    await expect(page.getByRole('button', { name: /core features/i })).toBeVisible();
  });

  test('help page accordion sections are interactive', async ({ page }) => {
    await page.goto('/help');
    
    // Find a section that should be expandable
    const coreSection = page.getByRole('button', { name: /core features/i });
    await expect(coreSection).toBeVisible();
    
    // Check if content is visible or hidden initially
    const isContentVisible = await page.getByText(/roster generation/i).isVisible();
    
    // Click to toggle the section
    await coreSection.click();
    
    // Content visibility should change
    const isContentVisibleAfterClick = await page.getByText(/roster generation/i).isVisible();
    expect(isContentVisible).not.toBe(isContentVisibleAfterClick);
  });
});