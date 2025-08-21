/**
 * Confidence Engine
 * Calculates confidence scores for AI decisions and auto-resolution recommendations
 */

const logger = require('../../../config/logger');

class ConfidenceEngine {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.historicalData = new Map();
    this.calibrationData = new Map();
    this.performanceMetrics = new Map();
  }

  /**
   * Initialize the confidence engine
   */
  async initialize(config) {
    try {
      logger.info('Initializing Confidence Engine...');
      
      this.config = config;
      
      // Load historical performance data
      await this.loadHistoricalData();
      
      // Initialize calibration models
      await this.initializeCalibration();
      
      this.isInitialized = true;
      logger.info('Confidence Engine initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Confidence Engine:', error);
      throw error;
    }
  }

  /**
   * Load historical performance data for calibration
   */
  async loadHistoricalData() {
    // In production, this would load from a metrics database
    // For now, initialize with default values
    
    this.performanceMetrics.set('classification', {
      totalPredictions: 1000,
      correctPredictions: 850,
      accuracy: 0.85,
      categoryAccuracy: {
        technical: 0.90,
        billing: 0.88,
        account: 0.92,
        general: 0.75,
        feature_request: 0.80
      }
    });
    
    this.performanceMetrics.set('knowledge_search', {
      totalSearches: 2000,
      relevantResults: 1600,
      accuracy: 0.80,
      averageRelevanceScore: 0.75
    });
    
    this.performanceMetrics.set('response_generation', {
      totalResponses: 1500,
      satisfactoryResponses: 1275,
      satisfaction: 0.85,
      templateAccuracy: 0.90,
      llmAccuracy: 0.82
    });
    
    logger.info('Historical performance data loaded');
  }

  /**
   * Initialize calibration models
   */
  async initializeCalibration() {
    // Calibration curves for different confidence ranges
    this.calibrationData.set('classification', {
      bins: [
        { range: [0.0, 0.2], actualAccuracy: 0.15, sampleSize: 100 },
        { range: [0.2, 0.4], actualAccuracy: 0.35, sampleSize: 150 },
        { range: [0.4, 0.6], actualAccuracy: 0.55, sampleSize: 200 },
        { range: [0.6, 0.8], actualAccuracy: 0.72, sampleSize: 300 },
        { range: [0.8, 1.0], actualAccuracy: 0.88, sampleSize: 250 }
      ]
    });
    
    this.calibrationData.set('knowledge_search', {
      bins: [
        { range: [0.0, 0.2], actualAccuracy: 0.12, sampleSize: 80 },
        { range: [0.2, 0.4], actualAccuracy: 0.32, sampleSize: 120 },
        { range: [0.4, 0.6], actualAccuracy: 0.52, sampleSize: 180 },
        { range: [0.6, 0.8], actualAccuracy: 0.68, sampleSize: 250 },
        { range: [0.8, 1.0], actualAccuracy: 0.85, sampleSize: 200 }
      ]
    });
    
    logger.info('Calibration models initialized');
  }

  /**
   * Calculate overall confidence score for AI processing result
   */
  async calculate(ticketData, classification, knowledgeMatches, suggestedResponse) {
    try {
      if (!this.isInitialized) {
        throw new Error('Confidence Engine not initialized');
      }

      logger.debug(`Calculating confidence for ticket: ${ticketData.id}`);
      
      const confidence = {
        overall: 0,
        components: {
          classification: 0,
          knowledgeSearch: 0,
          responseGeneration: 0,
          contextual: 0
        },
        factors: {
          dataQuality: 0,
          historicalPerformance: 0,
          complexity: 0,
          coverage: 0
        },
        calibrated: 0,
        recommendation: 'human_review'
      };

      // Calculate component confidences
      confidence.components.classification = this.calculateClassificationConfidence(classification, ticketData);
      confidence.components.knowledgeSearch = this.calculateKnowledgeSearchConfidence(knowledgeMatches, ticketData);
      confidence.components.responseGeneration = this.calculateResponseConfidence(suggestedResponse, ticketData);
      confidence.components.contextual = this.calculateContextualConfidence(ticketData, classification);

      // Calculate factor scores
      confidence.factors.dataQuality = this.assessDataQuality(ticketData);
      confidence.factors.historicalPerformance = this.getHistoricalPerformance(classification);
      confidence.factors.complexity = this.assessComplexity(ticketData, classification);
      confidence.factors.coverage = this.assessCoverage(knowledgeMatches);

      // Calculate overall confidence
      confidence.overall = this.calculateOverallConfidence(confidence.components, confidence.factors);

      // Apply calibration
      confidence.calibrated = this.applyCalibratedConfidence(confidence.overall, 'overall');

      // Determine recommendation
      confidence.recommendation = this.determineRecommendation(confidence.calibrated, ticketData, classification);

      logger.debug(`Confidence calculation complete for ticket ${ticketData.id}:`, {
        overall: confidence.overall,
        calibrated: confidence.calibrated,
        recommendation: confidence.recommendation
      });

      return confidence;

    } catch (error) {
      logger.error(`Failed to calculate confidence for ticket ${ticketData.id}:`, error);
      
      // Return low confidence on error
      return {
        overall: 0.2,
        components: { classification: 0, knowledgeSearch: 0, responseGeneration: 0, contextual: 0 },
        factors: { dataQuality: 0, historicalPerformance: 0, complexity: 0, coverage: 0 },
        calibrated: 0.2,
        recommendation: 'human_review',
        error: error.message
      };
    }
  }

  /**
   * Calculate classification confidence
   */
  calculateClassificationConfidence(classification, ticketData) {
    if (!classification) return 0;

    let confidence = 0;
    const weights = { category: 0.4, priority: 0.3, routing: 0.2, duplicates: 0.1 };

    // Category confidence
    if (classification.category) {
      confidence += (classification.category.confidence || 0) * weights.category;
    }

    // Priority confidence
    if (classification.priority) {
      confidence += (classification.priority.confidence || 0) * weights.priority;
    }

    // Routing confidence (based on rule clarity)
    if (classification.routing) {
      const routingConfidence = classification.routing.reasoning.length > 0 ? 0.8 : 0.5;
      confidence += routingConfidence * weights.routing;
    }

    // Duplicate detection confidence
    const duplicateConfidence = classification.duplicates.length === 0 ? 0.9 : 0.6;
    confidence += duplicateConfidence * weights.duplicates;

    // Apply historical accuracy for this category
    const categoryAccuracy = this.getCategoryAccuracy(classification.category?.category);
    confidence *= categoryAccuracy;

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate knowledge search confidence
   */
  calculateKnowledgeSearchConfidence(knowledgeMatches, ticketData) {
    if (!knowledgeMatches || knowledgeMatches.length === 0) {
      return 0.1; // Low confidence if no matches found
    }

    let confidence = 0;
    const topMatch = knowledgeMatches[0];

    // Base confidence from top match score
    confidence = topMatch.score || 0;

    // Boost for multiple good matches
    const goodMatches = knowledgeMatches.filter(match => match.score > 0.6);
    if (goodMatches.length > 1) {
      confidence += 0.1;
    }

    // Boost for high helpfulness ratio
    if (topMatch.helpfulnessRatio > 0.8) {
      confidence += 0.1;
    }

    // Boost for popular articles
    if (topMatch.viewCount > 100) {
      confidence += 0.05;
    }

    // Apply historical search performance
    const searchPerformance = this.performanceMetrics.get('knowledge_search');
    if (searchPerformance) {
      confidence *= searchPerformance.accuracy;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate response generation confidence
   */
  calculateResponseConfidence(suggestedResponse, ticketData) {
    if (!suggestedResponse) return 0;

    let confidence = suggestedResponse.confidence || 0;

    // Adjust based on response type
    const typeMultipliers = {
      template: 1.0,
      llm: 0.9,
      hybrid: 0.95,
      fallback: 0.3
    };

    confidence *= typeMultipliers[suggestedResponse.type] || 0.5;

    // Penalize very short or very long responses
    const contentLength = suggestedResponse.content?.length || 0;
    if (contentLength < 100) {
      confidence *= 0.8; // Too short
    } else if (contentLength > 2000) {
      confidence *= 0.9; // Too long
    }

    // Apply historical response performance
    const responsePerformance = this.performanceMetrics.get('response_generation');
    if (responsePerformance) {
      const typeAccuracy = suggestedResponse.type === 'template' ? 
        responsePerformance.templateAccuracy : responsePerformance.llmAccuracy;
      confidence *= typeAccuracy;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate contextual confidence based on ticket characteristics
   */
  calculateContextualConfidence(ticketData, classification) {
    let confidence = 0.5; // Base contextual confidence

    // User tier influence
    const userTier = ticketData.requester?.tier || 'standard';
    if (userTier === 'premium' || userTier === 'enterprise') {
      confidence += 0.1; // Higher confidence for premium users (better data quality)
    }

    // Ticket completeness
    const hasSubject = !!(ticketData.subject && ticketData.subject.length > 10);
    const hasDescription = !!(ticketData.description && ticketData.description.length > 20);
    const hasAttachments = !!(ticketData.attachments && ticketData.attachments.length > 0);

    if (hasSubject && hasDescription) {
      confidence += 0.2;
    }
    if (hasAttachments) {
      confidence += 0.1;
    }

    // Priority alignment
    if (classification?.priority?.reasoning?.length > 0) {
      confidence += 0.1;
    }

    // Time of day (business hours vs off-hours)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      confidence += 0.05; // Slightly higher confidence during business hours
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Assess data quality of the ticket
   */
  assessDataQuality(ticketData) {
    let quality = 0;

    // Subject quality
    if (ticketData.subject) {
      const subjectLength = ticketData.subject.length;
      if (subjectLength >= 10 && subjectLength <= 100) {
        quality += 0.25;
      } else if (subjectLength > 5) {
        quality += 0.15;
      }
    }

    // Description quality
    if (ticketData.description) {
      const descLength = ticketData.description.length;
      if (descLength >= 50 && descLength <= 1000) {
        quality += 0.35;
      } else if (descLength > 20) {
        quality += 0.25;
      }
    }

    // User information completeness
    if (ticketData.requester) {
      if (ticketData.requester.firstName && ticketData.requester.lastName) {
        quality += 0.15;
      }
      if (ticketData.requester.email) {
        quality += 0.1;
      }
    }

    // Category/tags presence
    if (ticketData.category || (ticketData.tags && ticketData.tags.length > 0)) {
      quality += 0.15;
    }

    return Math.min(quality, 1.0);
  }

  /**
   * Get historical performance for similar cases
   */
  getHistoricalPerformance(classification) {
    const category = classification?.category?.category;
    const categoryAccuracy = this.getCategoryAccuracy(category);
    
    // Combine with overall system performance
    const overallPerformance = this.performanceMetrics.get('classification')?.accuracy || 0.8;
    
    return (categoryAccuracy + overallPerformance) / 2;
  }

  /**
   * Assess complexity of the ticket
   */
  assessComplexity(ticketData, classification) {
    let complexity = 0.5; // Base complexity

    // Text complexity indicators
    const text = `${ticketData.subject} ${ticketData.description}`.toLowerCase();
    
    // Technical terms increase complexity
    const technicalTerms = ['api', 'database', 'server', 'integration', 'ssl', 'dns', 'error code'];
    const technicalCount = technicalTerms.filter(term => text.includes(term)).length;
    complexity += technicalCount * 0.1;

    // Multiple issues mentioned
    const issueIndicators = ['and', 'also', 'additionally', 'furthermore', 'moreover'];
    const multipleIssues = issueIndicators.filter(indicator => text.includes(indicator)).length;
    complexity += multipleIssues * 0.05;

    // Urgency indicators increase complexity
    const urgencyWords = ['urgent', 'critical', 'emergency', 'asap', 'immediately'];
    const urgencyCount = urgencyWords.filter(word => text.includes(word)).length;
    complexity += urgencyCount * 0.1;

    // Priority level
    const priority = classification?.priority?.priority;
    if (priority === 'urgent') complexity += 0.2;
    else if (priority === 'high') complexity += 0.1;

    // Invert complexity for confidence (higher complexity = lower confidence)
    return Math.max(0, 1 - Math.min(complexity, 1.0));
  }

  /**
   * Assess knowledge base coverage for the issue
   */
  assessCoverage(knowledgeMatches) {
    if (!knowledgeMatches || knowledgeMatches.length === 0) {
      return 0.1; // Poor coverage
    }

    const topScore = knowledgeMatches[0].score || 0;
    const matchCount = knowledgeMatches.length;

    let coverage = topScore;

    // Boost for multiple relevant matches
    if (matchCount >= 3 && knowledgeMatches[2].score > 0.5) {
      coverage += 0.1;
    }

    // Boost for high helpfulness ratio
    const avgHelpfulness = knowledgeMatches.reduce((sum, match) => 
      sum + (match.helpfulnessRatio || 0), 0) / matchCount;
    coverage += avgHelpfulness * 0.2;

    return Math.min(coverage, 1.0);
  }

  /**
   * Calculate overall confidence from components and factors
   */
  calculateOverallConfidence(components, factors) {
    // Component weights
    const componentWeights = {
      classification: 0.25,
      knowledgeSearch: 0.30,
      responseGeneration: 0.25,
      contextual: 0.20
    };

    // Factor weights
    const factorWeights = {
      dataQuality: 0.30,
      historicalPerformance: 0.25,
      complexity: 0.25,
      coverage: 0.20
    };

    // Calculate weighted component score
    let componentScore = 0;
    for (const [component, weight] of Object.entries(componentWeights)) {
      componentScore += (components[component] || 0) * weight;
    }

    // Calculate weighted factor score
    let factorScore = 0;
    for (const [factor, weight] of Object.entries(factorWeights)) {
      factorScore += (factors[factor] || 0) * weight;
    }

    // Combine component and factor scores
    const overallConfidence = (componentScore * 0.7) + (factorScore * 0.3);

    return Math.min(overallConfidence, 1.0);
  }

  /**
   * Apply calibrated confidence based on historical performance
   */
  applyCalibratedConfidence(rawConfidence, type = 'overall') {
    const calibrationData = this.calibrationData.get('classification'); // Use classification as default
    
    if (!calibrationData) {
      return rawConfidence;
    }

    // Find the appropriate calibration bin
    for (const bin of calibrationData.bins) {
      if (rawConfidence >= bin.range[0] && rawConfidence < bin.range[1]) {
        // Apply calibration adjustment
        const adjustment = bin.actualAccuracy / ((bin.range[0] + bin.range[1]) / 2);
        return Math.min(rawConfidence * adjustment, 1.0);
      }
    }

    return rawConfidence;
  }

  /**
   * Determine recommendation based on confidence score
   */
  determineRecommendation(confidence, ticketData, classification) {
    const autoResolveThreshold = this.config?.autoResolveThreshold || 0.85;
    const humanReviewThreshold = 0.6;

    // Check auto-resolution rules
    const autoResolutionConfig = this.config?.autoResolution;
    if (autoResolutionConfig?.enabled) {
      // Check category restrictions
      const category = classification?.category?.category;
      if (autoResolutionConfig.categories.includes(category)) {
        // Check priority restrictions
        const priority = classification?.priority?.priority;
        const maxPriority = autoResolutionConfig.maxPriority;
        const priorityOrder = ['low', 'medium', 'high', 'urgent'];
        
        if (priorityOrder.indexOf(priority) <= priorityOrder.indexOf(maxPriority)) {
          // Check confidence threshold
          if (confidence >= autoResolveThreshold) {
            return 'auto_resolve';
          }
        }
      }
    }

    // Determine other recommendations
    if (confidence >= humanReviewThreshold) {
      return 'agent_review';
    } else if (confidence >= 0.3) {
      return 'human_review';
    } else {
      return 'escalate';
    }
  }

  /**
   * Get category-specific accuracy
   */
  getCategoryAccuracy(category) {
    const classificationMetrics = this.performanceMetrics.get('classification');
    if (classificationMetrics && classificationMetrics.categoryAccuracy) {
      return classificationMetrics.categoryAccuracy[category] || classificationMetrics.accuracy;
    }
    return 0.8; // Default accuracy
  }

  /**
   * Record confidence feedback for learning
   */
  async recordFeedback(ticketId, predictedConfidence, actualOutcome, feedback) {
    try {
      // Store feedback for future calibration
      const feedbackData = {
        ticketId,
        predictedConfidence,
        actualOutcome, // 'correct', 'incorrect', 'partial'
        feedback,
        timestamp: new Date()
      };

      // In production, this would be stored in a database
      logger.info(`Recorded confidence feedback for ticket ${ticketId}:`, feedbackData);

      // Update performance metrics
      await this.updatePerformanceMetrics(feedbackData);

    } catch (error) {
      logger.error('Failed to record confidence feedback:', error);
    }
  }

  /**
   * Update performance metrics based on feedback
   */
  async updatePerformanceMetrics(feedbackData) {
    // Simple online learning update (in production, use more sophisticated methods)
    const learningRate = 0.1;
    
    // Update overall accuracy
    const classificationMetrics = this.performanceMetrics.get('classification');
    if (classificationMetrics) {
      const isCorrect = feedbackData.actualOutcome === 'correct';
      const currentAccuracy = classificationMetrics.accuracy;
      const newAccuracy = currentAccuracy + learningRate * (isCorrect ? 1 : 0 - currentAccuracy);
      
      classificationMetrics.accuracy = newAccuracy;
      classificationMetrics.totalPredictions += 1;
      if (isCorrect) {
        classificationMetrics.correctPredictions += 1;
      }
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = newConfig;
    logger.info('Confidence Engine configuration updated');
  }

  /**
   * Get health status
   */
  async getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      calibrationBins: this.calibrationData.size,
      historicalDataPoints: this.historicalData.size
    };
  }
}

module.exports = ConfidenceEngine;
