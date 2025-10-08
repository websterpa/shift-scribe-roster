/**
 * @scroll - Monthly page scrollability E2E test
 * 
 * Verifies that the monthly roster view is scrollable and the last day of the month
 * is reachable on any screen size.
 */

import { test, expect } from '@playwright/test';

test.describe('Monthly page scrollability @scroll', () => {
  test('should scroll to the last day of the month', async ({ page }) => {
    // Visit the monthly page for October 2025
    await page.goto('/roster/monthly?month=2025-10');
    
    // Wait for the page to load and roster data to be present
    await page.waitForSelector('[data-day]', { timeout: 10000 });
    
    // Get the main scrollable container
    const mainContainer = page.locator('main.overflow-y-auto');
    await expect(mainContainer).toBeVisible();
    
    // Record the initial scroll position
    const initialScroll = await mainContainer.evaluate(el => el.scrollTop);
    
    // Find the last day of October (31st)
    const lastDayCell = page.locator('[data-day="31"]');
    
    // Scroll to the bottom of the main container
    await mainContainer.evaluate(el => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    
    // Wait for scroll to complete
    await page.waitForTimeout(500);
    
    // Verify the last day cell is now visible
    await expect(lastDayCell).toBeVisible();
    
    // Verify we actually scrolled (scroll position changed)
    const finalScroll = await mainContainer.evaluate(el => el.scrollTop);
    expect(finalScroll).toBeGreaterThan(initialScroll);
  });

  test('should keep header sticky while scrolling', async ({ page }) => {
    await page.goto('/roster/monthly?month=2025-10');
    
    // Wait for the page to load
    await page.waitForSelector('[data-day]', { timeout: 10000 });
    
    // Get the sticky header
    const header = page.locator('header.sticky');
    await expect(header).toBeVisible();
    
    // Get initial header position
    const initialHeaderBox = await header.boundingBox();
    
    // Scroll down
    const mainContainer = page.locator('main.overflow-y-auto');
    await mainContainer.evaluate(el => {
      el.scrollTo({ top: 500, behavior: 'smooth' });
    });
    
    // Wait for scroll
    await page.waitForTimeout(500);
    
    // Header should still be visible and at the same position
    await expect(header).toBeVisible();
    const finalHeaderBox = await header.boundingBox();
    
    // Header should remain at the top (sticky behavior)
    expect(finalHeaderBox?.y).toBe(initialHeaderBox?.y);
  });

  test('should be able to use Jump to Bottom button', async ({ page }) => {
    await page.goto('/roster/monthly?month=2025-10');
    
    // Wait for the page to load
    await page.waitForSelector('[data-day]', { timeout: 10000 });
    
    // Click "Jump to Bottom" button
    const jumpButton = page.getByRole('button', { name: 'Jump to Bottom' });
    await expect(jumpButton).toBeVisible();
    await jumpButton.click();
    
    // Wait for scroll
    await page.waitForTimeout(500);
    
    // Last day should be visible
    const lastDayCell = page.locator('[data-day="31"]');
    await expect(lastDayCell).toBeVisible();
  });

  test('should be able to use Jump to Today button', async ({ page }) => {
    await page.goto('/roster/monthly?month=2025-10');
    
    // Wait for the page to load
    await page.waitForSelector('[data-day]', { timeout: 10000 });
    
    // Only run if today is in October 2025
    const todayCell = page.locator('[data-today]');
    const todayExists = await todayCell.count() > 0;
    
    if (todayExists) {
      // Scroll to bottom first
      const mainContainer = page.locator('main.overflow-y-auto');
      await mainContainer.evaluate(el => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
      });
      
      // Click "Jump to Today" button
      const jumpButton = page.getByRole('button', { name: 'Jump to Today' });
      await jumpButton.click();
      
      // Wait for scroll
      await page.waitForTimeout(500);
      
      // Today cell should be visible
      await expect(todayCell).toBeVisible();
    }
  });
});
