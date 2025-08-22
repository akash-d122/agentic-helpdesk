const express = require('express');
const router = express.Router();

// Mock knowledge routes for testing
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      articles: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      }
    }
  });
});

router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    data: {
      article: {
        _id: 'mock-article-id',
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        tags: req.body.tags || [],
        isPublished: req.body.isPublished || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  });
});

router.get('/search', (req, res) => {
  res.json({
    success: true,
    data: {
      articles: [],
      query: req.query.q
    }
  });
});

router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      article: {
        _id: req.params.id,
        title: 'Mock Article',
        content: 'Mock content',
        category: 'general',
        tags: [],
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }
  });
});

router.put('/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      article: {
        _id: req.params.id,
        ...req.body,
        updatedAt: new Date().toISOString()
      }
    }
  });
});

router.delete('/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Article deleted successfully'
  });
});

module.exports = router;
