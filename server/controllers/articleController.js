const Article = require('../models/Article');
const { createQueryBuilder } = require('../utils/queryBuilder');
const { catchAsync } = require('../middleware/errorHandler');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/logging');
const { canAccessResource } = require('../utils/permissions');
const winston = require('winston');

// Get all articles with filtering, search, and pagination
const getArticles = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-publishedAt',
    search,
    category,
    status,
    author,
    tags,
    difficulty,
    createdAfter,
    createdBefore,
    publishedAfter,
    publishedBefore,
    fields
  } = req.query;

  // Build query with filters
  const queryBuilder = createQueryBuilder(Article, req.query);
  
  // Apply role-based filtering
  const filters = {};
  
  // Non-admin users can only see published articles unless they're the author
  if (req.user.role !== 'admin') {
    if (req.user.role === 'agent') {
      // Agents can see their own drafts and all published articles
      filters.$or = [
        { status: 'published' },
        { author: req.user._id }
      ];
    } else {
      // Regular users can only see published articles
      filters.status = 'published';
    }
  }
  
  // Apply additional filters
  if (category) filters.category = category;
  if (status && req.user.role === 'admin') filters.status = status;
  if (author) filters.author = author;
  if (difficulty) filters['metadata.difficulty'] = difficulty;
  
  // Handle tags filter
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim());
    filters.tags = { $in: tagArray };
  }
  
  queryBuilder.filter(filters);
  
  // Apply search if provided
  if (search) {
    queryBuilder.textSearch(search);
  }
  
  // Apply date range filters
  if (createdAfter || createdBefore) {
    queryBuilder.dateRange('createdAt', createdAfter, createdBefore);
  }
  
  if (publishedAfter || publishedBefore) {
    queryBuilder.dateRange('publishedAt', publishedAfter, publishedBefore);
  }
  
  // Apply sorting, field selection, and pagination
  queryBuilder
    .sort(sort)
    .selectFields(fields)
    .populate('author', 'firstName lastName email')
    .paginate(parseInt(page), parseInt(limit));
  
  // Execute query
  const result = await queryBuilder.execute();
  
  winston.info('Articles retrieved', {
    userId: req.user._id,
    userRole: req.user.role,
    totalArticles: result.pagination.totalItems,
    page: result.pagination.currentPage,
    filters: { category, status, author, tags, difficulty },
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      articles: result.data,
      pagination: result.pagination
    },
    traceId: req.traceId
  });
});

// Get article by ID
const getArticleById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const article = await Article.findById(id)
    .populate('author', 'firstName lastName email')
    .populate('relatedArticles', 'title summary category');
  
  if (!article) {
    throw new NotFoundError('Article not found');
  }
  
  // Check access permissions
  const canAccess = canAccessResource(req.user, article, 'author', 'article:read:all');
  
  // For non-published articles, check if user can access
  if (article.status !== 'published' && !canAccess) {
    throw new AuthorizationError('Access denied to this article');
  }
  
  // Increment view count for published articles
  if (article.status === 'published') {
    article.viewCount += 1;
    await article.save();
  }
  
  winston.info('Article retrieved', {
    userId: req.user._id,
    articleId: id,
    articleTitle: article.title,
    articleStatus: article.status,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      article
    },
    traceId: req.traceId
  });
});

// Create new article
const createArticle = catchAsync(async (req, res) => {
  const {
    title,
    content,
    summary,
    category,
    tags = [],
    status = 'draft',
    metadata = {}
  } = req.body;
  
  // Check for duplicate title
  const existingArticle = await Article.findOne({ title: title.trim() });
  if (existingArticle) {
    throw new ConflictError('An article with this title already exists');
  }
  
  // Create article data
  const articleData = {
    title: title.trim(),
    content,
    summary: summary?.trim(),
    category,
    tags: tags.map(tag => tag.trim().toLowerCase()),
    status,
    author: req.user._id,
    metadata: {
      difficulty: metadata.difficulty || 'beginner',
      estimatedReadTime: metadata.estimatedReadTime,
      language: metadata.language || 'en'
    }
  };
  
  // Only admins can directly publish articles
  if (status === 'published' && req.user.role !== 'admin') {
    articleData.status = 'draft';
  }
  
  const article = new Article(articleData);
  await article.save();
  
  // Populate author information
  await article.populate('author', 'firstName lastName email');
  
  winston.info('Article created', {
    authorId: req.user._id,
    articleId: article._id,
    articleTitle: article.title,
    articleStatus: article.status,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'article.create',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'article',
      id: article._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      articleData: {
        title: article.title,
        category: article.category,
        status: article.status,
        tags: article.tags
      }
    }
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Article created successfully',
    data: {
      article
    },
    traceId: req.traceId
  });
});

