/**
 * Production Monitoring Middleware
 * Comprehensive monitoring, logging, and performance tracking
 */

const prometheus = require('prom-client');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

// Prometheus metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const databaseQueryDuration = new prometheus.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5]
});

const aiProcessingDuration = new prometheus.Histogram({
  name: 'ai_processing_duration_seconds',
  help: 'Duration of AI processing in seconds',
  labelNames: ['type', 'provider'],
  buckets: [1, 5, 10, 30, 60, 120, 300]
});

const queueSize = new prometheus.Gauge({
  name: 'queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name']
});

const errorRate = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity']
});

// Register metrics
prometheus.register.registerMetric(httpRequestDuration);
prometheus.register.registerMetric(httpRequestTotal);
prometheus.register.registerMetric(activeConnections);
prometheus.register.registerMetric(databaseQueryDuration);
prometheus.register.registerMetric(aiProcessingDuration);
prometheus.register.registerMetric(queueSize);
prometheus.register.registerMetric(errorRate);

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'smart-helpdesk' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security middleware
const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "wss:", "ws:"]
      }
    },
    crossOriginEmbedderPolicy: false
  }),
  
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  }),
  
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024
  })
];

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    errorRate.inc({ type: 'rate_limit', severity: 'warning' });
    
    res.status(429).json({
      error: message,
      retryAfter: Math.round(windowMs / 1000)
    });
  }
});

const rateLimiters = {
  general: createRateLimit(15 * 60 * 1000, 1000, 'Too many requests'),
  auth: createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts'),
  api: createRateLimit(60 * 1000, 100, 'API rate limit exceeded'),
  upload: createRateLimit(60 * 1000, 10, 'Upload rate limit exceeded')
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    // Update metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
    
    activeConnections.dec();
    
    // Log request
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    };
    
    if (res.statusCode >= 400) {
      logger.error('HTTP Error', logData);
      errorRate.inc({ 
        type: res.statusCode >= 500 ? 'server_error' : 'client_error', 
        severity: res.statusCode >= 500 ? 'error' : 'warning' 
      });
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const errorId = require('crypto').randomUUID();
  
  logger.error('Unhandled Error', {
    errorId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  errorRate.inc({ type: 'unhandled_error', severity: 'error' });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    errorId,
    ...(isDevelopment && { stack: err.stack })
  });
};

// Health check endpoint
const healthCheck = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  // Check database connection
  const mongoose = require('mongoose');
  health.database = {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState
  };
  
  // Check Redis connection
  const redis = require('../config/redis');
  health.redis = {
    status: redis.status || 'unknown'
  };
  
  // Check queue health
  const QueueManager = require('../services/ai/queue/QueueManager');
  health.queues = QueueManager.getHealthStatus();
  
  const overallHealthy = health.database.status === 'connected' && 
                        health.redis.status === 'ready';
  
  res.status(overallHealthy ? 200 : 503).json(health);
};

// Metrics endpoint
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
};

// Database query monitoring
const monitorDatabaseQuery = (operation, collection) => {
  const end = databaseQueryDuration.startTimer({ operation, collection });
  return () => end();
};

// AI processing monitoring
const monitorAIProcessing = (type, provider) => {
  const end = aiProcessingDuration.startTimer({ type, provider });
  return () => end();
};

// Queue monitoring
const updateQueueSize = (queueName, size) => {
  queueSize.set({ queue_name: queueName }, size);
};

// Performance monitoring
const performanceMonitor = {
  // Monitor memory usage
  startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      
      if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
        logger.warn('High memory usage detected', { memoryUsage: usage });
      }
      
      if (usage.heapUsed / usage.heapTotal > 0.9) {
        logger.error('Memory usage critical', { memoryUsage: usage });
        errorRate.inc({ type: 'memory_critical', severity: 'error' });
      }
    }, 30000); // Check every 30 seconds
  },
  
  // Monitor event loop lag
  startEventLoopMonitoring() {
    const eventLoopLag = new prometheus.Histogram({
      name: 'nodejs_eventloop_lag_seconds',
      help: 'Lag of event loop in seconds',
      buckets: [0.001, 0.01, 0.1, 1, 10]
    });
    
    prometheus.register.registerMetric(eventLoopLag);
    
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e9;
        eventLoopLag.observe(lag);
        
        if (lag > 0.1) {
          logger.warn('High event loop lag detected', { lag });
        }
      });
    }, 5000); // Check every 5 seconds
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    require('mongoose').connection.close(() => {
      logger.info('Database connection closed');
      
      // Close Redis connection
      require('../config/redis').disconnect();
      logger.info('Redis connection closed');
      
      process.exit(0);
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Setup graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  errorRate.inc({ type: 'uncaught_exception', severity: 'critical' });
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  errorRate.inc({ type: 'unhandled_rejection', severity: 'error' });
});

module.exports = {
  securityMiddleware,
  rateLimiters,
  requestLogger,
  errorHandler,
  healthCheck,
  metricsEndpoint,
  monitorDatabaseQuery,
  monitorAIProcessing,
  updateQueueSize,
  performanceMonitor,
  logger
};
