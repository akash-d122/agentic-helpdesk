/**
 * Ticket Workflow E2E Tests
 */

const { test, expect } = require('@playwright/test');

test.describe('Ticket Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as customer for ticket creation tests
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'customer@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a new ticket successfully', async ({ page }) => {
    // Navigate to create ticket
    await page.click('[data-testid="create-ticket-button"]');
    await expect(page).toHaveURL('/tickets/create');
    
    // Fill ticket form
    await page.fill('[data-testid="ticket-subject"]', 'E2E Test Ticket');
    await page.fill('[data-testid="ticket-description"]', 'This is a test ticket created during E2E testing');
    await page.selectOption('[data-testid="ticket-priority"]', 'medium');
    await page.selectOption('[data-testid="ticket-category"]', 'technical');
    
    // Add tags
    await page.fill('[data-testid="ticket-tags"]', 'e2e, test, automation');
    
    // Submit ticket
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Should redirect to ticket view
    await expect(page.url()).toMatch(/\/tickets\/[a-f0-9]{24}/);
    
    // Verify ticket details
    await expect(page.locator('[data-testid="ticket-subject"]')).toContainText('E2E Test Ticket');
    await expect(page.locator('[data-testid="ticket-status"]')).toContainText('Open');
    await expect(page.locator('[data-testid="ticket-priority"]')).toContainText('Medium');
    
    // Check if AI processing indicator appears
    await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
  });

  test('should show validation errors for incomplete ticket', async ({ page }) => {
    await page.click('[data-testid="create-ticket-button"]');
    
    // Try to submit without required fields
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="subject-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-error"]')).toBeVisible();
  });

  test('should display ticket list with filters', async ({ page }) => {
    // Navigate to tickets list
    await page.click('[data-testid="my-tickets-link"]');
    await expect(page).toHaveURL('/tickets');
    
    // Should show tickets table
    await expect(page.locator('[data-testid="tickets-table"]')).toBeVisible();
    
    // Test status filter
    await page.selectOption('[data-testid="status-filter"]', 'open');
    await page.click('[data-testid="apply-filters-button"]');
    
    // All visible tickets should have 'open' status
    const statusCells = page.locator('[data-testid="ticket-status-cell"]');
    const count = await statusCells.count();
    
    for (let i = 0; i < count; i++) {
      await expect(statusCells.nth(i)).toContainText('Open');
    }
    
    // Test search functionality
    await page.fill('[data-testid="search-input"]', 'E2E Test');
    await page.click('[data-testid="search-button"]');
    
    // Should filter results
    await expect(page.locator('[data-testid="tickets-table"] tbody tr')).toHaveCount(1);
  });

  test('should handle ticket updates as agent', async ({ page }) => {
    // Logout and login as agent
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to tickets
    await page.click('[data-testid="tickets-link"]');
    
    // Open first ticket
    await page.click('[data-testid="ticket-row"]:first-child [data-testid="view-ticket-button"]');
    
    // Update ticket status
    await page.click('[data-testid="edit-ticket-button"]');
    await page.selectOption('[data-testid="ticket-status"]', 'in_progress');
    await page.fill('[data-testid="update-comment"]', 'Working on this ticket now');
    await page.click('[data-testid="save-ticket-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="ticket-status"]')).toContainText('In Progress');
    
    // Check activity log
    await expect(page.locator('[data-testid="activity-log"]')).toContainText('Status changed to In Progress');
  });

  test('should add comments to ticket', async ({ page }) => {
    // Login as agent
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to a ticket
    await page.click('[data-testid="tickets-link"]');
    await page.click('[data-testid="ticket-row"]:first-child [data-testid="view-ticket-button"]');
    
    // Add public comment
    await page.fill('[data-testid="comment-input"]', 'This is a public comment for the customer');
    await page.click('[data-testid="add-comment-button"]');
    
    // Should appear in comments section
    await expect(page.locator('[data-testid="comments-section"]')).toContainText('This is a public comment');
    
    // Add internal note
    await page.fill('[data-testid="comment-input"]', 'This is an internal note');
    await page.check('[data-testid="internal-note-checkbox"]');
    await page.click('[data-testid="add-comment-button"]');
    
    // Should appear with internal indicator
    await expect(page.locator('[data-testid="internal-comment"]')).toContainText('This is an internal note');
  });

  test('should handle AI suggestion review workflow', async ({ page }) => {
    // Login as agent
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to AI suggestions
    await page.click('[data-testid="ai-suggestions-link"]');
    await expect(page).toHaveURL('/ai/suggestions');
    
    // Should show pending suggestions
    await expect(page.locator('[data-testid="suggestions-table"]')).toBeVisible();
    
    // Review first suggestion
    await page.click('[data-testid="suggestion-row"]:first-child [data-testid="review-button"]');
    
    // Should show suggestion details
    await expect(page.locator('[data-testid="suggestion-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
    
    // Approve suggestion
    await page.click('[data-testid="approve-button"]');
    await page.fill('[data-testid="review-comments"]', 'AI response looks good');
    await page.click('[data-testid="submit-review-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('approved');
  });

  test('should handle ticket escalation', async ({ page }) => {
    // Login as agent
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to a ticket
    await page.click('[data-testid="tickets-link"]');
    await page.click('[data-testid="ticket-row"]:first-child [data-testid="view-ticket-button"]');
    
    // Escalate ticket
    await page.click('[data-testid="escalate-button"]');
    await page.selectOption('[data-testid="escalation-type"]', 'senior');
    await page.fill('[data-testid="escalation-reason"]', 'Complex issue requiring senior expertise');
    await page.click('[data-testid="confirm-escalation-button"]');
    
    // Should show escalation success
    await expect(page.locator('[data-testid="success-message"]')).toContainText('escalated');
    await expect(page.locator('[data-testid="ticket-priority"]')).toContainText('High');
  });

  test('should show real-time updates', async ({ page, context }) => {
    // Open ticket in first tab
    await page.click('[data-testid="tickets-link"]');
    await page.click('[data-testid="ticket-row"]:first-child [data-testid="view-ticket-button"]');
    
    // Open same ticket in second tab
    const page2 = await context.newPage();
    await page2.goto('/login');
    await page2.fill('[data-testid="email-input"]', 'admin@e2e.test');
    await page2.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page2.click('[data-testid="login-button"]');
    
    const ticketUrl = page.url();
    await page2.goto(ticketUrl);
    
    // Add comment in first tab
    await page.fill('[data-testid="comment-input"]', 'Real-time test comment');
    await page.click('[data-testid="add-comment-button"]');
    
    // Should appear in second tab automatically
    await expect(page2.locator('[data-testid="comments-section"]')).toContainText('Real-time test comment');
    
    await page2.close();
  });

  test('should handle file attachments', async ({ page }) => {
    // Navigate to create ticket
    await page.click('[data-testid="create-ticket-button"]');
    
    // Fill basic ticket info
    await page.fill('[data-testid="ticket-subject"]', 'Ticket with Attachment');
    await page.fill('[data-testid="ticket-description"]', 'This ticket includes a file attachment');
    
    // Upload file
    const fileInput = page.locator('[data-testid="file-upload-input"]');
    await fileInput.setInputFiles({
      name: 'test-file.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test file content')
    });
    
    // Should show file in upload list
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('test-file.txt');
    
    // Submit ticket
    await page.click('[data-testid="submit-ticket-button"]');
    
    // Should show attachment in ticket view
    await expect(page.locator('[data-testid="ticket-attachments"]')).toContainText('test-file.txt');
  });
});
