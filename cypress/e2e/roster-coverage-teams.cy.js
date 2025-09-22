describe('Roster Coverage and Teams Tabs', () => {
  beforeEach(() => {
    cy.visit('/roster/summary?version=e3750d17-09e1-4786-8960-f25874f3e2f5');
  });

  it('navigates to Coverage tab and sees table', () => {
    // Click on Coverage tab
    cy.contains('Coverage').click();
    
    // Wait for and verify table headers are visible
    cy.contains('Day').should('be.visible');
    cy.contains('Shifts').should('be.visible');
  });

  it('navigates to Team Lanes tab and sees table', () => {
    // Click on Team Lanes tab  
    cy.contains('Team Lanes').click();
    
    // Wait for and verify team table is visible
    cy.contains('Team').should('be.visible');
    cy.get('table').should('be.visible');
  });

  it('coverage strip shows variance pills correctly', () => {
    cy.contains('Coverage').click();
    
    // Wait for data to load
    cy.wait(2000);
    
    // Look for shift variance indicators (planned/need format using regex)
    cy.get('[class*="bg-red-100"], [class*="bg-green-100"], [class*="bg-blue-100"]').should('exist');
  });

  it('team roster shows shift tokens', () => {
    cy.contains('Team Lanes').click();
    
    // Wait for data to load
    cy.wait(2000);
    
    // Look for shift tokens (D, N, E, L, R)
    cy.get('span').contains(/^[DNELR]$/).should('exist');
  });

  it('switches between all tabs successfully', () => {
    // Test all tab navigation
    cy.contains('Coverage').click();
    cy.contains('Day').should('be.visible');
    
    cy.contains('Team Lanes').click();
    cy.contains('Team').should('be.visible');
    
    cy.contains('Monthly Schedule').click();
    cy.contains('Monthly Schedule Diagnostics').should('be.visible');
    
    cy.contains('Summary').click();
    cy.contains('Version').should('be.visible');
  });
});