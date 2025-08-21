/**
 * Auto-Resolution Workflow
 * Manages the complete automation pipeline from ticket intake to resolution
 */

const Ticket = require('../../../models/Ticket');
const AgentSuggestion = require('../../../models/AgentSuggestion');
const User = require('../../../models/User');
const aiAgentService = require('../index');
const logger = require('../../../config/logger');
const { v4: uuidv4 } = require('uuid');

class AutoResolutionWorkflow {
  constructor() {
    this.isInitialized = false;
    this.processingQueue = new Map();
    this.config = null;
  }

  /**
   * Initialize the workflow
   */
  async initialize(config) {
    try {
      logger.info('Initializing Auto-Resolution Workflow...');
      
      this.config = config;
      this.isInitialized = true;
      
      logger.info('Auto-Resolution Workflow initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Auto-Resolution Workflow:', error);
      throw error;
    }
  }

  /**
   * Process a new ticket through the AI pipeline
   */
  async processTicket(ticketId, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Auto-Resolution Workflow not initialized');
      }

      logger.info(`Starting AI processing for ticket: ${ticketId}`);
      
      const traceId = uuidv4();
      const startTime = Date.now();
      
      // Check if already processing
      if (this.processingQueue.has(ticketId)) {
        logger.warn(`Ticket ${ticketId} is already being processed`);
        return this.processingQueue.get(ticketId);
      }

      // Create processing promise
      const processingPromise = this.executeProcessingPipeline(ticketId, traceId, options);
      this.processingQueue.set(ticketId, processingPromise);

