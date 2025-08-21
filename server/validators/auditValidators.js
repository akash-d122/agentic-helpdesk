const { body, param, query } = require('express-validator');

// Audit log query validation
const validateAuditQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  query('sort')
    .optional()
    .matches(/^(-?)(timestamp|action|severity)(,(-?)(timestamp|action|severity))*$/)
    .withMessage('Invalid sort format'),
  
  query('action')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Action must be between 1 and 100 characters'),
  
  query('actor')
    .optional()
    .isMongoId()
    .withMessage('Actor must be a valid user ID'),
  
  query('target')
    .optional()
    .isMongoId()
    .withMessage('Target must be a valid ID'),
  
  query('severity')
    .optional()
    .isIn(['info', 'warning', 'error', 'critical'])
    .withMessage('Severity must be one of: info, warning, error, critical'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  
  query('traceId')
    .optional()
    .isUUID()
    .withMessage('traceId must be a valid UUID'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .escape()
];

// Audit log ID parameter validation
const validateAuditId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid audit log ID format')
];

// Trace ID parameter validation
const validateTraceId = [
  param('traceId')
    .isUUID()
    .withMessage('Invalid trace ID format')
];

// Audit statistics query validation
const validateStatsQuery = [
  query('period')
    .optional()
    .isIn(['hour', 'day', 'week', 'month', 'quarter', 'year'])
    .withMessage('Period must be one of: hour, day, week, month, quarter, year'),
  
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
    .isIn(['action', 'severity', 'user', 'time'])
    .withMessage('groupBy must be one of: action, severity, user, time')
];

// Security events query validation
const validateSecurityQuery = [
  query('timeWindow')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('timeWindow must be between 1 and 168 hours'),
  
  query('severity')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        value = [value];
      }
      if (!Array.isArray(value)) {
        throw new Error('Severity must be an array or string');
      }
      const validSeverities = ['info', 'warning', 'error', 'critical'];
      const isValid = value.every(s => validSeverities.includes(s));
      if (!isValid) {
        throw new Error('All severity values must be one of: info, warning, error, critical');
      }
      return true;
    }),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

// Compliance report generation validation
const validateComplianceReport = [
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  
  body('actions')
    .optional()
    .isArray({ max: 50 })
    .withMessage('actions must be an array with maximum 50 items'),
  
  body('actions.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each action must be between 1 and 100 characters'),
  
  body('userIds')
    .optional()
    .isArray({ max: 100 })
    .withMessage('userIds must be an array with maximum 100 items'),
  
  body('userIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each user ID must be a valid MongoDB ObjectId'),
  
  body('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv'),
  
  body('includeDetails')
    .optional()
    .isBoolean()
    .withMessage('includeDetails must be a boolean value')
];

// Export audit data validation
const validateExportQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv'),
  
  query('includeDetails')
    .optional()
    .isBoolean()
    .withMessage('includeDetails must be a boolean value')
];

// Custom validation for date ranges
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query || req.body;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate must be before endDate',
        traceId: req.traceId
      });
    }
    
    // Limit date range to prevent performance issues
    const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (end - start > maxRangeMs) {
      return res.status(400).json({
        status: 'error',
        message: 'Date range cannot exceed 1 year',
        traceId: req.traceId
      });
    }
  }
  
  next();
};

module.exports = {
  validateAuditQuery,
  validateAuditId,
  validateTraceId,
  validateStatsQuery,
  validateSecurityQuery,
  validateComplianceReport,
  validateExportQuery,
  validateDateRange
};
