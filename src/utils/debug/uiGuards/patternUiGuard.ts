export function guardPatternUI(container: HTMLElement) {
  console.log("guardPatternUI: checking pattern UI elements");
  
  const issues: string[] = [];
  
  if (!container.querySelector('[data-testid="pattern-selector"]')) {
    issues.push("Pattern selector element not found in DOM");
  }
  
  if (!container.querySelector('[data-testid="pattern-name-input"]')) {
    issues.push("Pattern name input field not found");
  }
  
  const patternCards = container.querySelectorAll('[data-testid="pattern-card"]');
  if (patternCards.length === 0) {
    issues.push("No pattern cards found in UI");
  }
  
  if (issues.length && import.meta.env.DEV) {
    console.warn("[LegacyCreate UIGuard]", issues.join(" • "));
  }
  
  console.log("guardPatternUI: found", patternCards.length, "pattern cards, issues:", issues.length);
  
  return { issues, cardCount: patternCards.length };
}