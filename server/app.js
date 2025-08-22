const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoose = require('mongoose');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const knowledgeRoutes = require('./routes/knowledge');
const articleRoutes = require('./routes/articles');
const auditRoutes = require('./routes/audit');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

// Import middleware
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting (completely disabled in test environment)
let limiter, authLimiter;

if (process.env.NODE_ENV === 'test') {
  // No-op middleware for tests
  limiter = (req, res, next) => next();
  authLimiter = (req, res, next) => next();
} else {
  // Production rate limiting
  limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 1000,
    message: 'Too many requests from this IP, please try again later.'
  });

  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again later.'
  });
}

// Apply rate limiting
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/readyz', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  // Basic metrics - in production this would use Prometheus client
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP nodejs_uptime_seconds Process uptime in seconds
# TYPE nodejs_uptime_seconds counter
nodejs_uptime_seconds ${metrics.uptime}

# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${metrics.memory.rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${metrics.memory.heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${metrics.memory.heapUsed}
nodejs_memory_usage_bytes{type="external"} ${metrics.memory.external}
  `.trim());
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(globalErrorHandler);

module.exports = app;
