const auditEnhancer = require('../utils/auditEnhancer');
const winston = require('winston');

/**
 * Enhanced audit middleware for comprehensive logging
 */
const auditMiddleware = (options = {}) => {
  const {
    excludePaths = ['/health', '/healthz', '/livez', '/readyz'],
    excludeMethods = ['OPTIONS'],
    trackPerformance = true,
    trackChanges = true
  } = options;

  return async (req, res, next) => {
    // Skip excluded paths and methods
    if (excludePaths.includes(req.path) || excludeMethods.includes(req.method)) {
      return next();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    // Store original request body for change tracking
    req.originalBody = req.body ? JSON.parse(JSON.stringify(req.body)) : null;

    // Override res.json to capture response data
    const originalJson = res.json;
    let responseData = null;

    res.json = function(data) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Handle response completion
    res.on('finish', async () => {
      try {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage(startCpu);

        // Calculate performance metrics
        const performanceData = {
          responseTime,
          memoryUsage: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external,
            rss: endMemory.rss - startMemory.rss
          },
          cpuUsage: {
            user: endCpu.user,
            system: endCpu.system
          }
        };

        // Determine action based on method and path
        const action = determineAction(req.method, req.path, req.body);

        // Skip if no meaningful action
        if (!action) return;

        // Create audit data
        const auditData = {
          traceId: req.traceId,
          action,
          actor: {
            type: req.user ? 'user' : 'anonymous',
            id: req.user?._id,
            email: req.user?.email,
            role: req.user?.role,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          },
          target: {
            type: determineTargetType(req.path),
            id: req.params.id || 'unknown'
          },
          context: {
            requestId: req.traceId,
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
          },
          details: {
            request: {
              method: req.method,
              path: req.originalUrl,
              query: req.query,
              headers: sanitizeHeaders(req.headers),
              bodySize: req.get('Content-Length') || 0
            },
            response: {
              statusCode: res.statusCode,
              headers: sanitizeHeaders(res.getHeaders()),
              dataSize: responseData ? JSON.stringify(responseData).length : 0
            }
          },
          severity: determineSeverity(res.statusCode, responseTime)
        };

        // Track session activity
        if (req.user && req.sessionId) {
          auditEnhancer.trackSessionActivity(
            req.user._id,
            req.sessionId,
            action,
            {
              endpoint: req.originalUrl,
              method: req.method,
              statusCode: res.statusCode
            }
          );
        }

        // Create change data for modification operations
        let changeData = {};
        if (trackChanges && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          changeData = createChangeData(req, responseData);
        }

        // Create enhanced audit entry
        await auditEnhancer.createEnhancedEntry(auditData, performanceData, changeData);

        // Log slow requests
        if (responseTime > 5000) { // 5 seconds
          winston.warn('Slow request detected', {
            traceId: req.traceId,
            method: req.method,
            path: req.originalUrl,
            responseTime,
            userId: req.user?._id
          });
        }

        // Log error responses
        if (res.statusCode >= 400) {
          winston.warn('Error response', {
            traceId: req.traceId,
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            userId: req.user?._id,
            responseData: responseData?.error || responseData?.message
          });
        }

      } catch (error) {
        winston.error('Audit middleware error', {
          error: error.message,
          traceId: req.traceId,
          path: req.originalUrl
        });
      }
    });

    next();
  };
};

/**
 * Determine audit action based on request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {Object} body - Request body
 * @returns {string} - Audit action
 */
function determineAction(method, path, body) {
  // Authentication actions
  if (path.includes('/auth/login')) return 'user.login';
  if (path.includes('/auth/logout')) return 'user.logout';
  if (path.includes('/auth/register')) return 'user.register';
  if (path.includes('/auth/refresh')) return 'user.token_refresh';

  // User management actions
  if (path.includes('/users')) {
    if (method === 'GET') return 'user.read';
    if (method === 'POST') return 'user.create';
    if (method === 'PUT' || method === 'PATCH') {
      if (path.includes('/role')) return 'user.role_change';
      return 'user.update';
    }
    if (method === 'DELETE') return 'user.delete';
  }

  // Article actions
  if (path.includes('/articles')) {
    if (method === 'GET') return 'article.read';
    if (method === 'POST') {
      if (path.includes('/feedback')) return 'article.feedback';
      return 'article.create';
    }
    if (method === 'PUT' || method === 'PATCH') {
      if (path.includes('/publish')) return 'article.publish';
      return 'article.update';
    }
    if (method === 'DELETE') return 'article.delete';
  }

  // Ticket actions
  if (path.includes('/tickets')) {
    if (method === 'GET') return 'ticket.read';
    if (method === 'POST') {
      if (path.includes('/comments')) return 'ticket.message_add';
      return 'ticket.create';
    }
    if (method === 'PUT' || method === 'PATCH') {
      if (path.includes('/assign')) return 'ticket.assign';
      if (path.includes('/status')) return 'ticket.status_change';
      return 'ticket.update';
    }
    if (method === 'DELETE') return 'ticket.delete';
  }

  return null;
}

/**
 * Determine target type from path
 * @param {string} path - Request path
 * @returns {string} - Target type
 */
function determineTargetType(path) {
  if (path.includes('/users')) return 'user';
  if (path.includes('/articles')) return 'article';
  if (path.includes('/tickets')) return 'ticket';
  if (path.includes('/auth')) return 'auth';
  return 'system';
}

/**
 * Determine severity based on response
 * @param {number} statusCode - HTTP status code
 * @param {number} responseTime - Response time in ms
 * @returns {string} - Severity level
 */
function determineSeverity(statusCode, responseTime) {
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'error';
  if (responseTime > 10000) return 'warning'; // 10 seconds
  return 'info';
}

/**
 * Sanitize headers for logging
 * @param {Object} headers - Headers object
 * @returns {Object} - Sanitized headers
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  
  // Remove sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Create change data for audit logging
 * @param {Object} req - Request object
 * @param {Object} responseData - Response data
 * @returns {Object} - Change data
 */
function createChangeData(req, responseData) {
  const changeData = {};
  
  // For creation operations, capture the created data
  if (req.method === 'POST' && responseData?.data) {
    changeData.after = responseData.data;
  }
  
  // For updates, capture before and after if available
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.originalBody) {
    changeData.before = req.originalBody;
    if (responseData?.data) {
      changeData.after = responseData.data;
    }
  }
  
  // For deletions, capture what was deleted
  if (req.method === 'DELETE' && responseData?.data) {
    changeData.before = responseData.data;
  }
  
  return changeData;
}

module.exports = auditMiddleware;
