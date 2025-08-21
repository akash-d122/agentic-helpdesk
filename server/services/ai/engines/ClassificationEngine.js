/**
 * Classification Engine
 * Intelligent ticket categorization, priority assessment, and routing logic
 */

const natural = require('natural');
const compromise = require('compromise');
const logger = require('../../../config/logger');

class ClassificationEngine {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.classifier = null;
    this.priorityClassifier = null;
    this.routingRules = new Map();
    this.categoryKeywords = new Map();
    this.urgencyIndicators = new Set();
    this.duplicateDetector = null;
  }

  /**
   * Initialize the classification engine
   */
  async initialize(config) {
    try {
      logger.info('Initializing Classification Engine...');
      
      this.config = config;
      
      // Initialize NLP components
      await this.initializeNLP();
      
      // Load classification rules
      await this.loadClassificationRules();
      
      // Initialize duplicate detection
      await this.initializeDuplicateDetection();
      
      this.isInitialized = true;
      logger.info('Classification Engine initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Classification Engine:', error);
      throw error;
    }
  }

  /**
   * Initialize NLP components
   */
  async initializeNLP() {
    // Initialize tokenizer and stemmer
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Initialize TF-IDF for text analysis
    this.tfidf = new natural.TfIdf();
    
    // Initialize sentiment analyzer
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
  }

  /**
   * Load classification rules and training data
   */
  async loadClassificationRules() {
    // Category keywords mapping
    this.categoryKeywords.set('technical', [
      'error', 'bug', 'crash', 'broken', 'not working', 'issue', 'problem',
      'api', 'database', 'server', 'connection', 'timeout', 'performance',
      'integration', 'sync', 'backup', 'restore', 'update', 'upgrade'
    ]);
    
    this.categoryKeywords.set('billing', [
      'payment', 'invoice', 'charge', 'billing', 'subscription', 'plan',
      'refund', 'credit', 'discount', 'pricing', 'cost', 'fee', 'money'
    ]);
    
    this.categoryKeywords.set('account', [
      'login', 'password', 'access', 'account', 'profile', 'settings',
      'permissions', 'role', 'user', 'authentication', 'security', 'lock'
    ]);
    
    this.categoryKeywords.set('feature_request', [
      'feature', 'request', 'enhancement', 'improvement', 'suggestion',
      'add', 'new', 'would like', 'could you', 'please add', 'missing'
    ]);
    
    this.categoryKeywords.set('general', [
      'question', 'help', 'how to', 'information', 'support', 'assistance'
    ]);

    // Urgency indicators
    this.urgencyIndicators = new Set([
      'urgent', 'emergency', 'critical', 'asap', 'immediately', 'now',
      'down', 'outage', 'broken', 'not working', 'production', 'live',
      'customers affected', 'revenue impact', 'security breach'
    ]);

    // Routing rules based on category and content
    this.routingRules.set('technical', {
      keywords: ['api', 'database', 'server', 'integration'],
      preferredAgents: ['technical_support', 'developer_support'],
      escalationThreshold: 'high'
    });
    
    this.routingRules.set('billing', {
      keywords: ['payment', 'invoice', 'refund'],
      preferredAgents: ['billing_support', 'account_manager'],
      escalationThreshold: 'medium'
    });
  }

  /**
   * Initialize duplicate detection system
   */
  async initializeDuplicateDetection() {
    this.duplicateDetector = {
      similarityThreshold: 0.8,
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      cache: new Map()
    };
  }

  /**
   * Classify a ticket
   */
  async classify(ticketData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Classification Engine not initialized');
      }

      logger.debug(`Classifying ticket: ${ticketData.id}`);
      
      const classification = {
        ticketId: ticketData.id,
        category: null,
        priority: null,
        routing: null,
        confidence: 0,
        reasoning: [],
        duplicates: [],
        metadata: {}
      };

      // Prepare text for analysis
      const text = this.prepareText(ticketData);
      
      // Classify category
      classification.category = await this.classifyCategory(text, ticketData);
      
      // Assess priority
      classification.priority = await this.assessPriority(text, ticketData);
      
      // Determine routing
      classification.routing = await this.determineRouting(classification.category, text, ticketData);
      
      // Check for duplicates
      classification.duplicates = await this.detectDuplicates(text, ticketData);
      
      // Calculate overall confidence
      classification.confidence = this.calculateClassificationConfidence(classification);
      
      // Extract metadata
      classification.metadata = this.extractMetadata(text, ticketData);
      
      logger.debug(`Classification complete for ticket ${ticketData.id}:`, classification);
      
      return classification;
      
    } catch (error) {
      logger.error(`Failed to classify ticket ${ticketData.id}:`, error);
      throw error;
    }
  }

  /**
   * Prepare text for analysis
   */
  prepareText(ticketData) {
    const textParts = [
      ticketData.subject || '',
      ticketData.description || '',
      ticketData.tags ? ticketData.tags.join(' ') : ''
    ];
    
    return textParts.join(' ').toLowerCase().trim();
  }

  /**
   * Classify ticket category
   */
  async classifyCategory(text, ticketData) {
    const scores = new Map();
    
    // Score each category based on keyword matches
    for (const [category, keywords] of this.categoryKeywords) {
      let score = 0;
      let matches = [];
      
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 1;
          matches.push(keyword);
        }
      }
      
      // Normalize score by keyword count
      const normalizedScore = score / keywords.length;
      scores.set(category, { score: normalizedScore, matches });
    }
    
    // Find best match
    let bestCategory = 'general';
    let bestScore = 0;
    
    for (const [category, data] of scores) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestCategory = category;
      }
    }
    
    return {
      category: bestCategory,
      confidence: bestScore,
      matches: scores.get(bestCategory).matches
    };
  }

  /**
   * Assess ticket priority
   */
  async assessPriority(text, ticketData) {
    let priority = 'medium';
    let confidence = 0.5;
    let reasoning = [];
    
    // Check for urgency indicators
    const urgencyScore = this.calculateUrgencyScore(text);
    
    // Analyze sentiment (negative sentiment might indicate higher priority)
    const sentiment = this.analyzeSentiment(text);
    
    // Check user role/tier (if available)
    const userTier = ticketData.requester?.tier || 'standard';
    
    // Priority calculation logic
    if (urgencyScore > 0.7) {
      priority = 'urgent';
      confidence = 0.9;
      reasoning.push('High urgency indicators detected');
    } else if (urgencyScore > 0.4 || sentiment < -0.5) {
      priority = 'high';
      confidence = 0.8;
      reasoning.push('Medium urgency or negative sentiment');
    } else if (userTier === 'premium' || userTier === 'enterprise') {
      priority = 'high';
      confidence = 0.7;
      reasoning.push('Premium user tier');
    } else if (urgencyScore < 0.2 && sentiment > 0) {
      priority = 'low';
      confidence = 0.8;
      reasoning.push('Low urgency and positive sentiment');
    }
    
    return {
      priority,
      confidence,
      reasoning,
      urgencyScore,
      sentiment
    };
  }

  /**
   * Calculate urgency score based on text content
   */
  calculateUrgencyScore(text) {
    let score = 0;
    let matches = 0;
    
    for (const indicator of this.urgencyIndicators) {
      if (text.includes(indicator)) {
        score += 1;
        matches += 1;
      }
    }
    
    // Normalize by total indicators
    return Math.min(score / 5, 1); // Cap at 1.0
  }

  /**
   * Analyze sentiment of the text
   */
  analyzeSentiment(text) {
    const tokens = this.tokenizer.tokenize(text);
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    return this.sentimentAnalyzer.getSentiment(stemmedTokens);
  }

  /**
   * Determine routing for the ticket
   */
  async determineRouting(categoryData, text, ticketData) {
    const category = categoryData.category;
    const routing = {
      suggestedAgents: [],
      department: null,
      escalationLevel: 'normal',
      reasoning: []
    };
    
    // Get routing rules for category
    const rules = this.routingRules.get(category);
    
    if (rules) {
      routing.suggestedAgents = rules.preferredAgents;
      routing.escalationLevel = rules.escalationThreshold;
      routing.reasoning.push(`Routed based on category: ${category}`);
    }
    
    // Check for specific routing keywords
    if (text.includes('api') || text.includes('integration')) {
      routing.department = 'technical';
      routing.reasoning.push('Technical keywords detected');
    } else if (text.includes('billing') || text.includes('payment')) {
      routing.department = 'billing';
      routing.reasoning.push('Billing keywords detected');
    }
    
    return routing;
  }

  /**
   * Detect potential duplicate tickets
   */
  async detectDuplicates(text, ticketData) {
    const duplicates = [];
    
    try {
      // Simple similarity check (in production, this would query the database)
      const textVector = this.createTextVector(text);
      
      // Check against recent tickets in cache
      for (const [cachedId, cachedData] of this.duplicateDetector.cache) {
        const similarity = this.calculateSimilarity(textVector, cachedData.vector);
        
        if (similarity > this.duplicateDetector.similarityThreshold) {
          duplicates.push({
            ticketId: cachedId,
            similarity: similarity,
            reason: 'Text similarity'
          });
        }
      }
      
      // Add current ticket to cache
      this.duplicateDetector.cache.set(ticketData.id, {
        vector: textVector,
        timestamp: Date.now(),
        text: text
      });
      
      // Clean old entries from cache
      this.cleanDuplicateCache();
      
    } catch (error) {
      logger.error('Error in duplicate detection:', error);
    }
    
    return duplicates;
  }

  /**
   * Create text vector for similarity comparison
   */
  createTextVector(text) {
    const tokens = this.tokenizer.tokenize(text);
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    // Simple bag-of-words vector (in production, use more sophisticated embeddings)
    const vector = new Map();
    for (const token of stemmedTokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    
    return vector;
  }

  /**
   * Calculate similarity between two text vectors
   */
  calculateSimilarity(vector1, vector2) {
    const keys1 = new Set(vector1.keys());
    const keys2 = new Set(vector2.keys());
    const intersection = new Set([...keys1].filter(x => keys2.has(x)));
    const union = new Set([...keys1, ...keys2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Clean old entries from duplicate detection cache
   */
  cleanDuplicateCache() {
    const now = Date.now();
    const timeWindow = this.duplicateDetector.timeWindow;
    
    for (const [id, data] of this.duplicateDetector.cache) {
      if (now - data.timestamp > timeWindow) {
        this.duplicateDetector.cache.delete(id);
      }
    }
  }

  /**
   * Calculate overall classification confidence
   */
  calculateClassificationConfidence(classification) {
    const weights = {
      category: 0.4,
      priority: 0.3,
      routing: 0.2,
      duplicates: 0.1
    };
    
    let totalConfidence = 0;
    
    totalConfidence += (classification.category?.confidence || 0) * weights.category;
    totalConfidence += (classification.priority?.confidence || 0) * weights.priority;
    totalConfidence += 0.8 * weights.routing; // Routing is usually reliable
    totalConfidence += (classification.duplicates.length === 0 ? 0.9 : 0.5) * weights.duplicates;
    
    return Math.min(totalConfidence, 1.0);
  }

  /**
   * Extract metadata from ticket content
   */
  extractMetadata(text, ticketData) {
    const metadata = {
      wordCount: text.split(' ').length,
      hasAttachments: !!(ticketData.attachments && ticketData.attachments.length > 0),
      language: 'en', // Simple default, could be enhanced with language detection
      entities: [],
      keywords: []
    };
    
    // Extract entities using compromise
    try {
      const doc = compromise(text);
      metadata.entities = doc.people().out('array').concat(doc.places().out('array'));
      metadata.keywords = doc.nouns().out('array').slice(0, 10); // Top 10 nouns
    } catch (error) {
      logger.warn('Error extracting entities:', error);
    }
    
    return metadata;
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = newConfig;
    
    // Reload classification rules if needed
    if (newConfig.classification) {
      await this.loadClassificationRules();
    }
    
    logger.info('Classification Engine configuration updated');
  }

  /**
   * Get health status
   */
  async getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      cacheSize: this.duplicateDetector?.cache.size || 0,
      categories: Array.from(this.categoryKeywords.keys()),
      urgencyIndicators: this.urgencyIndicators.size
    };
  }
}

module.exports = ClassificationEngine;
