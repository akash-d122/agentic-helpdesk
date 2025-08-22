/**
 * AI Agent Routes
 * API endpoints for AI configuration, suggestions, and management
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

const aiAgentService = require('../services/ai');
const autoResolutionWorkflow = require('../services/ai/workflow/AutoResolutionWorkflow');
const AgentSuggestion = require('../models/AgentSuggestion');
const Ticket = require('../models/Ticket');
const { authenticate: auth } = require('../middleware/auth');
// const { requirePermission } = require('../middleware/permissions');
const logger = require('../config/logger');

// Middleware to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route   GET /api/ai/health
 * @desc    Get AI service health status
 * @access  Private (Admin)
 */
router.get('/health',
  auth,
  async (req, res) => {
    try {
      const health = await aiAgentService.getHealthStatus();
      
      res.json({
        status: 'success',
        data: health
      });
    } catch (error) {
      logger.error('Failed to get AI health status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get AI health status'
      });
    }
  }
);

/**
 * @route   GET /api/ai/config
 * @desc    Get AI configuration
 * @access  Private (Admin)
 */
router.get('/config',
  auth,
  async (req, res) => {
    try {
      const config = aiAgentService.configManager.getConfig();
      
      // Remove sensitive information
      const sanitizedConfig = { ...config };
      if (sanitizedConfig.openai?.apiKey) {
        sanitizedConfig.openai.apiKey = '***HIDDEN***';
      }
      
      res.json({
        status: 'success',
        data: sanitizedConfig
      });
    } catch (error) {
      logger.error('Failed to get AI configuration:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get AI configuration'
      });
    }
  }
);

/**
 * @route   PUT /api/ai/config
 * @desc    Update AI configuration
 * @access  Private (Admin)
 */
router.put('/config',
  auth,
  [
    body('enabled').optional().isBoolean(),
    body('autoResolveThreshold').optional().isFloat({ min: 0, max: 1 }),
    body('classification.enabled').optional().isBoolean(),
    body('knowledgeSearch.enabled').optional().isBoolean(),
    body('responseGeneration.enabled').optional().isBoolean(),
    body('autoResolution.enabled').optional().isBoolean()
  ],
  checkValidation,
  async (req, res) => {
    try {
      await aiAgentService.updateConfig(req.body);
      
      res.json({
        status: 'success',
        message: 'AI configuration updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update AI configuration:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update AI configuration',
        details: error.message
      });
    }
  }
);

/**
 * @route   POST /api/ai/process-ticket
 * @desc    Process a ticket through AI pipeline
 * @access  Private (Agent)
 */
router.post('/process-ticket',
  auth,
  [
    body('ticketId').isMongoId().withMessage('Valid ticket ID is required'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
  ],
  checkValidation,
  async (req, res) => {
    try {
      const { ticketId, priority = 'normal' } = req.body;
      
      // Check if ticket exists
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found'
        });
      }
      
      // Start processing
      const result = await autoResolutionWorkflow.processTicket(ticketId, { priority });
      
      res.json({
        status: 'success',
        message: 'Ticket processing initiated',
        data: {
          traceId: result.traceId,
          processingTime: result.totalTime,
          action: result.action?.type,
          autoResolved: result.actionResult?.autoResolved || false
        }
      });
    } catch (error) {
      logger.error('Failed to process ticket:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to process ticket',
        details: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ai/suggestions
 * @desc    Get AI suggestions with filtering and pagination
 * @access  Private (Agent)
 */
router.get('/suggestions',
  auth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'reviewed', 'approved', 'rejected']),
    query('recommendation').optional().isIn(['auto_resolve', 'agent_review', 'human_review', 'escalate']),
    query('autoResolve').optional().isBoolean()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.recommendation) filter['confidence.recommendation'] = req.query.recommendation;
      if (req.query.autoResolve !== undefined) filter.autoResolve = req.query.autoResolve === 'true';
      
      // Get suggestions
      const suggestions = await AgentSuggestion.find(filter)
        .populate('ticketId', 'subject priority status createdAt')
        .populate('humanReview.reviewedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await AgentSuggestion.countDocuments(filter);
      
      res.json({
        status: 'success',
        data: {
          suggestions,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get AI suggestions:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get AI suggestions'
      });
    }
  }
);

/**
 * @route   GET /api/ai/suggestions/:id
 * @desc    Get specific AI suggestion
 * @access  Private (Agent)
 */
