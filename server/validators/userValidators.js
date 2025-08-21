const { body, param, query } = require('express-validator');
const { canAssignRole } = require('../utils/permissions');

// User creation validation
const validateCreateUser = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('role')
    .optional()
    .isIn(['admin', 'agent', 'user'])
    .withMessage('Role must be one of: admin, agent, user')
    .custom((value, { req }) => {
      // Only admins can create admin/agent accounts
      if (value && ['admin', 'agent'].includes(value)) {
        if (!req.user || req.user.role !== 'admin') {
          throw new Error('Only administrators can create admin or agent accounts');
        }
      }
      return true;
    })
];

// User update validation
const validateUpdateUser = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .custom((value, { req }) => {
      // Prevent users from deactivating themselves
      if (value === false && req.user && req.params.id === req.user._id.toString()) {
        throw new Error('You cannot deactivate your own account');
      }
      return true;
    })
];

// Role change validation
const validateRoleChange = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('role')
    .isIn(['admin', 'agent', 'user'])
    .withMessage('Role must be one of: admin, agent, user')
    .custom(async (value, { req }) => {
      // Get target user to check current role
      const User = require('../models/User');
      const targetUser = await User.findById(req.params.id);
      
      if (!targetUser) {
        throw new Error('User not found');
      }
      
      // Prevent self-role changes
      if (req.params.id === req.user._id.toString()) {
        throw new Error('You cannot change your own role');
      }
      
      // Check if current user can assign this role
      if (!canAssignRole(req.user, value, targetUser.role)) {
        throw new Error('You do not have permission to assign this role');
      }
      
      return true;
    })
];

// User listing query validation
const validateUserQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .matches(/^(-?)(firstName|lastName|email|role|createdAt|lastLogin)(,(-?)(firstName|lastName|email|role|createdAt|lastLogin))*$/)
    .withMessage('Invalid sort format. Use field names with optional - prefix for descending order'),
  
  query('role')
    .optional()
    .isIn(['admin', 'agent', 'user'])
    .withMessage('Role filter must be one of: admin, agent, user'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive filter must be a boolean'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .escape(), // Escape HTML entities for security
  
  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),
  
  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),
  
  query('lastLoginAfter')
    .optional()
    .isISO8601()
    .withMessage('lastLoginAfter must be a valid ISO 8601 date'),
  
  query('lastLoginBefore')
    .optional()
    .isISO8601()
    .withMessage('lastLoginBefore must be a valid ISO 8601 date')
];

// User ID parameter validation
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// Password change validation for admin
const validateAdminPasswordChange = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Bulk operations validation
const validateBulkOperation = [
  body('userIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('userIds must be an array with 1-50 items'),
  
  body('userIds.*')
    .isMongoId()
    .withMessage('Each user ID must be a valid MongoDB ObjectId'),
  
  body('operation')
    .isIn(['activate', 'deactivate', 'delete'])
    .withMessage('Operation must be one of: activate, deactivate, delete'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
];

// User statistics query validation
const validateStatsQuery = [
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Period must be one of: day, week, month, quarter, year'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  
  query('groupBy')
    .optional()
    .isIn(['role', 'status', 'date'])
    .withMessage('groupBy must be one of: role, status, date')
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateRoleChange,
  validateUserQuery,
  validateUserId,
  validateAdminPasswordChange,
  validateBulkOperation,
  validateStatsQuery
};
