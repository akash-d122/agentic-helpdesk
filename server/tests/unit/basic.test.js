/**
 * Basic Test Suite
 * Simple tests to verify basic functionality
 */

describe('Basic Tests', () => {
  beforeAll(async () => {
    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  });

  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-secret');
  });

  test('should be able to require basic modules', () => {
    const jwt = require('../../utils/jwt');
    expect(jwt).toBeDefined();
  });

  test('should be able to create JWT tokens', () => {
    const jwtService = require('../../utils/jwt');
    const token = jwtService.generateAccessToken({ userId: '123', role: 'user' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  test('should be able to verify JWT tokens', async () => {
    const jwtService = require('../../utils/jwt');
    const payload = { userId: '123', role: 'user' };
    const token = jwtService.generateAccessToken(payload);
    
    const decoded = await jwtService.verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
  });
});
