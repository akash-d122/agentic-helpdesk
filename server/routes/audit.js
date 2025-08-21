const express = require('express');
const router = express.Router();

// Import controllers and middleware
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  validateAuditQuery,
  validateAuditId,
  validateTraceId,
  validateStatsQuery,
  validateSecurityQuery,
  validateComplianceReport,
  validateExportQuery,
  validateDateRange
} = require('../validators/auditValidators');

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/audit/logs - Get audit logs with filtering and pagination
router.get('/logs',
  validateAuditQuery,
  validateDateRange,
  handleValidationErrors,
  auditController.getAuditLogs
);

// GET /api/audit/logs/:id - Get audit log by ID
router.get('/logs/:id',
  validateAuditId,
  handleValidationErrors,
  auditController.getAuditLogById
);

// GET /api/audit/trace/:traceId - Get audit logs by trace ID
router.get('/trace/:traceId',
  validateTraceId,
  handleValidationErrors,
  auditController.getAuditLogsByTraceId
);

// GET /api/audit/statistics - Get audit statistics
router.get('/statistics',
  validateStatsQuery,
  validateDateRange,
  handleValidationErrors,
  auditController.getAuditStatistics
);

// GET /api/audit/security - Get security events
router.get('/security',
  validateSecurityQuery,
  handleValidationErrors,
  auditController.getSecurityEvents
);

// POST /api/audit/report - Generate compliance report
router.post('/report',
  validateComplianceReport,
  validateDateRange,
  handleValidationErrors,
  auditController.generateComplianceReport
);

// GET /api/audit/export - Export audit data
router.get('/export',
  validateExportQuery,
  validateDateRange,
  handleValidationErrors,
  auditController.exportAuditData
);

module.exports = router;
