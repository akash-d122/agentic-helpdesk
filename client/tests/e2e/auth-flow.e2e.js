/**
 * Authentication Flow E2E Tests
 */

const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full registration and login flow', async ({ page }) => {
    // Navigate to registration
    await page.click('[data-testid="register-link"]');
    await expect(page).toHaveURL('/register');
    
    // Fill registration form
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@e2e.test`;
    
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="first-name-input"]', 'Test');
    await page.fill('[data-testid="last-name-input"]', 'User');
    
    // Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Login with the same credentials
    await page.fill('[data-testid="email-input"]', testEmail);
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Should be back in dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle login with existing user', async ({ page }) => {
    // Navigate to login
    await page.click('[data-testid="login-link"]');
    await expect(page).toHaveURL('/login');
    
    // Login with test customer
    await page.fill('[data-testid="email-input"]', 'customer@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify user info is displayed
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('[data-testid="user-name"]')).toContainText('E2E Customer');
    await expect(page.locator('[data-testid="user-role"]')).toContainText('Customer');
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    
    // Try to login with invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.click('[data-testid="login-link"]');
    await page.click('[data-testid="forgot-password-link"]');
    
    await expect(page).toHaveURL('/forgot-password');
    
    // Enter email for password reset
    await page.fill('[data-testid="email-input"]', 'customer@e2e.test');
    await page.click('[data-testid="reset-password-button"]');
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('reset email sent');
  });

  test('should protect routes that require authentication', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/tickets');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    
    // Login first
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Now should be able to access the protected route
    await page.goto('/tickets');
    await expect(page).toHaveURL('/tickets');
    await expect(page.locator('[data-testid="tickets-page"]')).toBeVisible();
  });

  test('should handle role-based access control', async ({ page }) => {
    // Login as customer
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'customer@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Try to access admin-only route
    await page.goto('/admin/users');
    
    // Should show access denied or redirect
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    
    // Logout and login as admin
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await page.fill('[data-testid="email-input"]', 'admin@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Now should be able to access admin route
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="users-management"]')).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Refresh the page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle session expiration gracefully', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'agent@e2e.test');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Simulate expired token by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    });
    
    // Try to access a protected route
    await page.goto('/tickets');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });
});
