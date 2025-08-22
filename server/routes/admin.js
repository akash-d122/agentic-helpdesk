const express = require('express');
const router = express.Router();

// Mock admin routes for testing
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    data: {
      totalUsers: 100,
      totalTickets: 500,
      resolvedTickets: 450,
      avgResponseTime: 2.5
    }
  });
});

router.get('/users', (req, res) => {
  res.json({
    success: true,
    data: {
      users: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    }
  });
});

router.get('/audit-logs', (req, res) => {
  res.json({
    success: true,
    data: {
      logs: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
      }
    }
  });
});

router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      autoCloseEnabled: true,
      confidenceThreshold: 0.8,
      slaHours: 24
    }
  });
});

router.put('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      ...req.body,
      updatedAt: new Date().toISOString()
    }
  });
});

module.exports = router;
