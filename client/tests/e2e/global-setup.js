/**
 * Global E2E Test Setup
 */

const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('Setting up E2E test environment...');
  
  // Start browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for application to be ready
    await page.goto(process.env.E2E_BASE_URL || 'http://localhost:3000');
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 30000 });
    
    // Setup test data via API
    await setupTestData(page);
    
    console.log('E2E test environment setup complete');
  } catch (error) {
    console.error('Failed to setup E2E test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page) {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:3001';
  
  // Create test users
  const testUsers = [
    {
      email: 'admin@e2e.test',
      password: 'TestPassword123!',
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'admin'
    },
    {
      email: 'agent@e2e.test',
      password: 'TestPassword123!',
      firstName: 'E2E',
      lastName: 'Agent',
      role: 'agent'
    },
    {
      email: 'customer@e2e.test',
      password: 'TestPassword123!',
      firstName: 'E2E',
      lastName: 'Customer',
      role: 'customer'
    }
  ];
  
  for (const user of testUsers) {
    try {
      const response = await page.request.post(`${apiUrl}/api/auth/register`, {
        data: user
      });
      
      if (!response.ok()) {
        console.log(`User ${user.email} might already exist, skipping...`);
      }
    } catch (error) {
      console.log(`Failed to create user ${user.email}:`, error.message);
    }
  }
  
  // Create test knowledge articles
  const adminLoginResponse = await page.request.post(`${apiUrl}/api/auth/login`, {
    data: {
      email: 'admin@e2e.test',
      password: 'TestPassword123!'
    }
  });
  
  if (adminLoginResponse.ok()) {
    const adminAuth = await adminLoginResponse.json();
    const adminToken = adminAuth.data.token;
    
    const knowledgeArticles = [
      {
        title: 'How to Reset Your Password',
        content: 'To reset your password: 1. Go to login page 2. Click "Forgot Password" 3. Enter your email 4. Check your email for reset link',
        category: 'account',
        tags: ['password', 'reset', 'login'],
        isPublished: true
      },
      {
        title: 'Troubleshooting Login Issues',
        content: 'If you cannot log in: 1. Check your email and password 2. Clear browser cache 3. Try incognito mode 4. Contact support if issues persist',
        category: 'technical',
        tags: ['login', 'troubleshooting', 'browser'],
        isPublished: true
      }
    ];
    
    for (const article of knowledgeArticles) {
      try {
        await page.request.post(`${apiUrl}/api/knowledge`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: article
        });
      } catch (error) {
        console.log('Failed to create knowledge article:', error.message);
      }
    }
  }
}

module.exports = globalSetup;
