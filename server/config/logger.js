const winston = require('winston');
const path = require('path');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(logColors);

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.stack ? '\n' + info.stack : ''
    }`
  )
);

// Create transports array
const transports = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'debug',
      format: consoleFormat
    })
  );
}

// File transports
transports.push(
  // All logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  
  // Error logs only
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  
  // HTTP logs
  new winston.transports.File({
    filename: path.join(logsDir, 'http.log'),
    level: 'http',
    format: logFormat,
    maxsize: 10485760, // 10MB
    maxFiles: 3,
    tailable: true
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  transports,
  exitOnError: false,
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: logFormat
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: logFormat
    })
  ]
});

// Add custom methods for structured logging
logger.logRequest = (req, res, responseTime) => {
  logger.http('HTTP Request', {
    traceId: req.traceId,
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
};

logger.logError = (error, req = null, context = {}) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  };
  
  if (req) {
    errorInfo.traceId = req.traceId;
    errorInfo.method = req.method;
    errorInfo.url = req.originalUrl;
    errorInfo.ip = req.ip;
    errorInfo.userId = req.user?.id;
  }
  
  logger.error('Application Error', errorInfo);
};

logger.logSecurity = (event, details, req = null) => {
  const securityInfo = {
    event,
    ...details,
    timestamp: new Date().toISOString()
  };
  
  if (req) {
    securityInfo.traceId = req.traceId;
    securityInfo.ip = req.ip;
    securityInfo.userAgent = req.get('User-Agent');
    securityInfo.url = req.originalUrl;
    securityInfo.userId = req.user?.id;
  }
  
  logger.warn('Security Event', securityInfo);
};

logger.logPerformance = (operation, duration, metadata = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

logger.logAudit = (action, actor, target, details = {}) => {
  logger.info('Audit Event', {
    action,
    actor,
    target,
    details,
    timestamp: new Date().toISOString()
  });
};

// Log startup information
logger.info('Logger initialized', {
  level: logger.level,
  environment: process.env.NODE_ENV || 'development',
  logDirectory: logsDir
});

module.exports = logger;
