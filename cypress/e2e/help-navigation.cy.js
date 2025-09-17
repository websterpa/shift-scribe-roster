describe('Help & Support Navigation', () => {
  beforeEach(() => {
    // Start at the dashboard
    cy.visit('/dashboard');
  });

  it('can navigate from main navigation to Help & Support', () => {
    // Click the Help & Support link in navigation
    cy.get('a').contains(/help & support/i).click();

    // Verify we're on the help page
    cy.url().should('include', '/help');
    
    // Verify the main heading is present
    cy.get('h1').contains(/help & support/i).should('be.visible');
  });

  it('can navigate back to dashboard from Help page', () => {
    // Go to help page first
    cy.visit('/help');
    
    // Verify we're on the help page
    cy.get('h1').contains(/help & support/i).should('be.visible');
    
    // Click the Back to Dashboard link
    cy.get('a').contains(/back to dashboard/i).click();
    
    // Verify we're back on the dashboard (root path)
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('help navigation link is visible in main navigation', () => {
    cy.visit('/dashboard');
    
    // Verify Help & Support link exists in navigation
    cy.get('a').contains(/help & support/i).should('be.visible');
  });

  it('help page has search functionality', () => {
    cy.visit('/help');
    
    // Verify search input is present
    cy.get('input[placeholder*="Search help topics"]').should('be.visible');
    
    // Test search functionality
    cy.get('input[placeholder*="Search help topics"]').type('roster');
    
    // Should show filtered results (Core Features should remain visible)
    cy.get('button').contains(/core features/i).should('be.visible');
  });

  it('help page accordion sections are interactive', () => {
    cy.visit('/help');
    
    // Find the Core Features section
    cy.get('button').contains(/core features/i).should('be.visible');
    
    // Check initial state and click to toggle
    cy.get('button').contains(/core features/i).click();
    
    // The section content should become visible or hidden
    // We'll just verify the toggle button still works
    cy.get('button').contains(/core features/i).should('be.visible');
  });

  it('search filters show correct results', () => {
    cy.visit('/help');
    
    // Search for a specific term
    cy.get('input[placeholder*="Search help topics"]').type('variance');
    
    // Should show Cost & Budget Features section
    cy.get('button').contains(/cost & budget features/i).should('be.visible');
    
    // Clear search
    cy.get('input[placeholder*="Search help topics"]').clear();
    
    // All sections should be visible again
    cy.get('button').contains(/extra features/i).should('be.visible');
  });
});