      try {
        const result = await processingPromise;
        logger.info(`Completed AI processing for ticket ${ticketId} in ${Date.now() - startTime}ms`);
        return result;
      } finally {
        this.processingQueue.delete(ticketId);
      }

    } catch (error) {
      logger.error(`Failed to process ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Execute the complete processing pipeline
   */
  async executeProcessingPipeline(ticketId, traceId, options) {
    const pipeline = {
      ticketId,
      traceId,
      startTime: Date.now(),
      steps: [],
      result: null,
      suggestion: null
    };

    try {
      // Step 1: Load and validate ticket
      pipeline.steps.push({ step: 'load_ticket', startTime: Date.now() });
      const ticket = await this.loadTicket(ticketId);
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 2: Create agent suggestion record
      pipeline.steps.push({ step: 'create_suggestion', startTime: Date.now() });
      const suggestion = await this.createAgentSuggestion(ticket, traceId);
      pipeline.suggestion = suggestion;
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 3: Queue for AI processing
      pipeline.steps.push({ step: 'ai_processing', startTime: Date.now() });
      const aiResult = await aiAgentService.queueTicketProcessing(ticket, options.priority);
      
      // Wait for processing to complete
      const processingResult = await this.waitForProcessingCompletion(aiResult.id, suggestion);
      pipeline.result = processingResult;
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 4: Update suggestion with results
      pipeline.steps.push({ step: 'update_suggestion', startTime: Date.now() });
      await this.updateSuggestionWithResults(suggestion, processingResult);
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 5: Determine next action
      pipeline.steps.push({ step: 'determine_action', startTime: Date.now() });
      const action = await this.determineNextAction(suggestion, processingResult);
      pipeline.action = action;
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 6: Execute action
      pipeline.steps.push({ step: 'execute_action', startTime: Date.now() });
      const actionResult = await this.executeAction(action, ticket, suggestion, processingResult);
      pipeline.actionResult = actionResult;
      pipeline.steps[pipeline.steps.length - 1].endTime = Date.now();
      pipeline.steps[pipeline.steps.length - 1].success = true;

      // Step 7: Record audit trail
      await this.recordAuditTrail(pipeline);

      pipeline.endTime = Date.now();
      pipeline.totalTime = pipeline.endTime - pipeline.startTime;
      pipeline.success = true;

      logger.info(`Processing pipeline completed for ticket ${ticketId}:`, {
        traceId,
        totalTime: pipeline.totalTime,
        action: action.type,
        autoResolved: actionResult.autoResolved
      });

      return pipeline;

    } catch (error) {
      pipeline.endTime = Date.now();
      pipeline.totalTime = pipeline.endTime - pipeline.startTime;
      pipeline.success = false;
      pipeline.error = error.message;

      // Mark current step as failed
      if (pipeline.steps.length > 0) {
        const currentStep = pipeline.steps[pipeline.steps.length - 1];
        if (!currentStep.endTime) {
          currentStep.endTime = Date.now();
          currentStep.success = false;
          currentStep.error = error.message;
        }
      }

      // Update suggestion with error
      if (pipeline.suggestion) {
        await this.updateSuggestionWithError(pipeline.suggestion, error);
      }

      logger.error(`Processing pipeline failed for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Load ticket data
   */
  async loadTicket(ticketId) {
    const ticket = await Ticket.findById(ticketId)
      .populate('requester', 'firstName lastName email tier role')
      .populate('assignee', 'firstName lastName email');

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    return ticket;
  }

  /**
   * Create agent suggestion record
   */
  async createAgentSuggestion(ticket, traceId) {
    const suggestion = new AgentSuggestion({
      ticketId: ticket._id,
      traceId,
      type: 'full_processing',
      status: 'processing',
      aiProvider: 'hybrid',
      originalData: {
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        attachments: ticket.attachments?.map(a => a.filename) || []
      }
    });

    await suggestion.save();
    
    suggestion.addAuditEntry('Processing started', null, {
      traceId,
      ticketId: ticket._id.toString()
    });

    await suggestion.save();

    logger.debug(`Created agent suggestion ${suggestion._id} for ticket ${ticket._id}`);
    
    return suggestion;
  }

  /**
   * Wait for AI processing to complete
   */
  async waitForProcessingCompletion(jobId, suggestion, maxWaitTime = 60000) {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check job status (this would depend on your queue implementation)
        const jobStatus = await aiAgentService.queueManager.getJobStatus('ticket-processing', jobId);
        
        if (jobStatus && jobStatus.state === 'completed') {
          return jobStatus.returnvalue;
        } else if (jobStatus && jobStatus.state === 'failed') {
          throw new Error(`AI processing failed: ${jobStatus.failedReason}`);
        }

        // Update suggestion status
        if (suggestion.status === 'processing') {
          suggestion.addAuditEntry('Processing in progress', null, {
            jobId,
            waitTime: Date.now() - startTime
          });
          await suggestion.save();
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        logger.error('Error checking processing status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error('AI processing timeout');
  }

  /**
   * Update suggestion with AI processing results
   */
  async updateSuggestionWithResults(suggestion, processingResult) {
    suggestion.classification = processingResult.classification;
    suggestion.knowledgeMatches = processingResult.knowledgeMatches;
    suggestion.suggestedResponse = processingResult.suggestedResponse;
    suggestion.confidence = processingResult.confidence;
    suggestion.autoResolve = processingResult.autoResolve;
    suggestion.autoResolveReason = processingResult.autoResolve ? 
      `High confidence (${processingResult.confidence.calibrated.toFixed(2)}) auto-resolution` : null;
    
    suggestion.status = 'completed';
    suggestion.processingTime = processingResult.processingTime;

    suggestion.addAuditEntry('AI processing completed', null, {
      confidence: processingResult.confidence.calibrated,
      recommendation: processingResult.confidence.recommendation,
      autoResolve: processingResult.autoResolve
    });

    await suggestion.save();

    logger.debug(`Updated suggestion ${suggestion._id} with AI results`);
  }

  /**
   * Update suggestion with error information
   */
  async updateSuggestionWithError(suggestion, error) {
    suggestion.status = 'failed';
    suggestion.errors = suggestion.errors || [];
    suggestion.errors.push({
      step: 'ai_processing',
      error: error.message,
      timestamp: new Date()
    });

    suggestion.addAuditEntry('Processing failed', null, {
      error: error.message
    });

    await suggestion.save();
  }

  /**
   * Determine next action based on AI results
   */
  async determineNextAction(suggestion, processingResult) {
    const confidence = processingResult.confidence;
    const recommendation = confidence.recommendation;

    const action = {
      type: recommendation,
      confidence: confidence.calibrated,
      reasoning: [],
      parameters: {}
    };

    switch (recommendation) {
      case 'auto_resolve':
        action.reasoning.push('High confidence AI resolution');
        action.parameters = {
          responseContent: processingResult.suggestedResponse.content,
          closeTicket: true,
          notifyCustomer: true
        };
        break;

      case 'agent_review':
        action.reasoning.push('Medium confidence - requires agent review');
        action.parameters = {
          assignToQueue: 'ai_review',
          priority: 'normal'
        };
        break;

      case 'human_review':
        action.reasoning.push('Low confidence - requires human review');
        action.parameters = {
          assignToQueue: 'human_review',
          priority: 'high'
        };
        break;

      case 'escalate':
        action.reasoning.push('Very low confidence - escalate to senior agent');
        action.parameters = {
          escalationLevel: 'senior',
          priority: 'urgent'
        };
        break;

      default:
        action.type = 'human_review';
        action.reasoning.push('Unknown recommendation - defaulting to human review');
    }

    return action;
  }

  /**
   * Execute the determined action
   */
  async executeAction(action, ticket, suggestion, processingResult) {
    const result = {
      action: action.type,
      success: false,
      autoResolved: false,
      details: {}
    };

    try {
      switch (action.type) {
        case 'auto_resolve':
          result.details = await this.executeAutoResolution(ticket, suggestion, action.parameters);
          result.autoResolved = true;
          result.success = true;
          break;

        case 'agent_review':
          result.details = await this.queueForAgentReview(ticket, suggestion, action.parameters);
          result.success = true;
          break;

        case 'human_review':
          result.details = await this.queueForHumanReview(ticket, suggestion, action.parameters);
          result.success = true;
          break;

        case 'escalate':
          result.details = await this.escalateTicket(ticket, suggestion, action.parameters);
          result.success = true;
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Update suggestion with action result
      suggestion.addAuditEntry(`Action executed: ${action.type}`, null, result.details);
      await suggestion.save();

      return result;

    } catch (error) {
      result.success = false;
      result.error = error.message;
      
      logger.error(`Failed to execute action ${action.type} for ticket ${ticket._id}:`, error);
      throw error;
    }
  }

  /**
   * Execute auto-resolution
   */
  async executeAutoResolution(ticket, suggestion, parameters) {
    logger.info(`Auto-resolving ticket ${ticket._id}`);

    // Update ticket status
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    ticket.resolution = {
      type: 'ai_auto_resolved',
      content: parameters.responseContent,
      resolvedBy: null, // AI resolution
      resolvedAt: new Date()
    };

    await ticket.save();

    // Record in suggestion
    suggestion.status = 'auto_applied';
    suggestion.addAuditEntry('Auto-resolution applied', null, {
      responseContent: parameters.responseContent
    });
    await suggestion.save();

    // TODO: Send notification to customer
    if (parameters.notifyCustomer) {
      // Implementation would depend on your notification system
      logger.info(`Would send auto-resolution notification for ticket ${ticket._id}`);
    }

    return {
      ticketStatus: 'resolved',
      responseContent: parameters.responseContent,
      notificationSent: parameters.notifyCustomer
    };
  }

  /**
   * Queue for agent review
   */
  async queueForAgentReview(ticket, suggestion, parameters) {
    logger.info(`Queueing ticket ${ticket._id} for agent review`);

    // Find available agents
    const availableAgents = await User.find({
      role: 'agent',
      isActive: true
    }).sort({ workload: 1 }).limit(5);

    if (availableAgents.length > 0) {
      // Simple round-robin assignment
      const assignedAgent = availableAgents[0];
      ticket.assignee = assignedAgent._id;
      ticket.status = 'in_progress';
      await ticket.save();

      suggestion.addAuditEntry('Assigned to agent for review', assignedAgent._id, {
        agentName: `${assignedAgent.firstName} ${assignedAgent.lastName}`
      });
      await suggestion.save();

      return {
        assignedTo: assignedAgent._id,
        agentName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
        queue: parameters.assignToQueue
      };
    } else {
      // No agents available, keep in queue
      return {
        assignedTo: null,
        queue: parameters.assignToQueue,
        status: 'queued'
      };
    }
  }

  /**
   * Queue for human review
   */
  async queueForHumanReview(ticket, suggestion, parameters) {
    logger.info(`Queueing ticket ${ticket._id} for human review`);

    ticket.priority = parameters.priority;
    ticket.status = 'triaged';
    await ticket.save();

    suggestion.addAuditEntry('Queued for human review', null, {
      priority: parameters.priority,
      reason: 'Low AI confidence'
    });
    await suggestion.save();

    return {
      queue: parameters.assignToQueue,
      priority: parameters.priority,
      status: 'queued_for_human_review'
    };
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(ticket, suggestion, parameters) {
    logger.info(`Escalating ticket ${ticket._id}`);

    ticket.priority = 'urgent';
    ticket.status = 'escalated';
    await ticket.save();

    suggestion.addAuditEntry('Ticket escalated', null, {
      escalationLevel: parameters.escalationLevel,
      reason: 'Very low AI confidence'
    });
    await suggestion.save();

    return {
      escalationLevel: parameters.escalationLevel,
      priority: 'urgent',
      status: 'escalated'
    };
  }

  /**
   * Record audit trail
   */
  async recordAuditTrail(pipeline) {
    // Create comprehensive audit record
    const auditData = {
      ticketId: pipeline.ticketId,
      traceId: pipeline.traceId,
      processingTime: pipeline.totalTime,
      steps: pipeline.steps,
      success: pipeline.success,
      action: pipeline.action?.type,
      autoResolved: pipeline.actionResult?.autoResolved || false
    };

    // In production, this would be stored in a dedicated audit system
    logger.info('Audit trail recorded:', auditData);
  }

  /**
   * Get processing status
   */
  async getProcessingStatus(ticketId) {
    const suggestion = await AgentSuggestion.findOne({ ticketId })
      .sort({ createdAt: -1 });

    if (!suggestion) {
      return { status: 'not_processed' };
    }

    return {
      status: suggestion.status,
      confidence: suggestion.confidence,
      recommendation: suggestion.confidence?.recommendation,
      autoResolve: suggestion.autoResolve,
      createdAt: suggestion.createdAt,
      traceId: suggestion.traceId
    };
  }

  /**
   * Get health status
   */
  async getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      processingQueue: this.processingQueue.size,
      config: !!this.config
    };
  }
}

module.exports = new AutoResolutionWorkflow();
