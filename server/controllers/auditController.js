const AuditLog = require('../models/AuditLog');
const auditEnhancer = require('../utils/auditEnhancer');
const { createQueryBuilder } = require('../utils/queryBuilder');
const { catchAsync } = require('../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const winston = require('winston');

// Get audit logs with filtering and pagination
const getAuditLogs = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    sort = '-timestamp',
    action,
    actor,
    target,
    severity,
    startDate,
    endDate,
    traceId,
    search
  } = req.query;

  // Build query with filters
  const queryBuilder = createQueryBuilder(AuditLog, req.query);
  
  // Apply filters
  const filters = {};
  if (action) filters.action = action;
  if (actor) filters['actor.id'] = actor;
  if (target) filters['target.id'] = target;
  if (severity) filters.severity = severity;
  if (traceId) filters.traceId = traceId;
  
  queryBuilder.filter(filters);
  
  // Apply search if provided
  if (search) {
    queryBuilder.search(search, ['action', 'actor.email', 'details.description']);
  }
  
  // Apply date range filters
  if (startDate || endDate) {
    queryBuilder.dateRange('timestamp', startDate, endDate);
  }
  
  // Apply sorting and pagination
  queryBuilder
    .sort(sort)
    .populate('actor.id', 'firstName lastName email role')
    .paginate(parseInt(page), parseInt(limit));
  
  // Execute query
  const result = await queryBuilder.execute();
  
  winston.info('Audit logs retrieved', {
    userId: req.user._id,
    userRole: req.user.role,
    totalLogs: result.pagination.totalItems,
    page: result.pagination.currentPage,
    filters: { action, actor, target, severity },
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      auditLogs: result.data,
      pagination: result.pagination
    },
    traceId: req.traceId
  });
});

// Get audit log by ID
const getAuditLogById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const auditLog = await AuditLog.findById(id)
    .populate('actor.id', 'firstName lastName email role');
  
  if (!auditLog) {
    throw new NotFoundError('Audit log not found');
  }
  
  winston.info('Audit log retrieved', {
    userId: req.user._id,
    auditLogId: id,
    action: auditLog.action,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      auditLog
    },
    traceId: req.traceId
  });
});

// Get audit logs by trace ID
const getAuditLogsByTraceId = catchAsync(async (req, res) => {
  const { traceId } = req.params;
  
  const auditLogs = await AuditLog.findByTraceId(traceId);
  
  winston.info('Audit logs by trace ID retrieved', {
    userId: req.user._id,
    traceId,
    logCount: auditLogs.length,
    requestTraceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      traceId,
      auditLogs,
      totalLogs: auditLogs.length
    },
    traceId: req.traceId
  });
});

// Get audit statistics
const getAuditStatistics = catchAsync(async (req, res) => {
  const {
    period = 'week',
    startDate,
    endDate,
    groupBy = 'action'
  } = req.query;
  
  // Build date range
  let dateRange = {};
  if (startDate || endDate) {
    dateRange.timestamp = {};
    if (startDate) dateRange.timestamp.$gte = new Date(startDate);
    if (endDate) dateRange.timestamp.$lte = new Date(endDate);
  } else {
    // Default to last week
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateRange.timestamp = { $gte: lastWeek };
  }
  
  // Get statistics using aggregation
  const [actionStats, severityStats, userStats, timelineStats] = await Promise.all([
    // Actions statistics
    AuditLog.aggregate([
      { $match: dateRange },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$context.responseTime' },
          errorCount: {
            $sum: { $cond: [{ $in: ['$severity', ['error', 'critical']] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),
    
    // Severity statistics
    AuditLog.aggregate([
      { $match: dateRange },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]),
    
    // User activity statistics
    AuditLog.aggregate([
      { $match: { ...dateRange, 'actor.type': 'user' } },
      {
        $group: {
          _id: '$actor.id',
          count: { $sum: 1 },
          actions: { $addToSet: '$action' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    
    // Timeline statistics (by hour for last 24 hours)
    AuditLog.aggregate([
      { $match: dateRange },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 },
          errorCount: {
            $sum: { $cond: [{ $in: ['$severity', ['error', 'critical']] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ])
  ]);
  
  // Get performance metrics from audit enhancer
  const performanceMetrics = auditEnhancer.getAllPerformanceMetrics();
  
  winston.info('Audit statistics retrieved', {
    userId: req.user._id,
    period,
    groupBy,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      statistics: {
        actions: actionStats,
        severity: severityStats,
        users: userStats,
        timeline: timelineStats,
        performance: performanceMetrics
      },
      period,
      dateRange
    },
    traceId: req.traceId
  });
});

// Get security events
const getSecurityEvents = catchAsync(async (req, res) => {
  const {
    timeWindow = 24,
    severity = ['warning', 'error', 'critical'],
    limit = 100
  } = req.query;
  
  const securityEvents = await AuditLog.findSecurityEvents(timeWindow);
  
  // Filter by severity if specified
  const filteredEvents = severity.length > 0 
    ? securityEvents.filter(event => severity.includes(event.severity))
    : securityEvents;
  
  // Limit results
  const limitedEvents = filteredEvents.slice(0, parseInt(limit));
  
  winston.info('Security events retrieved', {
    userId: req.user._id,
    timeWindow,
    eventCount: limitedEvents.length,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      securityEvents: limitedEvents,
      totalEvents: filteredEvents.length,
      timeWindow,
      severity
    },
    traceId: req.traceId
  });
});

// Generate compliance report
const generateComplianceReport = catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    actions = [],
    userIds = [],
    format = 'json',
    includeDetails = true
  } = req.body;
  
  const report = await auditEnhancer.generateComplianceReport({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    actions,
    userIds,
    format
  });
  
  if (!includeDetails) {
    delete report.entries;
  }
  
  winston.info('Compliance report generated', {
    userId: req.user._id,
    reportPeriod: { startDate, endDate },
    totalEntries: report.metadata.totalEntries,
    format,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    message: 'Compliance report generated successfully',
    data: {
      report
    },
    traceId: req.traceId
  });
});

// Export audit data
const exportAuditData = catchAsync(async (req, res) => {
  const {
    startDate,
    endDate,
    format = 'json',
    includeDetails = true
  } = req.query;
  
  const exportData = await auditEnhancer.exportAuditData({
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    format,
    includeDetails: includeDetails === 'true'
  });
  
  winston.info('Audit data exported', {
    userId: req.user._id,
    format,
    includeDetails,
    traceId: req.traceId
  });
  
  // Set appropriate headers for download
  res.setHeader('Content-Disposition', `attachment; filename=audit-export-${Date.now()}.${format}`);
  res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
  
  res.json({
    status: 'success',
    data: exportData,
    traceId: req.traceId
  });
});

module.exports = {
  getAuditLogs,
  getAuditLogById,
  getAuditLogsByTraceId,
  getAuditStatistics,
  getSecurityEvents,
  generateComplianceReport,
  exportAuditData
};
