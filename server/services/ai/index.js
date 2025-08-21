/**
 * AI Agent Service - Main Entry Point
 * Provides intelligent ticket processing, classification, and response generation
 */

const ClassificationEngine = require('./engines/ClassificationEngine');
const KnowledgeEngine = require('./engines/KnowledgeEngine');
const ResponseEngine = require('./engines/ResponseEngine');
const ConfidenceEngine = require('./engines/ConfidenceEngine');
const QueueManager = require('./queue/QueueManager');
const ConfigManager = require('./config/ConfigManager');
const logger = require('../../config/logger');

class AIAgentService {
  constructor() {
    this.classificationEngine = new ClassificationEngine();
    this.knowledgeEngine = new KnowledgeEngine();
    this.responseEngine = new ResponseEngine();
    this.confidenceEngine = new ConfidenceEngine();
    this.queueManager = new QueueManager();
    this.configManager = new ConfigManager();
    this.isInitialized = false;
  }

  /**
   * Initialize the AI service with configuration
   */
  async initialize() {
    try {
      logger.info('Initializing AI Agent Service...');
      
      // Load configuration
      await this.configManager.loadConfig();
      
      // Initialize engines
      await this.classificationEngine.initialize(this.configManager.getConfig());
      await this.knowledgeEngine.initialize(this.configManager.getConfig());
      await this.responseEngine.initialize(this.configManager.getConfig());
      await this.confidenceEngine.initialize(this.configManager.getConfig());
      
      // Initialize queue manager
      await this.queueManager.initialize();
      
      // Set up queue processors
      this.setupQueueProcessors();
      
      this.isInitialized = true;
      logger.info('AI Agent Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Agent Service:', error);
      throw error;
    }
  }

  /**
   * Set up queue processors for different types of AI tasks
   */
  setupQueueProcessors() {
    // Ticket processing queue
    this.queueManager.addProcessor('ticket-processing', async (job) => {
      return await this.processTicket(job.data);
    });

    // Knowledge base indexing queue
    this.queueManager.addProcessor('knowledge-indexing', async (job) => {
      return await this.indexKnowledgeBase(job.data);
    });

    // Response generation queue
    this.queueManager.addProcessor('response-generation', async (job) => {
      return await this.generateResponse(job.data);
    });
  }

  /**
   * Process a ticket through the AI pipeline
   */
  async processTicket(ticketData) {
    try {
      logger.info(`Processing ticket ${ticketData.id} through AI pipeline`);
      
      const startTime = Date.now();
      const result = {
        ticketId: ticketData.id,
        timestamp: new Date(),
        processingTime: 0,
        classification: null,
        knowledgeMatches: [],
        suggestedResponse: null,
        confidence: 0,
        autoResolve: false,
        errors: []
      };

      // Step 1: Classify the ticket
      try {
        result.classification = await this.classificationEngine.classify(ticketData);
        logger.debug(`Ticket ${ticketData.id} classified as:`, result.classification);
      } catch (error) {
        logger.error(`Classification failed for ticket ${ticketData.id}:`, error);
        result.errors.push({ step: 'classification', error: error.message });
      }

      // Step 2: Search knowledge base
      try {
        result.knowledgeMatches = await this.knowledgeEngine.search(ticketData, result.classification);
        logger.debug(`Found ${result.knowledgeMatches.length} knowledge matches for ticket ${ticketData.id}`);
      } catch (error) {
        logger.error(`Knowledge search failed for ticket ${ticketData.id}:`, error);
        result.errors.push({ step: 'knowledge_search', error: error.message });
      }

      // Step 3: Generate response
      try {
        result.suggestedResponse = await this.responseEngine.generate(
          ticketData, 
          result.classification, 
          result.knowledgeMatches
        );
        logger.debug(`Generated response for ticket ${ticketData.id}`);
      } catch (error) {
        logger.error(`Response generation failed for ticket ${ticketData.id}:`, error);
        result.errors.push({ step: 'response_generation', error: error.message });
      }

      // Step 4: Calculate confidence score
      try {
        result.confidence = await this.confidenceEngine.calculate(
          ticketData,
          result.classification,
          result.knowledgeMatches,
          result.suggestedResponse
        );
        
        // Determine if auto-resolve is appropriate
        const autoResolveThreshold = this.configManager.get('autoResolveThreshold', 0.85);
        result.autoResolve = result.confidence >= autoResolveThreshold && result.errors.length === 0;
        
        logger.debug(`Confidence score for ticket ${ticketData.id}: ${result.confidence}`);
      } catch (error) {
        logger.error(`Confidence calculation failed for ticket ${ticketData.id}:`, error);
        result.errors.push({ step: 'confidence_calculation', error: error.message });
      }

      result.processingTime = Date.now() - startTime;
      logger.info(`Completed processing ticket ${ticketData.id} in ${result.processingTime}ms`);
      
      return result;
    } catch (error) {
      logger.error(`Failed to process ticket ${ticketData.id}:`, error);
      throw error;
    }
  }

