const express = require('express');
const router = express.Router();
const database = require('../config/database');
const { catchAsync } = require('../middleware/errorHandler');

// Basic health check
router.get('/health', catchAsync(async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(healthCheck);
}));

// Detailed health check with dependencies
router.get('/healthz', catchAsync(async (req, res) => {
  const startTime = Date.now();
  
  // Check database connection
  const dbHealth = await database.healthCheck();
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryHealthy = memoryUsage.heapUsed < (memoryUsage.heapTotal * 0.9);
  
  // Check if any critical services are down
  const overallHealthy = dbHealth.status === 'healthy' && memoryHealthy;
  
  const healthCheck = {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    responseTime: Date.now() - startTime,
    checks: {
      database: dbHealth,
      memory: {
        status: memoryHealthy ? 'healthy' : 'unhealthy',
        usage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        unit: 'MB'
      }
    }
  };
  
  const statusCode = overallHealthy ? 200 : 503;
  res.status(statusCode).json(healthCheck);
}));

// Readiness check (for Kubernetes)
router.get('/readyz', catchAsync(async (req, res) => {
  const dbHealth = await database.healthCheck();
  
  if (dbHealth.status === 'healthy') {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Database not available'
    });
  }
}));

// Liveness check (for Kubernetes)
router.get('/livez', catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

module.exports = router;
