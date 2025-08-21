const express = require('express');
const router = express.Router();

// Import controllers and middleware
const articleController = require('../controllers/articleController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  validateCreateArticle,
  validateUpdateArticle,
  validateArticleQuery,
  validateArticleId,
  validateArticleFeedback,
  validateArticleSearch
} = require('../validators/articleValidators');

// All routes require authentication
router.use(authenticate);

// GET /api/articles/search - Search articles with full-text search
router.get('/search',
  validateArticleSearch,
  handleValidationErrors,
  articleController.searchArticles
);

// GET /api/articles/analytics - Get article analytics (Admin/Agent only)
router.get('/analytics',
  authorize('admin', 'agent'),
  articleController.getArticleAnalytics
);

// GET /api/articles - List articles with filtering and pagination
router.get('/',
  validateArticleQuery,
  handleValidationErrors,
  articleController.getArticles
);

// POST /api/articles - Create new article (Admin/Agent only)
router.post('/',
  authorize('admin', 'agent'),
  validateCreateArticle,
  handleValidationErrors,
  articleController.createArticle
);

// GET /api/articles/:id - Get article by ID
router.get('/:id',
  validateArticleId,
  handleValidationErrors,
  articleController.getArticleById
);

// PUT /api/articles/:id - Update article
router.put('/:id',
  authorize('admin', 'agent'),
  validateUpdateArticle,
  handleValidationErrors,
  articleController.updateArticle
);

// DELETE /api/articles/:id - Delete article (Admin/Author only)
router.delete('/:id',
  authorize('admin', 'agent'),
  validateArticleId,
  handleValidationErrors,
  articleController.deleteArticle
);

// PUT /api/articles/:id/publish - Publish/unpublish article (Admin only)
router.put('/:id/publish',
  authorize('admin'),
  validateArticleId,
  handleValidationErrors,
  articleController.publishArticle
);

// POST /api/articles/:id/feedback - Submit article feedback
router.post('/:id/feedback',
  validateArticleFeedback,
  handleValidationErrors,
  articleController.submitArticleFeedback
);

module.exports = router;
