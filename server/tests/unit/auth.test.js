/**
 * Authentication API Unit Tests
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const User = require('../../models/User');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'customer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = testUtils.validateApiResponse(response, 201);
      
      expect(body.success).toBe(true);
      expect(body.data.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      });
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.token).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email }).select('+password');
      expect(user).toBeTruthy();
      expect(await bcrypt.compare(userData.password, user.password)).toBe(true);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = testUtils.validateApiResponse(response, 400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@test.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = testUtils.validateApiResponse(response, 400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      // Create user first
      await User.create({
        email: 'existing@test.com',
        password: 'Password123!',
        firstName: 'Existing',
        lastName: 'User',
        role: 'customer'
      });

      const userData = {
        email: 'existing@test.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const body = testUtils.validateApiResponse(response, 409);
      expect(body.success).toBe(false);
      expect(body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user (password will be hashed automatically by pre-save hook)
      await User.create({
        email: 'login@test.com',
        password: 'Password123!',
        firstName: 'Login',
        lastName: 'User',
        role: 'agent',
        isActive: true
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.user).toMatchObject({
        email: loginData.email,
        firstName: 'Login',
        lastName: 'User',
        role: 'agent'
      });
      expect(body.data.user.password).toBeUndefined();
      expect(body.data.token).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'WrongPassword!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      // Create inactive user
      await User.create({
        email: 'inactive@test.com',
        password: 'Password123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'customer',
        isActive: false
      });

      const loginData = {
        email: 'inactive@test.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Account is deactivated');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Create user and get refresh token
      const user = await User.create({
        email: 'refresh@test.com',
        password: 'Password123!',
        firstName: 'Refresh',
        lastName: 'User',
        role: 'agent',
        isActive: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refresh@test.com',
          password: 'Password123!'
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      const body = testUtils.validateApiResponse(response, 200);
      
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.refreshToken).toBeDefined();
      expect(body.data.user).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for logout tests
      testUser = await User.create({
        email: 'logout@test.com',
        password: 'Password123!',
        firstName: 'Logout',
        lastName: 'User',
        role: 'agent',
        isActive: true
      });
    });

    it('should logout successfully with valid token', async () => {
      const token = generateTestToken(testUser);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('No token provided');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await User.create({
        email: 'forgot@test.com',
        password: 'Password123!',
        firstName: 'Forgot',
        lastName: 'User',
        role: 'customer',
        isActive: true
      });
    });



    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' });

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Password reset email sent');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user for /me tests
      testUser = await User.create({
        email: 'me@test.com',
        password: 'Password123!',
        firstName: 'Me',
        lastName: 'User',
        role: 'agent',
        isActive: true
      });
    });

    it('should return current user with valid token', async () => {
      const token = generateTestToken(testUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);
      expect(body.data.user).toMatchObject({
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        role: testUser.role
      });
      expect(body.data.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      const body = testUtils.validateApiResponse(response, 401);
      expect(body.success).toBe(false);
      expect(body.error).toContain('No token provided');
    });
  });
});