// Update article
const updateArticle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const article = await Article.findById(id);
  if (!article) {
    throw new NotFoundError('Article not found');
  }
  
  // Check if user can update this article
  const canUpdate = canAccessResource(req.user, article, 'author', 'article:update:all');
  
  if (!canUpdate) {
    throw new AuthorizationError('Access denied to update this article');
  }
  
  // Store original data for audit
  const originalData = {
    title: article.title,
    content: article.content,
    summary: article.summary,
    category: article.category,
    tags: article.tags,
    status: article.status,
    metadata: article.metadata
  };
  
  // Check for title conflicts if title is being updated
  if (updates.title && updates.title.trim() !== article.title) {
    const existingArticle = await Article.findOne({ 
      title: updates.title.trim(),
      _id: { $ne: id }
    });
    if (existingArticle) {
      throw new ConflictError('An article with this title already exists');
    }
  }
  
  // Apply updates
  const allowedUpdates = [
    'title', 'content', 'summary', 'category', 'tags', 'metadata'
  ];
  
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'title' || field === 'summary') {
        article[field] = updates[field]?.trim();
      } else if (field === 'tags') {
        article[field] = updates[field].map(tag => tag.trim().toLowerCase());
      } else {
        article[field] = updates[field];
      }
    }
  });
  
  // Only admins can change status to published
  if (updates.status) {
    if (updates.status === 'published' && req.user.role !== 'admin') {
      throw new AuthorizationError('Only administrators can publish articles');
    }
    article.status = updates.status;
  }
  
  // Update lastModifiedBy
  article.lastModifiedBy = req.user._id;
  
  await article.save();
  
  // Populate author information
  await article.populate('author', 'firstName lastName email');
  
  winston.info('Article updated', {
    updatedBy: req.user._id,
    articleId: id,
    articleTitle: article.title,
    updates: Object.keys(updates),
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'article.update',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'article',
      id: article._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      changes: Object.keys(updates).map(field => ({
        field,
        oldValue: originalData[field],
        newValue: article[field]
      }))
    }
  );
  
  res.json({
    status: 'success',
    message: 'Article updated successfully',
    data: {
      article
    },
    traceId: req.traceId
  });
});

// Delete article (Admin or author)
const deleteArticle = catchAsync(async (req, res) => {
  const { id } = req.params;

  const article = await Article.findById(id);
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  // Check if user can delete this article
  const canDelete = canAccessResource(req.user, article, 'author', 'article:delete');

  if (!canDelete) {
    throw new AuthorizationError('Access denied to delete this article');
  }

  // Check if article is referenced by tickets (prevent deletion if in use)
  const Ticket = require('../models/Ticket');
  const referencingTickets = await Ticket.countDocuments({
    'aiProcessing.citedArticles': article._id
  });

  if (referencingTickets > 0) {
    throw new ValidationError('Cannot delete article that is referenced by tickets. Archive it instead.');
  }

  // Soft delete by archiving
  article.status = 'archived';
  await article.save();

  winston.info('Article deleted (archived)', {
    deletedBy: req.user._id,
    articleId: id,
    articleTitle: article.title,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'article.delete',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'article',
      id: article._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      deletedArticleData: {
        title: article.title,
        category: article.category,
        author: article.author
      }
    }
  );

  res.json({
    status: 'success',
    message: 'Article deleted successfully',
    traceId: req.traceId
  });
});

// Publish/unpublish article (Admin only)
const publishArticle = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'publish' or 'unpublish'

  const article = await Article.findById(id);
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  const originalStatus = article.status;

  if (action === 'publish') {
    if (article.status === 'published') {
      throw new ValidationError('Article is already published');
    }
    article.status = 'published';
    article.publishedAt = new Date();
  } else if (action === 'unpublish') {
    if (article.status !== 'published') {
      throw new ValidationError('Article is not currently published');
    }
    article.status = 'draft';
    article.publishedAt = null;
  } else {
    throw new ValidationError('Action must be either "publish" or "unpublish"');
  }

  await article.save();

  winston.info('Article publication status changed', {
    changedBy: req.user._id,
    articleId: id,
    action,
    originalStatus,
    newStatus: article.status,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    action === 'publish' ? 'article.publish' : 'article.unpublish',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'article',
      id: article._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      statusChange: {
        from: originalStatus,
        to: article.status,
        action
      }
    }
  );

  res.json({
    status: 'success',
    message: `Article ${action}ed successfully`,
    data: {
      article: {
        id: article._id,
        title: article.title,
        status: article.status,
        publishedAt: article.publishedAt
      }
    },
    traceId: req.traceId
  });
});

