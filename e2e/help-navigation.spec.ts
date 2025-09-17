import { test, expect } from '@playwright/test';

test.describe('Help & Support navigation', () => {
  test('opens Help & Support from main nav', async ({ page }) => {
    await page.goto('/');

    // Click "Help & Support" in the main nav
    await page.getByRole('link', { name: /Help & Support/i }).click();

    // Assert we're on the Help page
    await expect(page.getByRole('heading', { name: /Help & Support/i })).toBeVisible();
    await expect(page).toHaveURL(/\/help/i); // adjust if your path differs
  });

  test('Back to Dashboard returns to "/"', async ({ page }) => {
    await page.goto('/help'); // or /help-support

    // Click the back link
    await page.getByRole('link', { name: /Back to Dashboard/i }).click();

    // Assert dashboard visible; adjust selector/text to your dashboard
    await expect(page).toHaveURL(/\/$/);
    // Example: dashboard heading or element:
    // await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });
});