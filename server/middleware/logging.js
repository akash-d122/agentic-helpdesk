const morgan = require('morgan');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Custom token for trace ID
morgan.token('traceId', (req) => req.traceId);

// Custom token for user ID
morgan.token('userId', (req) => req.user?.id || 'anonymous');

// Custom token for response time in milliseconds
morgan.token('responseTimeMs', (req, res) => {
  if (!req._startAt || !res._startAt) {
    return '';
  }
  
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  
  return ms.toFixed(3);
});

// Trace ID middleware - adds unique trace ID to each request
const traceIdMiddleware = (req, res, next) => {
  // Check if trace ID is provided in headers, otherwise generate new one
  req.traceId = req.get('X-Trace-ID') || uuidv4();
  
  // Add trace ID to response headers
  res.set('X-Trace-ID', req.traceId);
  
  next();
};

// Request logging configuration
const requestLogFormat = ':traceId :method :url :status :responseTimeMs ms - :res[content-length] bytes - :userId - :remote-addr - ":user-agent"';

// Create custom stream for Morgan to use Winston
const morganStream = {
  write: (message) => {
    // Remove trailing newline
    winston.info(message.trim());
  }
};

// Morgan middleware with custom format
const requestLogger = morgan(requestLogFormat, {
  stream: morganStream,
  skip: (req, res) => {
    // Skip logging for health check endpoints
    return req.path === '/health' || req.path === '/healthz';
  }
});

// Detailed request/response logging middleware
const detailedLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request details
  winston.info('Request started', {
    traceId: req.traceId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  // Capture original res.json to log response data
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log response details
    winston.info('Request completed', {
      traceId: req.traceId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      responseSize: JSON.stringify(data).length,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Call original json method
    return originalJson.call(this, data);
  };
  
  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  winston.error('Request error', {
    traceId: req.traceId,
    method: req.method,
    url: req.originalUrl,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests (over 1 second)
    if (responseTime > 1000) {
      winston.warn('Slow request detected', {
        traceId: req.traceId,
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
    
    // Log performance metrics
    winston.debug('Performance metrics', {
      traceId: req.traceId,
      responseTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    });
  });
  
  next();
};

// Security event logger
const securityLogger = {
  logFailedLogin: (email, ip, userAgent, reason) => {
    winston.warn('Failed login attempt', {
      event: 'security.failed_login',
      email,
      ip,
      userAgent,
      reason,
      timestamp: new Date().toISOString()
    });
  },
  
  logSuccessfulLogin: (userId, email, ip, userAgent) => {
    winston.info('Successful login', {
      event: 'security.successful_login',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  logSuspiciousActivity: (type, details, req) => {
    winston.warn('Suspicious activity detected', {
      event: 'security.suspicious_activity',
      type,
      details,
      traceId: req.traceId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  },
  
  logRateLimitExceeded: (ip, endpoint, userAgent) => {
    winston.warn('Rate limit exceeded', {
      event: 'security.rate_limit_exceeded',
      ip,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
};

// Audit log helper
const auditLogger = {
  logAction: async (action, actor, target, context, details = {}) => {
    try {
      const AuditLog = require('../models/AuditLog');
      
      await AuditLog.createEntry({
        traceId: context.traceId,
        action,
        actor,
        target,
        context,
        details,
        severity: details.severity || 'info'
      });
    } catch (error) {
      winston.error('Failed to create audit log entry', {
        error: error.message,
        action,
        traceId: context.traceId
      });
    }
  }
};

module.exports = {
  traceIdMiddleware,
  requestLogger,
  detailedLogger,
  errorLogger,
  performanceMonitor,
  securityLogger,
  auditLogger
};
