/**
 * AI Workflow Integration Tests
 */

const request = require('supertest');
const app = require('../../app');
const Ticket = require('../../models/Ticket');
const AISuggestion = require('../../models/AISuggestion');
const KnowledgeArticle = require('../../models/KnowledgeArticle');
const AIService = require('../../services/ai/AIService');

describe('AI Workflow Integration', () => {
  beforeEach(async () => {
    await testUtils.seedDatabase();
  });

  describe('Ticket Classification Workflow', () => {
    it('should classify ticket automatically on creation', async () => {
      const ticketData = {
        subject: 'Cannot login to my account',
        description: 'I forgot my password and cannot access my account. Please help me reset it.',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 201);
      const ticketId = body.data.ticket._id;

      // Wait for AI processing
      await testUtils.waitFor(2000);

      // Check if AI suggestion was created
      const aiSuggestion = await AISuggestion.findOne({ ticketId });
      expect(aiSuggestion).toBeTruthy();
      expect(aiSuggestion.classification).toBeDefined();
      expect(aiSuggestion.classification.category).toBeDefined();
      expect(aiSuggestion.classification.priority).toBeDefined();
    });

    it('should generate response suggestion for classified ticket', async () => {
      // Create a ticket
      const ticket = await Ticket.create({
        subject: 'Password reset request',
        description: 'I need to reset my password',
        requester: testUsers.customer._id,
        priority: 'medium',
        category: 'account',
        status: 'open'
      });

      // Trigger AI processing
      const aiService = new AIService();
      const suggestion = await aiService.processTicket(ticket._id);

      expect(suggestion).toBeTruthy();
      expect(suggestion.suggestedResponse).toBeDefined();
      expect(suggestion.suggestedResponse.content).toBeTruthy();
      expect(suggestion.confidence.overall).toBeGreaterThan(0);
    });

    it('should find relevant knowledge articles', async () => {
      // Create knowledge article
      await KnowledgeArticle.create({
        title: 'How to Reset Your Password',
        content: 'To reset your password, follow these steps: 1. Go to login page 2. Click forgot password 3. Enter your email',
        category: 'account',
        tags: ['password', 'reset', 'login'],
        isPublished: true,
        author: testUsers.admin._id
      });

      const ticket = await Ticket.create({
        subject: 'Forgot password',
        description: 'I cannot remember my password and need help resetting it',
        requester: testUsers.customer._id,
        priority: 'low',
        category: 'account',
        status: 'open'
      });

      const aiService = new AIService();
      const suggestion = await aiService.processTicket(ticket._id);

      expect(suggestion.knowledgeMatches).toBeDefined();
      expect(suggestion.knowledgeMatches.length).toBeGreaterThan(0);
      expect(suggestion.knowledgeMatches[0].score).toBeGreaterThan(0.5);
    });
  });

  describe('Auto-Resolution Workflow', () => {
    it('should auto-resolve high-confidence tickets', async () => {
      // Mock high confidence response
      const mockAIService = jest.spyOn(AIService.prototype, 'processTicket')
        .mockResolvedValue({
          classification: {
            category: { category: 'account', confidence: 0.95 },
            priority: { priority: 'low', confidence: 0.90 }
          },
          suggestedResponse: {
            content: 'Your password has been reset. Please check your email.',
            type: 'solution',
            confidence: 0.95
          },
          confidence: {
            overall: 0.95,
            calibrated: 0.93
          },
          knowledgeMatches: [],
          autoResolve: true
        });

      const ticketData = {
        subject: 'Password reset',
        description: 'Please reset my password',
        priority: 'low'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 201);
      const ticketId = body.data.ticket._id;

      // Wait for AI processing and auto-resolution
      await testUtils.waitFor(3000);

      // Check if ticket was auto-resolved
      const updatedTicket = await Ticket.findById(ticketId);
      expect(updatedTicket.status).toBe('resolved');
      expect(updatedTicket.resolvedBy).toBe('ai-system');

      mockAIService.mockRestore();
    });

    it('should not auto-resolve low-confidence tickets', async () => {
      const mockAIService = jest.spyOn(AIService.prototype, 'processTicket')
        .mockResolvedValue({
          classification: {
            category: { category: 'technical', confidence: 0.60 },
            priority: { priority: 'medium', confidence: 0.65 }
          },
          suggestedResponse: {
            content: 'This might help with your issue...',
            type: 'suggestion',
            confidence: 0.60
          },
          confidence: {
            overall: 0.62,
            calibrated: 0.58
          },
          knowledgeMatches: [],
          autoResolve: false
        });

      const ticketData = {
        subject: 'Complex technical issue',
        description: 'I have a complex problem that needs investigation',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set(testUtils.authHeaders(testUsers.customer))
        .send(ticketData);

      const body = testUtils.validateApiResponse(response, 201);
      const ticketId = body.data.ticket._id;

      // Wait for AI processing
      await testUtils.waitFor(2000);

      // Check that ticket was not auto-resolved
      const updatedTicket = await Ticket.findById(ticketId);
      expect(updatedTicket.status).toBe('open');
      expect(updatedTicket.assignee).toBeTruthy(); // Should be assigned to agent

      mockAIService.mockRestore();
    });
  });

  describe('AI Suggestion Review Workflow', () => {
    let testTicket;
    let aiSuggestion;

    beforeEach(async () => {
      testTicket = await Ticket.create({
        subject: 'Test ticket for AI review',
        description: 'This is a test ticket',
        requester: testUsers.customer._id,
        assignee: testUsers.agent._id,
        priority: 'medium',
        status: 'open'
      });

      aiSuggestion = await AISuggestion.create({
        ticketId: testTicket._id,
        type: 'response',
        status: 'pending_review',
        classification: {
          category: { category: 'technical', confidence: 0.85 },
          priority: { priority: 'medium', confidence: 0.80 }
        },
        suggestedResponse: {
          content: 'Here is the suggested response',
          type: 'solution',
          confidence: 0.85
        },
        confidence: {
          overall: 0.85,
          calibrated: 0.82
        }
      });
    });

    it('should approve AI suggestion', async () => {
      const reviewData = {
        decision: 'approve',
        feedback: {
          classificationAccuracy: 'correct',
          responseQuality: 'good',
          overallSatisfaction: 4
        }
      };

      const response = await request(app)
        .post(`/api/ai/suggestions/${aiSuggestion._id}/review`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(reviewData);

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);

      // Check suggestion status
      const updatedSuggestion = await AISuggestion.findById(aiSuggestion._id);
      expect(updatedSuggestion.status).toBe('approved');
      expect(updatedSuggestion.reviewedBy).toEqual(testUsers.agent._id);

      // Check ticket status
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.status).toBe('resolved');
    });

    it('should reject AI suggestion with modifications', async () => {
      const reviewData = {
        decision: 'modify',
        modifiedResponse: 'This is the modified response',
        feedback: {
          classificationAccuracy: 'partial',
          responseQuality: 'fair',
          overallSatisfaction: 3,
          comments: 'Response needed modification'
        }
      };

      const response = await request(app)
        .post(`/api/ai/suggestions/${aiSuggestion._id}/review`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(reviewData);

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);

      // Check suggestion status
      const updatedSuggestion = await AISuggestion.findById(aiSuggestion._id);
      expect(updatedSuggestion.status).toBe('modified');
      expect(updatedSuggestion.modifiedResponse).toBe(reviewData.modifiedResponse);
    });

    it('should escalate complex AI suggestions', async () => {
      const reviewData = {
        decision: 'escalate',
        escalationReason: 'Complex issue requiring senior review',
        feedback: {
          classificationAccuracy: 'incorrect',
          responseQuality: 'poor',
          overallSatisfaction: 2
        }
      };

      const response = await request(app)
        .post(`/api/ai/suggestions/${aiSuggestion._id}/review`)
        .set(testUtils.authHeaders(testUsers.agent))
        .send(reviewData);

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);

      // Check suggestion status
      const updatedSuggestion = await AISuggestion.findById(aiSuggestion._id);
      expect(updatedSuggestion.status).toBe('escalated');

      // Check ticket was escalated
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket.priority).toBe('high'); // Should be escalated
    });
  });

  describe('Batch AI Processing', () => {
    it('should process multiple tickets in batch', async () => {
      // Create multiple tickets
      const tickets = await Ticket.create([
        {
          subject: 'Batch ticket 1',
          description: 'First batch ticket',
          requester: testUsers.customer._id,
          priority: 'low',
          status: 'open'
        },
        {
          subject: 'Batch ticket 2',
          description: 'Second batch ticket',
          requester: testUsers.customer._id,
          priority: 'medium',
          status: 'open'
        },
        {
          subject: 'Batch ticket 3',
          description: 'Third batch ticket',
          requester: testUsers.customer._id,
          priority: 'high',
          status: 'open'
        }
      ]);

      const ticketIds = tickets.map(t => t._id);

      const response = await request(app)
        .post('/api/ai/process-batch')
        .set(testUtils.authHeaders(testUsers.admin))
        .send({ ticketIds });

      const body = testUtils.validateApiResponse(response, 200);
      expect(body.success).toBe(true);
      expect(body.data.processed).toBe(ticketIds.length);

      // Wait for processing
      await testUtils.waitFor(3000);

      // Check that suggestions were created
      const suggestions = await AISuggestion.find({
        ticketId: { $in: ticketIds }
      });

      expect(suggestions.length).toBe(ticketIds.length);
    });
  });

  describe('AI Performance Monitoring', () => {
    it('should track AI processing metrics', async () => {
      const ticket = await Ticket.create({
        subject: 'Performance test ticket',
        description: 'Testing AI performance metrics',
        requester: testUsers.customer._id,
        priority: 'medium',
        status: 'open'
      });

      const startTime = Date.now();
      const aiService = new AIService();
      const suggestion = await aiService.processTicket(ticket._id);
      const processingTime = Date.now() - startTime;

      expect(suggestion.processingTime).toBeDefined();
      expect(suggestion.processingTime).toBeGreaterThan(0);
      expect(suggestion.processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Check metrics endpoint
      const metricsResponse = await request(app)
        .get('/metrics')
        .set(testUtils.authHeaders(testUsers.admin));

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.text).toContain('ai_processing_duration');
    });
  });
});
