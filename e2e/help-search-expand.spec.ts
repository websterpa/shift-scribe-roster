import { test, expect } from '@playwright/test';

test.describe('Help & Support: search then expand to view body text', () => {
  test('filters, expands matching accordion, and shows body text', async ({ page }) => {
    await page.goto('/help');

    // Ensure page is loaded
    await expect(page.getByRole('heading', { name: /Help & Support/i })).toBeVisible();

    // Filter by a distinctive term from the Cost & Budget section
    const search = page.getByPlaceholder('Search help topics...');
    await search.fill('variance');

    // Matching header remains
    const budgetHeader = page.getByRole('button', { name: /Cost & Budget Features/i });
    await expect(budgetHeader).toBeVisible();

    // Ensure unrelated headers are filtered out
    await expect(page.getByRole('button', { name: /Extra Features/i })).toHaveCount(0);

    // Expand the matching section (toggle)
    await budgetHeader.click();

    // Body text should be visible now (use a robust substring)
    await expect(page.getByText(/Budget variance/i)).toBeVisible();
    // Alternative or additional assertion if wording differs:
    // await expect(page.getByText(/threshold/i)).toBeVisible();
  });
});