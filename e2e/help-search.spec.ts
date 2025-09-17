import { test, expect } from '@playwright/test';

test.describe('Help & Support search filtering', () => {
  test('typing a term filters visible accordion headers (Playwright)', async ({ page }) => {
    // Go straight to the Help page
    await page.goto('/help');

    // Sanity: page loaded
    await expect(page.getByRole('heading', { name: /Help & Support/i })).toBeVisible();

    // Find the search box by placeholder and type a unique term
    const search = page.getByPlaceholder('Search help topics...');
    await expect(search).toBeVisible();
    await search.fill('variance');

    // Expect the matching section to remain
    await expect(page.getByRole('button', { name: /Cost & Budget Features/i })).toBeVisible();

    // Expect some unrelated headers to be filtered out
    await expect(page.getByRole('button', { name: /Extra Features/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Toast Notifications/i })).toHaveCount(0);

    // Clear the search and confirm all headers return
    await search.fill('');
    await expect(page.getByRole('button', { name: /Extra Features/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Toast Notifications/i })).toBeVisible();
  });
});