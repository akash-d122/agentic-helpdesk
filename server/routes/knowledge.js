const express = require('express');
const router = express.Router();

// Import controllers and middleware
const Article = require('../models/Article');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');
const { catchAsync } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// GET /api/knowledge/search - Search knowledge base articles
router.get('/search', catchAsync(async (req, res) => {
  const { q: query, category, limit = 10 } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    });
  }

  // Build search filter
  const searchFilter = {
    status: 'published',
    $text: { $search: query }
  };

  if (category) {
    searchFilter.category = category;
  }

  const articles = await Article.find(searchFilter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit))
    .select('title summary category tags helpfulnessRatio viewCount');

  res.json({
    success: true,
    data: {
      articles,
      query,
      total: articles.length
    }
  });
}));

// GET /api/knowledge - Get published articles with pagination
router.get('/', catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    tags,
    sort = '-publishedAt'
  } = req.query;

  const filter = { status: 'published' };
  if (category) filter.category = category;
  if (tags) filter.tags = { $in: tags.split(',') };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [articles, total] = await Promise.all([
    Article.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title summary category tags helpfulnessRatio viewCount publishedAt'),
    Article.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

// GET /api/knowledge/:id - Get specific article
router.get('/:id', catchAsync(async (req, res) => {
  const article = await Article.findById(req.params.id)
    .populate('author', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName');

  if (!article) {
    return res.status(404).json({
      success: false,
      error: 'Article not found'
    });
  }

  // Only show published articles to non-admin users
  if (article.status !== 'published' && !['admin', 'agent'].includes(req.user.role)) {
    return res.status(404).json({
      success: false,
      error: 'Article not found'
    });
  }

  // Increment view count
  await article.incrementViewCount();

  res.json({
    success: true,
    data: { article }
  });
}));

// GET /api/knowledge/categories - Get available categories
router.get('/categories', catchAsync(async (req, res) => {
  const categories = await Article.distinct('category', { status: 'published' });

  res.json({
    success: true,
    data: { categories }
  });
}));

// GET /api/knowledge/tags - Get popular tags
router.get('/tags', catchAsync(async (req, res) => {
  const tags = await Article.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]);

  res.json({
    success: true,
    data: {
      tags: tags.map(t => ({ tag: t._id, count: t.count }))
    }
  });
}));

module.exports = router;
