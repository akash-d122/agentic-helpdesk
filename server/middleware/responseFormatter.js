const winston = require('winston');

/**
 * Standardized API response formatter middleware
 */
const responseFormatter = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override res.json to format responses consistently
  res.json = function(data) {
    // If data is already formatted (has status field), use as-is
    if (data && typeof data === 'object' && data.status) {
      return originalJson.call(this, data);
    }
    
    // Format the response
    const formattedResponse = {
      status: res.statusCode >= 400 ? 'error' : 'success',
      timestamp: new Date().toISOString(),
      traceId: req.traceId,
      data: data || null
    };
    
    // Add pagination info if present
    if (data && data.pagination) {
      formattedResponse.pagination = data.pagination;
      formattedResponse.data = data.data || data;
      delete formattedResponse.data.pagination;
    }
    
    // Add error details for error responses
    if (res.statusCode >= 400) {
      formattedResponse.error = {
        code: res.statusCode,
        message: data?.message || 'An error occurred',
        details: data?.details || data?.errors || null
      };
      delete formattedResponse.data;
    }
    
    return originalJson.call(this, formattedResponse);
  };
  
  // Add success response helper
  res.success = function(data, message = null, statusCode = 200) {
    this.status(statusCode);
    return this.json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add error response helper
  res.error = function(message, statusCode = 500, details = null) {
    this.status(statusCode);
    return this.json({
      status: 'error',
      error: {
        code: statusCode,
        message,
        details
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add validation error helper
  res.validationError = function(errors, message = 'Validation failed') {
    this.status(400);
    return this.json({
      status: 'error',
      error: {
        code: 400,
        message,
        type: 'validation_error',
        details: errors
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add not found helper
  res.notFound = function(message = 'Resource not found') {
    this.status(404);
    return this.json({
      status: 'error',
      error: {
        code: 404,
        message,
        type: 'not_found'
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add unauthorized helper
  res.unauthorized = function(message = 'Unauthorized') {
    this.status(401);
    return this.json({
      status: 'error',
      error: {
        code: 401,
        message,
        type: 'unauthorized'
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add forbidden helper
  res.forbidden = function(message = 'Forbidden') {
    this.status(403);
    return this.json({
      status: 'error',
      error: {
        code: 403,
        message,
        type: 'forbidden'
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add conflict helper
  res.conflict = function(message = 'Conflict') {
    this.status(409);
    return this.json({
      status: 'error',
      error: {
        code: 409,
        message,
        type: 'conflict'
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  // Add rate limit helper
  res.rateLimited = function(message = 'Too many requests', retryAfter = null) {
    this.status(429);
    const response = {
      status: 'error',
      error: {
        code: 429,
        message,
        type: 'rate_limited'
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    };
    
    if (retryAfter) {
      response.retryAfter = retryAfter;
      this.set('Retry-After', retryAfter);
    }
    
    return this.json(response);
  };
  
  // Add server error helper
  res.serverError = function(message = 'Internal server error', details = null) {
    this.status(500);
    return this.json({
      status: 'error',
      error: {
        code: 500,
        message,
        type: 'server_error',
        details: process.env.NODE_ENV === 'development' ? details : null
      },
      timestamp: new Date().toISOString(),
      traceId: req.traceId
    });
  };
  
  next();
};

/**
 * Response compression middleware
 */
const responseCompression = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  res.json = function(data) {
    // Add compression headers for large responses
    const dataString = JSON.stringify(data);
    const dataSize = Buffer.byteLength(dataString, 'utf8');
    
    // Add content length header
    res.set('Content-Length', dataSize);
    
    // Add cache headers for successful responses
    if (res.statusCode < 400) {
      // Cache successful responses for 5 minutes by default
      res.set('Cache-Control', 'public, max-age=300');
      
      // Add ETag for caching
      const etag = require('crypto')
        .createHash('md5')
        .update(dataString)
        .digest('hex');
      res.set('ETag', `"${etag}"`);
      
      // Check if client has cached version
      if (req.get('If-None-Match') === `"${etag}"`) {
        return res.status(304).end();
      }
    } else {
      // Don't cache error responses
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Response timing middleware
 */
const responseTimer = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end method
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Log slow responses
    if (responseTime > 1000) {
      winston.warn('Slow response detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        traceId: req.traceId
      });
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  });
  
  // Add CORS headers if not already set
  if (!res.get('Access-Control-Allow-Origin')) {
    res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Trace-ID');
    res.set('Access-Control-Expose-Headers', 'X-Trace-ID, X-Response-Time');
  }
  
  next();
};

module.exports = {
  responseFormatter,
  responseCompression,
  responseTimer,
  securityHeaders
};