  /**
   * Index knowledge base articles for search
   */
  async indexKnowledgeBase(data) {
    try {
      logger.info('Indexing knowledge base articles');
      return await this.knowledgeEngine.indexArticles(data.articles);
    } catch (error) {
      logger.error('Failed to index knowledge base:', error);
      throw error;
    }
  }

  /**
   * Generate a response for a specific ticket
   */
  async generateResponse(data) {
    try {
      logger.info(`Generating response for ticket ${data.ticketId}`);
      
      const classification = data.classification || await this.classificationEngine.classify(data.ticket);
      const knowledgeMatches = data.knowledgeMatches || await this.knowledgeEngine.search(data.ticket, classification);
      
      return await this.responseEngine.generate(data.ticket, classification, knowledgeMatches);
    } catch (error) {
      logger.error(`Failed to generate response for ticket ${data.ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Queue a ticket for AI processing
   */
  async queueTicketProcessing(ticketData, priority = 'normal') {
    if (!this.isInitialized) {
      throw new Error('AI Agent Service not initialized');
    }

    const jobOptions = {
      priority: priority === 'urgent' ? 1 : priority === 'high' ? 2 : 3,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    return await this.queueManager.addJob('ticket-processing', ticketData, jobOptions);
  }

  /**
   * Queue knowledge base indexing
   */
  async queueKnowledgeIndexing(articles) {
    if (!this.isInitialized) {
      throw new Error('AI Agent Service not initialized');
    }

    return await this.queueManager.addJob('knowledge-indexing', { articles });
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const status = {
      service: 'AI Agent Service',
      status: this.isInitialized ? 'healthy' : 'initializing',
      timestamp: new Date(),
      engines: {},
      queues: {},
      config: {}
    };

    if (this.isInitialized) {
      // Check engine health
      status.engines.classification = await this.classificationEngine.getHealth();
      status.engines.knowledge = await this.knowledgeEngine.getHealth();
      status.engines.response = await this.responseEngine.getHealth();
      status.engines.confidence = await this.confidenceEngine.getHealth();

      // Check queue health
      status.queues = await this.queueManager.getHealth();

      // Get configuration status
      status.config = this.configManager.getHealthStatus();
    }

    return status;
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    await this.configManager.updateConfig(newConfig);
    
    // Notify engines of config changes
    await this.classificationEngine.updateConfig(this.configManager.getConfig());
    await this.knowledgeEngine.updateConfig(this.configManager.getConfig());
    await this.responseEngine.updateConfig(this.configManager.getConfig());
    await this.confidenceEngine.updateConfig(this.configManager.getConfig());
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    logger.info('Shutting down AI Agent Service...');
    
    if (this.queueManager) {
      await this.queueManager.shutdown();
    }
    
    this.isInitialized = false;
    logger.info('AI Agent Service shutdown complete');
  }
}

// Export singleton instance
module.exports = new AIAgentService();
