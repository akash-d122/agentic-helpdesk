require('dotenv').config();

const express = require('express');
const path = require('path');

// Import configuration and middleware
const logger = require('./config/logger');
const database = require('./config/database');
const {
  helmet,
  cors,
  generalRateLimit,
  requestValidation,
  requestSizeLimit
} = require('./middleware/security');
const {
  traceIdMiddleware,
  requestLogger,
  errorLogger
} = require('./middleware/logging');
const auditMiddleware = require('./middleware/auditMiddleware');
const {
  responseFormatter,
  responseCompression,
  responseTimer,
  securityHeaders
} = require('./middleware/responseFormatter');
const { handleUploadErrors } = require('./middleware/fileUpload');
const {
  globalErrorHandler,
  notFoundHandler,
  handleMongooseErrors
} = require('./middleware/errorHandler');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const articleRoutes = require('./routes/articles');
const ticketRoutes = require('./routes/tickets');
const auditRoutes = require('./routes/audit');
const aiRoutes = require('./routes/ai');

// Create Express app
const app = express();

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet);
app.use(cors);
app.use(requestValidation);
app.use(requestSizeLimit('10mb'));

// Rate limiting
app.use(generalRateLimit);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response middleware
app.use(responseTimer);
app.use(securityHeaders);
app.use(responseFormatter);
app.use(responseCompression);

// Logging middleware
app.use(traceIdMiddleware);
app.use(requestLogger);

// Enhanced audit middleware
app.use(auditMiddleware({
  excludePaths: ['/health', '/healthz', '/livez', '/readyz'],
  trackPerformance: true,
  trackChanges: true
}));

// Static file serving (for uploads, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/ai', aiRoutes);

// API base route
app.get('/api', (req, res) => {
  res.json({
    message: 'Smart Helpdesk API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    traceId: req.traceId
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware
app.use(handleUploadErrors);
app.use(errorLogger);
app.use(globalErrorHandler);

// Initialize database connection and error handlers
handleMongooseErrors();

// Server startup function
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Create database indexes
    await database.createIndexes();
    
    // Seed database with initial data
    await database.seedDatabase();

    // Initialize AI services
    try {
      const aiAgentService = require('./services/ai');
      const autoResolutionWorkflow = require('./services/ai/workflow/AutoResolutionWorkflow');

      await aiAgentService.initialize();
      await autoResolutionWorkflow.initialize();

      logger.info('AI services initialized successfully');
    } catch (error) {
      logger.warn('AI services initialization failed:', error);
      // Continue without AI services - they can be initialized later
    }

    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        platform: process.platform
      });
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Shutdown AI services
          try {
            const aiAgentService = require('./services/ai');
            await aiAgentService.shutdown();
            logger.info('AI services shutdown complete');
          } catch (error) {
            logger.warn('AI services shutdown error:', error);
          }

          await database.disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
