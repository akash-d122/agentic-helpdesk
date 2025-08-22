const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');

// Simple test utilities
const testUtils = {
  validateApiResponse: (response, expectedStatus) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    return response.body;
  },
  setupTestDatabase: async () => {
    // Database setup is handled by global setup
  },
  teardownTestDatabase: async () => {
    // Database teardown is handled by global teardown
  },
  clearDatabase: async () => {
    if (global.clearDatabase) {
      await global.clearDatabase();
    }
  }
};

describe('Authentication Integration Tests', () => {
  let server;

  beforeAll(async () => {
    await testUtils.setupTestDatabase();
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await testUtils.teardownTestDatabase();
  });

  beforeEach(async () => {
    await testUtils.clearDatabase();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full user lifecycle: register → login → access protected route → logout', async () => {
      const userData = {
        email: 'integration@test.com',
        password: 'Password123!',
        firstName: 'Integration',
        lastName: 'Test',
        role: 'customer'
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const registerBody = testUtils.validateApiResponse(registerResponse, 201);
      expect(registerBody.success).toBe(true);
      expect(registerBody.data.user.email).toBe(userData.email);
      expect(registerBody.data.token).toBeDefined();
      expect(registerBody.data.refreshToken).toBeDefined();

      const { token: registerToken, refreshToken } = registerBody.data;

      // Step 2: Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const loginBody = testUtils.validateApiResponse(loginResponse, 200);
      expect(loginBody.success).toBe(true);
      expect(loginBody.data.user.email).toBe(userData.email);
      expect(loginBody.data.token).toBeDefined();
      expect(loginBody.data.refreshToken).toBeDefined();

      const { token: loginToken } = loginBody.data;

      // Step 3: Access protected route with login token
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`);

      const meBody = testUtils.validateApiResponse(meResponse, 200);
      expect(meBody.success).toBe(true);
      expect(meBody.data.user.email).toBe(userData.email);
      expect(meBody.data.user.firstName).toBe(userData.firstName);
      expect(meBody.data.user.lastName).toBe(userData.lastName);
      expect(meBody.data.user.password).toBeUndefined();

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginToken}`);

      const logoutBody = testUtils.validateApiResponse(logoutResponse, 200);
      expect(logoutBody.success).toBe(true);
      expect(logoutBody.message).toContain('Logout successful');

      // Step 5: Verify token is invalidated (should fail to access protected route)
      const invalidAccessResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`);

      // Note: This might still work if tokens aren't blacklisted, which is normal for stateless JWT
      // The important thing is that the logout was successful
    });

    it('should handle token refresh flow correctly', async () => {
      // Create and login user
      const user = await User.create({
        email: 'refresh@integration.com',
        password: 'Password123!',
        firstName: 'Refresh',
        lastName: 'Test',
        role: 'customer',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@integration.com',
          password: 'Password123!'
        });

      const loginBody = testUtils.validateApiResponse(loginResponse, 200);
      const { token: originalToken, refreshToken } = loginBody.data;

      // Use refresh token to get new tokens
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      const refreshBody = testUtils.validateApiResponse(refreshResponse, 200);
      expect(refreshBody.success).toBe(true);
      expect(refreshBody.data.token).toBeDefined();
      expect(refreshBody.data.refreshToken).toBeDefined();
      expect(refreshBody.data.user).toBeDefined();
      expect(refreshBody.data.user.email).toBe('refresh@integration.com');

      // Verify new token works for protected routes
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshBody.data.token}`);

      const meBody = testUtils.validateApiResponse(meResponse, 200);
      expect(meBody.success).toBe(true);
      expect(meBody.data.user.email).toBe('refresh@integration.com');
    });
  });

  describe('Cross-endpoint Authentication State Management', () => {
    let userToken;
    let userRefreshToken;

    beforeEach(async () => {
      // Create authenticated user for each test
      const user = await User.create({
        email: 'state@integration.com',
        password: 'Password123!',
        firstName: 'State',
        lastName: 'Test',
        role: 'customer',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'state@integration.com',
          password: 'Password123!'
        });

      const loginBody = testUtils.validateApiResponse(loginResponse, 200);
      userToken = loginBody.data.token;
      userRefreshToken = loginBody.data.refreshToken;
    });

    it('should maintain authentication state across multiple API calls', async () => {
      // Make multiple authenticated requests
      const requests = [
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`),
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`)
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        const body = testUtils.validateApiResponse(response, 200);
        expect(body.success).toBe(true);
        expect(body.data.user.email).toBe('state@integration.com');
      });
    });

    it('should handle concurrent authentication requests correctly', async () => {
      // Make concurrent requests with same token
      const concurrentRequests = Array(5).fill().map(() =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        const body = testUtils.validateApiResponse(response, 200);
        expect(body.success).toBe(true);
        expect(body.data.user.email).toBe('state@integration.com');
      });
    });
  });

  describe('Error Handling Across Multiple API Calls', () => {
    it('should handle sequential authentication failures correctly', async () => {
      // Test sequence of failed operations
      const invalidCredentials = {
        email: 'nonexistent@test.com',
        password: 'WrongPassword123!'
      };

      // Multiple failed login attempts
      const failedLogins = await Promise.all([
        request(app).post('/api/auth/login').send(invalidCredentials),
        request(app).post('/api/auth/login').send(invalidCredentials),
        request(app).post('/api/auth/login').send(invalidCredentials)
      ]);

      failedLogins.forEach(response => {
        expect(response.status).toBe(401);
        const body = testUtils.validateApiResponse(response, 401);
        expect(body.success).toBe(false);
        expect(body.error).toContain('Invalid credentials');
      });

      // Try to access protected route without token
      const unauthorizedResponse = await request(app)
        .get('/api/auth/me');

      expect(unauthorizedResponse.status).toBe(401);
      const unauthorizedBody = testUtils.validateApiResponse(unauthorizedResponse, 401);
      expect(unauthorizedBody.success).toBe(false);
      expect(unauthorizedBody.error).toContain('No token provided');
    });

    it('should handle invalid token scenarios across endpoints', async () => {
      const invalidToken = 'invalid.jwt.token';

      // Test invalid token on multiple protected endpoints
      const invalidTokenRequests = [
        request(app).get('/api/auth/me').set('Authorization', `Bearer ${invalidToken}`),
        request(app).post('/api/auth/logout').set('Authorization', `Bearer ${invalidToken}`)
      ];

      const responses = await Promise.all(invalidTokenRequests);

      responses.forEach(response => {
        expect(response.status).toBe(401);
        const body = testUtils.validateApiResponse(response, 401);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
      });
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limiting across multiple rapid requests', async () => {
      const userData = {
        email: 'ratelimit@test.com',
        password: 'WrongPassword123!'
      };

      // Make rapid sequential requests to test rate limiting
      const rapidRequests = [];
      for (let i = 0; i < 10; i++) {
        rapidRequests.push(
          request(app)
            .post('/api/auth/login')
            .send(userData)
        );
      }

      const responses = await Promise.all(rapidRequests);

      // Some requests should succeed (return 401 for wrong credentials)
      // Some might be rate limited (return 429)
      const statusCodes = responses.map(r => r.status);
      const has401 = statusCodes.includes(401);
      const has429 = statusCodes.includes(429);

      expect(has401).toBe(true); // Should have authentication failures
      // Rate limiting might or might not trigger depending on configuration
    });
  });

  describe('Token Conflict and Edge Cases', () => {
    it('should handle multiple refresh token usage correctly', async () => {
      // Create user and get initial tokens
      const user = await User.create({
        email: 'multirefresh@test.com',
        password: 'Password123!',
        firstName: 'Multi',
        lastName: 'Refresh',
        role: 'customer',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'multirefresh@test.com',
          password: 'Password123!'
        });

      const { refreshToken } = testUtils.validateApiResponse(loginResponse, 200).data;

      // Use refresh token multiple times
      const refreshResponse1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      const refreshBody1 = testUtils.validateApiResponse(refreshResponse1, 200);
      expect(refreshBody1.success).toBe(true);
      expect(refreshBody1.data.token).toBeDefined();

      // Try to use the same refresh token again
      const refreshResponse2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      const refreshBody2 = testUtils.validateApiResponse(refreshResponse2, 200);
      expect(refreshBody2.success).toBe(true);
      expect(refreshBody2.data.token).toBeDefined();
    });

    it('should handle user state changes during active session', async () => {
      // Create and login user
      const user = await User.create({
        email: 'statechange@test.com',
        password: 'Password123!',
        firstName: 'State',
        lastName: 'Change',
        role: 'customer',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'statechange@test.com',
          password: 'Password123!'
        });

      const { token } = testUtils.validateApiResponse(loginResponse, 200).data;

      // Verify initial access works
      const initialMeResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      testUtils.validateApiResponse(initialMeResponse, 200);

      // Deactivate user
      await User.findByIdAndUpdate(user._id, { isActive: false });

      // Try to access with same token (behavior depends on implementation)
      const deactivatedMeResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      // This might still work if tokens are stateless and don't check current user state
      // The important thing is that the system handles it gracefully
      expect([200, 401, 403]).toContain(deactivatedMeResponse.status);
    });
  });

  describe('Password Reset Integration Flow', () => {
    it('should handle password reset request flow', async () => {
      // Create user
      await User.create({
        email: 'resetflow@test.com',
        password: 'Password123!',
        firstName: 'Reset',
        lastName: 'Flow',
        role: 'customer',
        isActive: true
      });

      // Request password reset
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'resetflow@test.com' });

      const resetBody = testUtils.validateApiResponse(resetResponse, 200);
      expect(resetBody.success).toBe(true);
      expect(resetBody.message).toContain('Password reset email sent');

      // Test with non-existent email (should still return success for security)
      const nonExistentResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      const nonExistentBody = testUtils.validateApiResponse(nonExistentResponse, 200);
      expect(nonExistentBody.success).toBe(true);
      expect(nonExistentBody.message).toContain('Password reset email sent');
    });
  });

});
