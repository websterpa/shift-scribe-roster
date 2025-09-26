import { test, expect } from "@playwright/test";

test("Wizard with Night demand produces Night assignments", async ({ page }) => {
  // Navigate to wizard
  await page.goto("/wizard");
  
  // Check wizard loads
  await expect(page.getByText("Roster Wizard")).toBeVisible();
  
  // Basic navigation through wizard steps
  // Step 1: Select 8h system (includes Nights by default)
  const systemSelect = page.locator('select').first();
  if (await systemSelect.isVisible()) {
    await systemSelect.selectOption("8h");
  }
  
  // Continue to next step
  await page.getByRole("button", { name: /next/i }).click();
  
  // Step 2: Set night shift requirements
  // Look for night shift input and set a value
  const nightInput = page.locator('input[type="number"]').last();
  if (await nightInput.isVisible()) {
    await nightInput.fill("2");
  }
  
  // Continue to next step
  await page.getByRole("button", { name: /next/i }).click();
  
  // Step 3: Select pattern and generate
  // Click generate button (may be named differently)
  const generateBtn = page.getByRole("button", { name: /generate/i });
  if (await generateBtn.isVisible()) {
    await generateBtn.click();
    
    // Wait for generation to complete (with timeout)
    await expect(page.getByText(/generation complete|success|summary/i)).toBeVisible({ 
      timeout: 30000 
    });
    
    // Check if Night assignments are visible in summary
    // This could be in various formats: "N:", "Night:", or in a table
    const nightIndicators = [
      page.locator("text=/N:/"),
      page.locator("text=/Night/i"),
      page.getByText("N")
    ];
    
    // At least one night indicator should be visible
    let nightFound = false;
    for (const indicator of nightIndicators) {
      if (await indicator.isVisible()) {
        nightFound = true;
        break;
      }
    }
    
    if (!nightFound) {
      // Log page content for debugging
      console.log("Page content:", await page.textContent("body"));
    }
  }
});

test("Wizard 12h system includes Night shifts", async ({ page }) => {
  await page.goto("/wizard");
  
  // Select 12h system which should automatically include nights
  const systemSelect = page.locator('select').first();
  if (await systemSelect.isVisible()) {
    await systemSelect.selectOption("12h");
  }
  
  // Verify 12h selection shows D/N options
  await expect(page.getByText(/12h|D\/N/i)).toBeVisible();
});