// Search articles with full-text search
const searchArticles = catchAsync(async (req, res) => {
  const { q, category, difficulty, limit = 10 } = req.query;

  // Build search query
  const searchQuery = {
    status: 'published', // Only search published articles
    $text: { $search: q }
  };

  // Add filters
  if (category) searchQuery.category = category;
  if (difficulty) searchQuery['metadata.difficulty'] = difficulty;

  // Execute search with text score
  const articles = await Article.find(searchQuery, {
    score: { $meta: 'textScore' }
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(parseInt(limit))
    .populate('author', 'firstName lastName')
    .select('title summary category tags metadata.difficulty viewCount helpfulCount createdAt publishedAt');

  winston.info('Article search performed', {
    userId: req.user._id,
    searchQuery: q,
    category,
    difficulty,
    resultsCount: articles.length,
    traceId: req.traceId
  });

  res.json({
    status: 'success',
    data: {
      articles,
      query: q,
      filters: { category, difficulty },
      totalResults: articles.length
    },
    traceId: req.traceId
  });
});

// Submit article feedback
const submitArticleFeedback = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { helpful, feedback } = req.body;

  const article = await Article.findById(id);
  if (!article) {
    throw new NotFoundError('Article not found');
  }

  // Only allow feedback on published articles
  if (article.status !== 'published') {
    throw new ValidationError('Feedback can only be submitted for published articles');
  }

  // Update helpful/not helpful counts
  if (helpful) {
    article.helpfulCount += 1;
  } else {
    article.notHelpfulCount += 1;
  }

  await article.save();

  winston.info('Article feedback submitted', {
    userId: req.user._id,
    articleId: id,
    helpful,
    hasFeedbackText: !!feedback,
    traceId: req.traceId
  });

  // Create audit log for feedback
  await auditLogger.logAction(
    'article.feedback',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'article',
      id: article._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      feedback: {
        helpful,
        text: feedback,
        helpfulnessRatio: article.helpfulnessRatio
      }
    }
  );

  res.json({
    status: 'success',
    message: 'Feedback submitted successfully',
    data: {
      article: {
        id: article._id,
        helpfulCount: article.helpfulCount,
        notHelpfulCount: article.notHelpfulCount,
        helpfulnessRatio: article.helpfulnessRatio
      }
    },
    traceId: req.traceId
  });
});

// Get article analytics (Admin/Agent only)
const getArticleAnalytics = catchAsync(async (req, res) => {
  const { period = 'month', startDate, endDate } = req.query;

  // Build date range
  let dateRange = {};
  if (startDate || endDate) {
    dateRange.publishedAt = {};
    if (startDate) dateRange.publishedAt.$gte = new Date(startDate);
    if (endDate) dateRange.publishedAt.$lte = new Date(endDate);
  } else {
    // Default to last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dateRange.publishedAt = { $gte: lastMonth };
  }

  // Get analytics data
  const [
    categoryStats,
    popularArticles,
    authorStats,
    overallStats
  ] = await Promise.all([
    // Articles by category
    Article.aggregate([
      { $match: { status: 'published', ...dateRange } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgViews: { $avg: '$viewCount' },
          avgHelpfulness: { $avg: '$helpfulnessRatio' }
        }
      },
      { $sort: { count: -1 } }
    ]),

    // Most popular articles
    Article.find({ status: 'published', ...dateRange })
      .sort({ viewCount: -1 })
      .limit(10)
      .populate('author', 'firstName lastName')
      .select('title category viewCount helpfulCount publishedAt'),

    // Articles by author
    Article.aggregate([
      { $match: { status: 'published', ...dateRange } },
      {
        $group: {
          _id: '$author',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgHelpfulness: { $avg: '$helpfulnessRatio' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),

    // Overall statistics
    Article.aggregate([
      { $match: { status: 'published', ...dateRange } },
      {
        $group: {
          _id: null,
          totalArticles: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          avgViews: { $avg: '$viewCount' },
          totalHelpful: { $sum: '$helpfulCount' },
          totalNotHelpful: { $sum: '$notHelpfulCount' }
        }
      }
    ])
  ]);

  winston.info('Article analytics retrieved', {
    userId: req.user._id,
    period,
    traceId: req.traceId
  });

  res.json({
    status: 'success',
    data: {
      analytics: {
        byCategory: categoryStats,
        popular: popularArticles,
        byAuthor: authorStats,
        overall: overallStats[0] || {
          totalArticles: 0,
          totalViews: 0,
          avgViews: 0,
          totalHelpful: 0,
          totalNotHelpful: 0
        }
      },
      period,
      dateRange
    },
    traceId: req.traceId
  });
});

module.exports = {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  publishArticle,
  searchArticles,
  submitArticleFeedback,
  getArticleAnalytics
};
