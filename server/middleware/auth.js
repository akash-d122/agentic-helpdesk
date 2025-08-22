const jwtService = require('../utils/jwt');
const User = require('../models/User');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');
const { securityLogger } = require('./logging');
const winston = require('winston');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.get('Authorization');
    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return next(new AuthenticationError('No token provided'));
    }
    
    // Verify token
    const decoded = await jwtService.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user) {
      securityLogger.logSuspiciousActivity(
        'invalid_user_token',
        { userId: decoded.id, reason: 'User not found' },
        req
      );
      return next(new AuthenticationError('User no longer exists'));
    }
    
    if (!user.isActive) {
      securityLogger.logSuspiciousActivity(
        'inactive_user_access',
        { userId: user._id, email: user.email },
        req
      );
      return next(new AuthenticationError('User account is deactivated'));
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    next();
  } catch (error) {
    winston.error('Authentication error:', {
      error: error.message,
      traceId: req.traceId,
      ip: req.ip
    });
    
    if (error.message.includes('expired')) {
      return next(new AuthenticationError('Access token has expired'));
    } else if (error.message.includes('invalid')) {
      return next(new AuthenticationError('Invalid access token'));
    } else {
      return next(new AuthenticationError('Authentication failed'));
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    const token = jwtService.extractTokenFromHeader(authHeader);
    
    if (token) {
      const decoded = await jwtService.verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Authorization middleware factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    if (!roles.includes(req.user.role)) {
      securityLogger.logSuspiciousActivity(
        'unauthorized_access_attempt',
        {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles: roles,
          endpoint: req.originalUrl
        },
        req
      );
      
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

// Resource ownership middleware
const authorizeOwnership = (resourceField = 'requester') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    // Admins and agents can access all resources
    if (['admin', 'agent'].includes(req.user.role)) {
      return next();
    }
    
    // For regular users, check ownership
    const resource = req.resource; // Should be set by previous middleware
    
    if (!resource) {
      return next(new Error('Resource not found for ownership check'));
    }
    
    const ownerId = resource[resourceField];
    
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      securityLogger.logSuspiciousActivity(
        'unauthorized_resource_access',
        {
          userId: req.user._id,
          resourceId: resource._id,
          resourceType: resource.constructor.modelName,
          ownerId
        },
        req
      );
      
      return next(new AuthorizationError('Access denied to this resource'));
    }
    
    next();
  };
};

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return next(new AuthenticationError('Refresh token is required'));
    }
    
    // Verify refresh token
    const decoded = await jwtService.verifyRefreshToken(refreshToken);
    
    // Get user and check if refresh token exists
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user) {
      return next(new AuthenticationError('User no longer exists'));
    }
    
    if (!user.isActive) {
      return next(new AuthenticationError('User account is deactivated'));
    }
    
    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    
    if (!tokenExists) {
      securityLogger.logSuspiciousActivity(
        'invalid_refresh_token',
        { userId: user._id, reason: 'Token not found in user records' },
        req
      );
      return next(new AuthenticationError('Invalid refresh token'));
    }
    
    // Generate new tokens
    const tokens = jwtService.generateTokens(user);
    
    // Remove old refresh token and add new one
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);
    
    req.tokens = tokens;
    req.user = user;
    
    next();
  } catch (error) {
    winston.error('Refresh token error:', {
      error: error.message,
      traceId: req.traceId,
      ip: req.ip
    });
    
    if (error.message.includes('expired')) {
      return next(new AuthenticationError('Refresh token has expired'));
    } else {
      return next(new AuthenticationError('Invalid refresh token'));
    }
  }
};

// Logout middleware
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (req.user && refreshToken) {
      // Remove refresh token from user's tokens
      await req.user.removeRefreshToken(refreshToken);
    }
    
    next();
  } catch (error) {
    winston.error('Logout error:', {
      error: error.message,
      traceId: req.traceId,
      userId: req.user?._id
    });
    
    // Continue with logout even if token removal fails
    next();
  }
};

// Rate limiting for authentication attempts
const authAttemptTracker = new Map();

const trackAuthAttempt = (req, res, next) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // Clean old attempts
  if (authAttemptTracker.has(ip)) {
    const attempts = authAttemptTracker.get(ip);
    const validAttempts = attempts.filter(time => now - time < windowMs);
    authAttemptTracker.set(ip, validAttempts);
  }

  // Check if too many attempts
  const attempts = authAttemptTracker.get(ip) || [];

  if (attempts.length >= maxAttempts) {
    securityLogger.logRateLimitExceeded(ip, req.path, req.get('User-Agent'));
    return res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again later',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }

  // Add current attempt
  attempts.push(now);
  authAttemptTracker.set(ip, attempts);

  next();
};

// Clear auth attempts on successful login
const clearAuthAttempts = (req, res, next) => {
  if (req.ip) {
    authAttemptTracker.delete(req.ip);
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  authorizeOwnership,
  refreshToken,
  logout,
  trackAuthAttempt,
  clearAuthAttempts
};
