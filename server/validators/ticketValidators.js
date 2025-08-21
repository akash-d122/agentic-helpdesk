const { body, param, query } = require('express-validator');

// Ticket creation validation
const validateCreateTicket = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject is required and must be between 1 and 200 characters')
    .escape(),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Description is required and must be between 1 and 10,000 characters'),
  
  body('category')
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-_]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, hyphens, and underscores')
];

// Ticket update validation
const validateUpdateTicket = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID format'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Description must be between 1 and 10,000 characters'),
  
  body('category')
    .optional()
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-_]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, hyphens, and underscores')
];

// Ticket assignment validation
const validateTicketAssignment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID format'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Assigned user must be a valid user ID')
    .custom(async (value, { req }) => {
      if (value) {
        const User = require('../models/User');
        const user = await User.findById(value);
        if (!user) {
          throw new Error('Assigned user not found');
        }
        if (!['agent', 'admin'].includes(user.role)) {
          throw new Error('Tickets can only be assigned to agents or admins');
        }
        if (!user.isActive) {
          throw new Error('Cannot assign ticket to inactive user');
        }
      }
      return true;
    })
];

// Ticket status update validation
const validateStatusUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID format'),
  
  body('status')
    .isIn(['open', 'triaged', 'waiting_human', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
    .withMessage('Status must be one of: open, triaged, waiting_human, in_progress, waiting_customer, resolved, closed'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
];

// Comment creation validation
const validateCreateComment = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID format'),
  
  body('message')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message is required and must be between 1 and 10,000 characters'),
  
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('isInternal must be a boolean value')
];

// Ticket query validation
const validateTicketQuery = [
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
    .matches(/^(-?)(createdAt|updatedAt|priority|status|ticketNumber)(,(-?)(createdAt|updatedAt|priority|status|ticketNumber))*$/)
    .withMessage('Invalid sort format'),
  
  query('status')
    .optional()
    .isIn(['open', 'triaged', 'waiting_human', 'in_progress', 'waiting_customer', 'resolved', 'closed'])
    .withMessage('Status must be one of: open, triaged, waiting_human, in_progress, waiting_customer, resolved, closed'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  query('category')
    .optional()
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('AssignedTo must be a valid user ID'),
  
  query('requester')
    .optional()
    .isMongoId()
    .withMessage('Requester must be a valid user ID'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .escape(),
  
  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),
  
  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),
  
  query('overdue')
    .optional()
    .isBoolean()
    .withMessage('overdue must be a boolean value'),
  
  query('autoResolved')
    .optional()
    .isBoolean()
    .withMessage('autoResolved must be a boolean value')
];

// Ticket ID parameter validation
const validateTicketId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ticket ID format')
];

// Bulk ticket operations validation
const validateBulkTicketOperation = [
  body('ticketIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('ticketIds must be an array with 1-50 items'),
  
  body('ticketIds.*')
    .isMongoId()
    .withMessage('Each ticket ID must be a valid MongoDB ObjectId'),
  
  body('operation')
    .isIn(['assign', 'close', 'reopen', 'priority', 'category'])
    .withMessage('Operation must be one of: assign, close, reopen, priority, category'),
  
  body('value')
    .custom((value, { req }) => {
      const operation = req.body.operation;
      
      if (operation === 'assign') {
        if (!value || typeof value !== 'string') {
          throw new Error('Value must be a valid user ID for assign operation');
        }
      } else if (operation === 'priority') {
        if (!['low', 'medium', 'high', 'urgent'].includes(value)) {
          throw new Error('Value must be a valid priority for priority operation');
        }
      } else if (operation === 'category') {
        if (!['billing', 'technical', 'shipping', 'account', 'general', 'other'].includes(value)) {
          throw new Error('Value must be a valid category for category operation');
        }
      }
      
      return true;
    }),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
];

module.exports = {
  validateCreateTicket,
  validateUpdateTicket,
  validateTicketAssignment,
  validateStatusUpdate,
  validateCreateComment,
  validateTicketQuery,
  validateTicketId,
  validateBulkTicketOperation
};