router.get('/suggestions/:id',
  auth,
  [
    param('id').isMongoId().withMessage('Valid suggestion ID is required')
  ],
  checkValidation,
  async (req, res) => {
    try {
      const suggestion = await AgentSuggestion.findById(req.params.id)
        .populate('ticketId')
        .populate('humanReview.reviewedBy', 'firstName lastName email');
      
      if (!suggestion) {
        return res.status(404).json({
          status: 'error',
          message: 'Suggestion not found'
        });
      }
      
      res.json({
        status: 'success',
        data: suggestion
      });
    } catch (error) {
      logger.error('Failed to get AI suggestion:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get AI suggestion'
      });
    }
  }
);

/**
 * @route   POST /api/ai/suggestions/:id/review
 * @desc    Submit human review for AI suggestion
 * @access  Private (Agent)
 */
router.post('/suggestions/:id/review',
  auth,
  [
    param('id').isMongoId().withMessage('Valid suggestion ID is required'),
    body('decision').isIn(['approve', 'modify', 'reject', 'escalate']).withMessage('Valid decision is required'),
    body('feedback.classificationAccuracy').optional().isIn(['correct', 'incorrect', 'partial']),
    body('feedback.knowledgeRelevance').optional().isIn(['relevant', 'irrelevant', 'partial']),
    body('feedback.responseQuality').optional().isIn(['excellent', 'good', 'fair', 'poor']),
    body('feedback.overallSatisfaction').optional().isInt({ min: 1, max: 5 }),
    body('feedback.comments').optional().isString(),
    body('modifiedResponse').optional().isString()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const suggestion = await AgentSuggestion.findById(req.params.id);
      
      if (!suggestion) {
        return res.status(404).json({
          status: 'error',
          message: 'Suggestion not found'
        });
      }
      
      // Record human review
      const reviewData = {
        decision: req.body.decision,
        feedback: req.body.feedback || {},
        modifiedResponse: req.body.modifiedResponse,
        alternativeActions: req.body.alternativeActions || []
      };
      
      suggestion.recordHumanReview(reviewData, req.user.id);
      await suggestion.save();
      
      // Record feedback for learning
      if (reviewData.feedback) {
        await aiAgentService.confidenceEngine.recordFeedback(
          suggestion.ticketId,
          suggestion.confidence?.calibrated || 0,
          reviewData.feedback.classificationAccuracy === 'correct' ? 'correct' : 'incorrect',
          reviewData.feedback
        );
      }
      
      res.json({
        status: 'success',
        message: 'Review submitted successfully',
        data: {
          suggestionId: suggestion._id,
          decision: reviewData.decision
        }
      });
    } catch (error) {
      logger.error('Failed to submit review:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to submit review',
        details: error.message
      });
    }
  }
);

/**
 * @route   GET /api/ai/suggestions/pending-review
 * @desc    Get suggestions pending human review
 * @access  Private (Agent)
 */
router.get('/suggestions/pending-review',
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  checkValidation,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      
      const suggestions = await AgentSuggestion.findPendingReview(limit);
      
      res.json({
        status: 'success',
        data: suggestions
      });
    } catch (error) {
      logger.error('Failed to get pending reviews:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get pending reviews'
      });
    }
  }
);

/**
 * @route   GET /api/ai/suggestions/auto-resolve-candidates
 * @desc    Get candidates for auto-resolution
 * @access  Private (Agent)
 */
router.get('/suggestions/auto-resolve-candidates',
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  checkValidation,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      
      const candidates = await AgentSuggestion.findAutoResolveCandidates(limit);
      
      res.json({
        status: 'success',
        data: candidates
      });
    } catch (error) {
      logger.error('Failed to get auto-resolve candidates:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get auto-resolve candidates'
      });
    }
  }
);

/**
 * @route   GET /api/ai/analytics
 * @desc    Get AI performance analytics
 * @access  Private (Admin)
 */
router.get('/analytics',
  auth,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  checkValidation,
  async (req, res) => {
    try {
      const dateRange = {};
      if (req.query.startDate) dateRange.start = new Date(req.query.startDate);
      if (req.query.endDate) dateRange.end = new Date(req.query.endDate);
      
      const metrics = await AgentSuggestion.getPerformanceMetrics(dateRange);
      
      res.json({
        status: 'success',
        data: metrics[0] || {}
      });
    } catch (error) {
      logger.error('Failed to get AI analytics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get AI analytics'
      });
    }
  }
);

/**
 * @route   POST /api/ai/reindex-knowledge
 * @desc    Trigger knowledge base reindexing
 * @access  Private (Admin)
 */
router.post('/reindex-knowledge',
  auth,
  async (req, res) => {
    try {
      await aiAgentService.knowledgeEngine.reindex();
      
      res.json({
        status: 'success',
        message: 'Knowledge base reindexing initiated'
      });
    } catch (error) {
      logger.error('Failed to reindex knowledge base:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reindex knowledge base',
        details: error.message
      });
    }
  }
);

module.exports = router;
