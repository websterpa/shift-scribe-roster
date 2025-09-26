import { test, expect } from "@playwright/test";

test("Legacy Create shows pattern selector & inputs", async ({ page }) => {
  // Navigate to legacy create page
  await page.goto("/roster/create");
  
  // Check page loads correctly
  await expect(page.getByText("Create Roster")).toBeVisible();
  await expect(page.getByText("Legacy roster creation interface")).toBeVisible();
  
  // Check required UI elements are present
  await expect(page.getByTestId("pattern-selector")).toBeVisible();
  await expect(page.getByTestId("pattern-name-input")).toBeVisible();
  
  // Check pattern cards section exists
  await expect(page.getByText("Available Patterns")).toBeVisible();
  
  // Check generate button exists but is disabled without selection
  const generateBtn = page.getByRole("button", { name: "Generate Roster" });
  await expect(generateBtn).toBeVisible();
  await expect(generateBtn).toBeDisabled();
});

test("Pattern selection enables generate button", async ({ page }) => {
  await page.goto("/roster/create");
  
  // Wait for patterns to load (may be empty)
  await page.waitForSelector('[data-testid="pattern-selector"]');
  
  // If patterns are available, test selection
  const patternOptions = await page.locator('[data-testid="pattern-selector"] option').count();
  
  if (patternOptions > 1) { // More than just the "Choose a pattern..." option
    // Select first real pattern
    await page.selectOption('[data-testid="pattern-selector"]', { index: 1 });
    
    // Generate button should now be enabled
    const generateBtn = page.getByRole("button", { name: "Generate Roster" });
    await expect(generateBtn).toBeEnabled();
  }
});

test("Custom pattern name input works", async ({ page }) => {
  await page.goto("/roster/create");
  
  const customNameInput = page.getByTestId("pattern-name-input");
  await expect(customNameInput).toBeVisible();
  
  await customNameInput.fill("Test Pattern 3D-3R-3N-3R");
  await expect(customNameInput).toHaveValue("Test Pattern 3D-3R-3N-3R");
});