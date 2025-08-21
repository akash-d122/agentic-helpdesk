const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      winston.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-ID'],
  exposedHeaders: ['X-Trace-ID']
};

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      winston.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method
      });
      
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General rate limiting
const generalRateLimit = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for authentication endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  'Too many authentication attempts, please try again later.',
  true // Skip successful requests
);

// Strict rate limiting for password reset
const passwordResetRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3,
  'Too many password reset attempts, please try again later.'
);

// Rate limiting for file uploads
const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10,
  'Too many file uploads, please try again later.'
);

// Helmet configuration for security headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for development
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// Security middleware for request validation
const requestValidation = (req, res, next) => {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script/i,       // XSS attempts
    /javascript:/i,   // JavaScript protocol
    /vbscript:/i,     // VBScript protocol
    /onload=/i,       // Event handlers
    /onerror=/i,
    /onclick=/i
  ];
  
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || '';
  
  // Check URL for suspicious patterns
  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    winston.warn('Suspicious request detected', {
      ip: req.ip,
      url,
      userAgent,
      type: 'suspicious_url'
    });
    
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid request format'
    });
  }
  
  // Check for common bot patterns (optional blocking)
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    winston.info('Bot request detected', {
      ip: req.ip,
      userAgent,
      url
    });
    // Don't block bots, just log them
  }
  
  next();
};

// IP whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      winston.warn('IP not whitelisted', {
        ip: clientIP,
        endpoint: req.path,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied from this IP address'
      });
    }
    
    next();
  };
};

// Request size limiting
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = parseInt(limit.replace(/[^\d]/g, '')) * 1024 * 1024; // Convert to bytes
    
    if (contentLength > maxSize) {
      winston.warn('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        endpoint: req.path
      });
      
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size exceeds limit of ${limit}`
      });
    }
    
    next();
  };
};

module.exports = {
  helmet: helmet(helmetConfig),
  cors: cors(corsOptions),
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  uploadRateLimit,
  requestValidation,
  ipWhitelist,
  requestSizeLimit
};
