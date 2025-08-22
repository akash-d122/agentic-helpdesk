const express = require('express');
const router = express.Router();

// Import models and middleware
const Config = require('../models/Config');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Article = require('../models/Article');
const AgentSuggestion = require('../models/AgentSuggestion');
const AuditLog = require('../models/AuditLog');
const { authenticate, authorize } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/admin/config - Get system configuration
router.get('/config', catchAsync(async (req, res) => {
  const configs = await Config.find({ isPublic: true }).select('key value type category description');

  // Convert to key-value object for easier frontend consumption
  const configObject = {};
  configs.forEach(config => {
    configObject[config.key] = {
      value: config.value,
      type: config.type,
      category: config.category,
      description: config.description
    };
  });

  res.json({
    success: true,
    data: configObject
  });
}));

// PUT /api/admin/config - Update system configuration
router.put('/config', catchAsync(async (req, res) => {
  const updates = req.body;
  const results = {};

  for (const [key, value] of Object.entries(updates)) {
    try {
      const config = await Config.findOne({ key });
      if (config && config.isEditable) {
        config.validateValue(value);
        await Config.setValue(key, value, req.user._id, `Updated via admin panel`);
        results[key] = { success: true, value };
      } else {
        results[key] = { success: false, error: 'Config not found or not editable' };
      }
    } catch (error) {
      results[key] = { success: false, error: error.message };
    }
  }

  res.json({
    success: true,
    data: results
  });
}));

// GET /api/admin/metrics - Get system metrics
router.get('/metrics', catchAsync(async (req, res) => {
  const [
    totalUsers,
    totalTickets,
    openTickets,
    resolvedTickets,
    totalArticles,
    publishedArticles,
    totalSuggestions,
    autoResolvedSuggestions
  ] = await Promise.all([
    User.countDocuments(),
    Ticket.countDocuments(),
    Ticket.countDocuments({ status: { $in: ['open', 'triaged', 'in_progress'] } }),
    Ticket.countDocuments({ status: 'resolved' }),
    Article.countDocuments(),
    Article.countDocuments({ status: 'published' }),
    AgentSuggestion.countDocuments(),
    AgentSuggestion.countDocuments({ autoResolve: true })
  ]);

  // Calculate average response time
  const responseTimeStats = await Ticket.aggregate([
    { $match: { 'conversation.1': { $exists: true } } },
    {
      $project: {
        responseTime: {
          $subtract: [
            { $arrayElemAt: ['$conversation.createdAt', 1] },
            '$createdAt'
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: '$responseTime' }
      }
    }
  ]);

  const avgResponseTimeMs = responseTimeStats[0]?.avgResponseTime || 0;
  const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers
      },
      tickets: {
        total: totalTickets,
        open: openTickets,
        resolved: resolvedTickets,
        resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets * 100).toFixed(1) : 0
      },
      articles: {
        total: totalArticles,
        published: publishedArticles
      },
      ai: {
        totalSuggestions,
        autoResolved: autoResolvedSuggestions,
        autoResolutionRate: totalSuggestions > 0 ? (autoResolvedSuggestions / totalSuggestions * 100).toFixed(1) : 0
      },
      performance: {
        avgResponseTimeHours: avgResponseTimeHours.toFixed(2)
      }
    }
  });
}));

// GET /api/admin/users - Get users with pagination
router.get('/users', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// GET /api/admin/analytics - Get detailed analytics
router.get('/analytics', catchAsync(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Ticket analytics
  const ticketAnalytics = await Ticket.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);

  // AI performance analytics
  const aiAnalytics = await AgentSuggestion.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalSuggestions: { $sum: 1 },
        avgConfidence: { $avg: '$confidence.overall' },
        autoResolved: {
          $sum: { $cond: [{ $eq: ['$autoResolve', true] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      tickets: ticketAnalytics,
      ai: aiAnalytics,
      dateRange: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days: parseInt(days)
      }
    }
  });
}));

module.exports = router;
