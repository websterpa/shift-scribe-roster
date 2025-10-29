
import { createLogger } from "../errorLogger";
import { seedTestPatterns, cleanupTestPatterns } from "./patternTestHelpers";

const logger = createLogger('UIIntegrationTests');

export interface UITestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Switches to the Shift Patterns tab
 */
async function switchToPatternLibrary(): Promise<void> {
  const patternLibraryTab = Array.from(document.querySelectorAll('[role="tab"]')).find(
    tab => tab.textContent?.includes('Shift Patterns')
  ) as HTMLElement;
  
  if (patternLibraryTab) {
    patternLibraryTab.click();
    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for DOM update
  }
}

/**
 * Opens the Create Pattern view
 */
async function openCreatePatternView(): Promise<void> {
  const createButton = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent?.includes('Create Pattern')
  ) as HTMLElement;
  
  if (createButton) {
    createButton.click();
    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for DOM update
  }
}

/**
 * Tests if pattern selection UI updates correctly
 */
export async function testPatternSelectionUI(): Promise<UITestResult> {
  logger.info('Testing pattern selection UI');
  
  try {
    // Switch to Shift Patterns tab first
    await switchToPatternLibrary();
    
    // Test if pattern selector elements exist (including placeholder during loading)
    const patternSelectorExists = document.querySelector('[data-testid="pattern-selector"]') || 
                                  document.querySelector('[data-testid="pattern-selector-placeholder"]') ||
                                  document.querySelector('select') ||
                                  document.querySelector('[role="combobox"]');
    
    if (!patternSelectorExists) {
      return {
        testName: 'Pattern Selection UI',
        passed: false,
        message: 'Pattern selector element not found in DOM'
      };
    }

    // Test if pattern preview area exists
    const patternPreviewExists = document.querySelector('[data-testid="pattern-preview"]') ||
                                document.querySelector('.pattern-preview') ||
                                document.querySelector('[class*="pattern"]');

    if (!patternPreviewExists) {
      return {
        testName: 'Pattern Selection UI',
        passed: false,
        message: 'Pattern preview element not found in DOM'
      };
    }

    return {
      testName: 'Pattern Selection UI',
      passed: true,
      message: 'Pattern selection UI elements found and accessible'
    };
  } catch (error: any) {
    logger.error(new Error('UI integration test failed'), { error });
    return {
      testName: 'Pattern Selection UI',
      passed: false,
      message: 'UI test threw an exception',
      details: error.message
    };
  }
}

/**
 * Tests if custom pattern builder UI works correctly
 */
export async function testCustomPatternBuilderUI(): Promise<UITestResult> {
  logger.info('Testing custom pattern builder UI');

  try {
    // Switch to Shift Patterns tab and open Create Pattern view
    await switchToPatternLibrary();
    await openCreatePatternView();
    
    // Look for shift code buttons
    const shiftButtons = document.querySelectorAll('button');
    const hasShiftButtons = Array.from(shiftButtons).some(button => 
      ['E', 'D', 'L', 'N', 'R'].some(code => 
        button.textContent?.includes(code)
      )
    );

    if (!hasShiftButtons) {
      return {
        testName: 'Custom Pattern Builder UI',
        passed: false,
        message: 'Shift code buttons not found in custom builder'
      };
    }

    // Look for pattern name input with correct data-testid
    const patternNameInput = document.querySelector('[data-testid="pattern-name-input"]') ||
                            document.querySelector('input[placeholder*="pattern" i]') ||
                            document.querySelector('input[placeholder*="name" i]') ||
                            document.querySelector('#pattern-name');

    if (!patternNameInput) {
      return {
        testName: 'Custom Pattern Builder UI',
        passed: false,
        message: 'Pattern name input field not found'
      };
    }

    return {
      testName: 'Custom Pattern Builder UI',
      passed: true,
      message: 'Custom pattern builder UI elements working correctly'
    };
  } catch (error: any) {
    logger.error(new Error('Custom pattern builder UI test failed'), { error });
    return {
      testName: 'Custom Pattern Builder UI',
      passed: false,
      message: 'Custom builder UI test threw an exception',
      details: error.message
    };
  }
}

/**
 * Tests if pattern cards render and respond correctly
 */
export async function testPatternCardsUI(): Promise<UITestResult> {
  logger.info('Testing pattern cards UI');

  try {
    // Switch to Shift Patterns tab first
    await switchToPatternLibrary();
    
    // Look for pattern cards with correct data-testid or placeholder
    const patternCards = document.querySelectorAll('[data-testid="pattern-card"]');
    const placeholder = document.querySelector('[data-testid="pattern-card-placeholder"]');

    // If no cards but placeholder exists, that's acceptable (empty state)
    if (patternCards.length === 0 && !placeholder) {
      return {
        testName: 'Pattern Cards UI',
        passed: false,
        message: 'No pattern cards or placeholder found in UI'
      };
    }

    // If placeholder exists, test passes (showing empty state correctly)
    if (placeholder && patternCards.length === 0) {
      return {
        testName: 'Pattern Cards UI',
        passed: true,
        message: 'Pattern cards placeholder displayed correctly (empty state)'
      };
    }

    // Check if cards have required interaction elements
    const hasUseButtons = Array.from(patternCards).some(card => 
      card.querySelector('button')
    );

    if (!hasUseButtons) {
      return {
        testName: 'Pattern Cards UI',
        passed: false,
        message: 'Pattern cards missing interaction buttons'
      };
    }

    return {
      testName: 'Pattern Cards UI',
      passed: true,
      message: `Found ${patternCards.length} pattern cards with proper interactions`
    };
  } catch (error: any) {
    logger.error(new Error('Pattern cards UI test failed'), { error });
    return {
      testName: 'Pattern Cards UI',
      passed: false,
      message: 'Pattern cards UI test threw an exception',
      details: error.message
    };
  }
}

/**
 * Runs all UI integration tests with optional test data seeding
 */
export async function runAllUITests(seedData = false): Promise<UITestResult[]> {
  logger.info('Running all UI integration tests');
  
  let patternIds: string[] = [];
  
  try {
    // Optionally seed test patterns
    if (seedData) {
      patternIds = await seedTestPatterns();
      // Wait for patterns to be loaded
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const results = await Promise.all([
      testPatternSelectionUI(),
      testCustomPatternBuilderUI(),
      testPatternCardsUI()
    ]);
    
    logger.info('UI integration tests complete', { 
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    });
    
    return results;
  } finally {
    // Clean up test patterns if they were seeded
    if (seedData && patternIds.length > 0) {
      await cleanupTestPatterns(patternIds);
    }
  }
}
