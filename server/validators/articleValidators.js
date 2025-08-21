const { body, param, query } = require('express-validator');

// Article creation validation
const validateCreateArticle = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be between 1 and 200 characters')
    .escape(),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content is required and must be between 1 and 50,000 characters'),
  
  body('summary')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Summary cannot exceed 500 characters')
    .escape(),
  
  body('category')
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-_]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  
  body('metadata.difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be one of: beginner, intermediate, advanced'),
  
  body('metadata.estimatedReadTime')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Estimated read time must be between 1 and 120 minutes'),
  
  body('metadata.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters')
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Language must be a valid language code (e.g., en, en-US)')
];

// Article update validation
const validateUpdateArticle = [
  param('id')
    .isMongoId()
    .withMessage('Invalid article ID format'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .escape(),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be between 1 and 50,000 characters'),
  
  body('summary')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Summary cannot exceed 500 characters')
    .escape(),
  
  body('category')
    .optional()
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-_]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  
  body('metadata.difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be one of: beginner, intermediate, advanced'),
  
  body('metadata.estimatedReadTime')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Estimated read time must be between 1 and 120 minutes'),
  
  body('metadata.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters')
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Language must be a valid language code (e.g., en, en-US)')
];

// Article query validation
const validateArticleQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .matches(/^(-?)(title|createdAt|updatedAt|publishedAt|viewCount|helpfulCount)(,(-?)(title|createdAt|updatedAt|publishedAt|viewCount|helpfulCount))*$/)
    .withMessage('Invalid sort format'),
  
  query('category')
    .optional()
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be one of: draft, published, archived'),
  
  query('author')
    .optional()
    .isMongoId()
    .withMessage('Author must be a valid user ID'),
  
  query('tags')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tags filter must be between 1 and 100 characters'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .escape(),
  
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be one of: beginner, intermediate, advanced'),
  
  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),
  
  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),
  
  query('publishedAfter')
    .optional()
    .isISO8601()
    .withMessage('publishedAfter must be a valid ISO 8601 date'),
  
  query('publishedBefore')
    .optional()
    .isISO8601()
    .withMessage('publishedBefore must be a valid ISO 8601 date')
];

// Article ID parameter validation
const validateArticleId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid article ID format')
];

// Article feedback validation
const validateArticleFeedback = [
  param('id')
    .isMongoId()
    .withMessage('Invalid article ID format'),
  
  body('helpful')
    .isBoolean()
    .withMessage('Helpful must be a boolean value'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters')
    .escape()
];

// Article search validation
const validateArticleSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required and must be between 1 and 100 characters')
    .escape(),
  
  query('category')
    .optional()
    .isIn(['billing', 'technical', 'shipping', 'account', 'general', 'other'])
    .withMessage('Category must be one of: billing, technical, shipping, account, general, other'),
  
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be one of: beginner, intermediate, advanced'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Bulk article operations validation
const validateBulkArticleOperation = [
  body('articleIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('articleIds must be an array with 1-50 items'),
  
  body('articleIds.*')
    .isMongoId()
    .withMessage('Each article ID must be a valid MongoDB ObjectId'),
  
  body('operation')
    .isIn(['publish', 'unpublish', 'archive', 'delete'])
    .withMessage('Operation must be one of: publish, unpublish, archive, delete'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters')
];

module.exports = {
  validateCreateArticle,
  validateUpdateArticle,
  validateArticleQuery,
  validateArticleId,
  validateArticleFeedback,
  validateArticleSearch,
  validateBulkArticleOperation
};
