const User = require('../models/User');
const jwtService = require('../utils/jwt');
const { catchAsync } = require('../middleware/errorHandler');
const { AuthenticationError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const { securityLogger, auditLogger } = require('../middleware/logging');
const winston = require('winston');

// Register new user
const register = catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }
  
  // Create new user
  const userData = {
    email,
    password,
    firstName,
    lastName,
    role: role || 'user' // Default to 'user' role
  };
  
  // Only admins can create admin/agent accounts
  if (role && ['admin', 'agent'].includes(role)) {
    if (!req.user || req.user.role !== 'admin') {
      throw new AuthenticationError('Only administrators can create admin or agent accounts');
    }
  }
  
  const user = new User(userData);
  await user.save();
  
  // Generate tokens
  const tokens = jwtService.generateTokens(user);
  
  // Save refresh token
  await user.addRefreshToken(tokens.refreshToken);
  
  // Log successful registration
  winston.info('User registered successfully', {
    userId: user._id,
    email: user.email,
    role: user.role,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.register',
    {
      type: 'user',
      id: user._id,
      email: user.email,
      role: user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );
  
  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified
      },
      tokens
    },
    traceId: req.traceId
  });
});

// Login user
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }
  
  // Find user and include password for comparison
  const user = await User.findByEmail(email).select('+password +refreshTokens');
  
  if (!user) {
    securityLogger.logFailedLogin(email, req.ip, req.get('User-Agent'), 'User not found');
    throw new AuthenticationError('Invalid email or password');
  }
  
  if (!user.isActive) {
    securityLogger.logFailedLogin(email, req.ip, req.get('User-Agent'), 'Account deactivated');
    throw new AuthenticationError('Account is deactivated');
  }
  
  // Check password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    securityLogger.logFailedLogin(email, req.ip, req.get('User-Agent'), 'Invalid password');
    throw new AuthenticationError('Invalid email or password');
  }
  
  // Generate tokens
  const tokens = jwtService.generateTokens(user);
  
  // Save refresh token
  await user.addRefreshToken(tokens.refreshToken);
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  // Log successful login
  securityLogger.logSuccessfulLogin(user._id, user.email, req.ip, req.get('User-Agent'));
  
  // Create audit log
  await auditLogger.logAction(
    'user.login',
    {
      type: 'user',
      id: user._id,
      email: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );
  
  res.json({
    status: 'success',
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin
      },
      tokens
    },
    traceId: req.traceId
  });
});

// Refresh access token
const refresh = catchAsync(async (req, res) => {
  // Tokens are set by refreshToken middleware
  const { tokens, user } = req;
  
  winston.info('Token refreshed successfully', {
    userId: user._id,
    email: user.email,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    message: 'Token refreshed successfully',
    data: {
      tokens
    },
    traceId: req.traceId
  });
});

// Logout user
const logout = catchAsync(async (req, res) => {
  const user = req.user;
  
  // Log logout
  winston.info('User logged out', {
    userId: user._id,
    email: user.email,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.logout',
    {
      type: 'user',
      id: user._id,
      email: user.email,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );
  
  res.json({
    status: 'success',
    message: 'Logout successful',
    traceId: req.traceId
  });
});

// Get current user profile
const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  
  res.json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    },
    traceId: req.traceId
  });
});

// Update user profile
const updateProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const { firstName, lastName } = req.body;
  
  // Update allowed fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  
  await user.save();
  
  winston.info('User profile updated', {
    userId: user._id,
    email: user.email,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.update',
    {
      type: 'user',
      id: user._id,
      email: user.email,
      role: user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      changes: { firstName, lastName }
    }
  );
  
  res.json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        updatedAt: user.updatedAt
      }
    },
    traceId: req.traceId
  });
});

// Change password
const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }
  
  // Get user with password
  const userWithPassword = await User.findById(user._id).select('+password');
  
  // Verify current password
  const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);
  
  if (!isCurrentPasswordValid) {
    securityLogger.logSuspiciousActivity(
      'invalid_password_change_attempt',
      { userId: user._id, reason: 'Invalid current password' },
      req
    );
    throw new AuthenticationError('Current password is incorrect');
  }
  
  // Update password
  userWithPassword.password = newPassword;
  await userWithPassword.save();
  
  // Clear all refresh tokens (force re-login on all devices)
  userWithPassword.refreshTokens = [];
  await userWithPassword.save();
  
  winston.info('Password changed successfully', {
    userId: user._id,
    email: user.email,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.password_change',
    {
      type: 'user',
      id: user._id,
      email: user.email,
      role: user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  );
  
  res.json({
    status: 'success',
    message: 'Password changed successfully. Please log in again.',
    traceId: req.traceId
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
