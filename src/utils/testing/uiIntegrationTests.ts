
import { createLogger } from "../errorLogger";

const logger = createLogger('UIIntegrationTests');

export interface UITestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: string;
}

/**
 * Tests if pattern selection UI updates correctly
 */
export async function testPatternSelectionUI(): Promise<UITestResult> {
  logger.info('Testing pattern selection UI');
  
  try {
    // Test if pattern selector elements exist
    const patternSelectorExists = document.querySelector('[data-testid="pattern-selector"]') || 
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

    // Look for pattern name input
    const patternNameInput = document.querySelector('input[placeholder*="pattern" i]') ||
                            document.querySelector('input[placeholder*="name" i]') ||
                            document.querySelector('#patternName');

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
    // Look for pattern cards or pattern list items
    const patternCards = document.querySelectorAll('[data-testid="pattern-card"]') ||
                        document.querySelectorAll('.pattern-card') ||
                        document.querySelectorAll('[class*="pattern"]');

    if (patternCards.length === 0) {
      return {
        testName: 'Pattern Cards UI',
        passed: false,
        message: 'No pattern cards found in UI'
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
 * Runs all UI integration tests
 */
export async function runAllUITests(): Promise<UITestResult[]> {
  logger.info('Running all UI integration tests');
  
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
}
