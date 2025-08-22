/**
 * AI Configuration Manager
 * Manages AI service configuration with dynamic updates and validation
 */

const Config = require('../../../models/Config');
const logger = require('../../../config/logger');

class ConfigManager {
  constructor() {
    this.config = new Map();
    this.defaultConfig = {
      // AI Processing Settings
      enabled: true,
      stubMode: process.env.STUB_MODE === 'true' || process.env.NODE_ENV === 'test',
      autoResolveThreshold: 0.85,
      maxProcessingTime: 30000, // 30 seconds
      
      // Classification Settings
      classification: {
        enabled: true,
        engine: 'hybrid', // 'deterministic', 'llm', 'hybrid'
        confidenceThreshold: 0.7,
        fallbackToRules: true
      },
      
      // Knowledge Search Settings
      knowledgeSearch: {
        enabled: true,
        maxResults: 10,
        semanticSearchEnabled: true,
        keywordFallback: true,
        minSimilarityScore: 0.6
      },
      
      // Response Generation Settings
      responseGeneration: {
        enabled: true,
        engine: 'template', // 'template', 'llm', 'hybrid'
        maxLength: 2000,
        includeKnowledgeLinks: true,
        personalizeResponse: true
      },
      
      // External AI Services
      openai: {
        enabled: false,
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        rateLimitPerMinute: 60
      },
      
      // Queue Settings
      queue: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          db: process.env.REDIS_DB || 0
        },
        concurrency: {
          'ticket-processing': 5,
          'knowledge-indexing': 2,
          'response-generation': 3
        },
        retryAttempts: 3,
        retryDelay: 2000
      },
      
      // Auto-Resolution Rules
      autoResolution: {
        enabled: true,
        categories: ['password_reset', 'account_unlock', 'basic_info'],
        maxPriority: 'medium', // won't auto-resolve high/urgent tickets
        requireKnowledgeMatch: true,
        minConfidenceScore: 0.85
      },
      
      // Learning and Feedback
      learning: {
        enabled: true,
        feedbackWeight: 0.3,
        adaptThresholds: true,
        trackPerformance: true
      }
    };
    
    this.lastLoaded = null;
    this.watchers = new Set();
  }

  /**
   * Load configuration from database or use defaults
   */
  async loadConfig() {
    try {
      logger.info('Loading AI configuration...');
      
      // Try to load from database
      const dbConfig = await Config.findOne({ type: 'ai_agent' });
      
      if (dbConfig && dbConfig.settings) {
        // Merge database config with defaults
        this.config = new Map(Object.entries({
          ...this.defaultConfig,
          ...dbConfig.settings
        }));
        
        logger.info('Loaded AI configuration from database');
      } else {
        // Use default configuration
        this.config = new Map(Object.entries(this.defaultConfig));
        
        // Save default config to database
        await this.saveConfigToDatabase();
        
        logger.info('Using default AI configuration');
      }
      
      this.lastLoaded = new Date();
      this.notifyWatchers();
      
    } catch (error) {
      logger.error('Failed to load AI configuration:', error);
      
      // Fallback to default config
      this.config = new Map(Object.entries(this.defaultConfig));
      this.lastLoaded = new Date();
    }
  }

  /**
   * Save current configuration to database
   */
  async saveConfigToDatabase() {
    try {
      const configObject = Object.fromEntries(this.config);
      
      await Config.findOneAndUpdate(
        { type: 'ai_agent' },
        {
          type: 'ai_agent',
          settings: configObject,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      
      logger.info('AI configuration saved to database');
    } catch (error) {
      logger.error('Failed to save AI configuration:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(updates) {
    try {
      logger.info('Updating AI configuration:', updates);
      
      // Validate updates
      this.validateConfig(updates);
      
      // Apply updates
      for (const [key, value] of Object.entries(updates)) {
        this.config.set(key, value);
      }
      
      // Save to database
      await this.saveConfigToDatabase();
      
      // Notify watchers
      this.notifyWatchers();
      
      logger.info('AI configuration updated successfully');
    } catch (error) {
      logger.error('Failed to update AI configuration:', error);
      throw error;
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    return this.config.get(key) ?? defaultValue;
  }

  /**
   * Get entire configuration object
   */
  getConfig() {
    return Object.fromEntries(this.config);
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    this.config.set(key, value);
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(feature) {
    const featureConfig = this.get(feature);
    if (typeof featureConfig === 'object' && featureConfig.enabled !== undefined) {
      return featureConfig.enabled;
    }
    return this.get('enabled', true);
  }

  /**
   * Validate configuration updates
   */
  validateConfig(updates) {
    const errors = [];
    
    // Validate threshold values
    if (updates.autoResolveThreshold !== undefined) {
      if (typeof updates.autoResolveThreshold !== 'number' || 
          updates.autoResolveThreshold < 0 || 
          updates.autoResolveThreshold > 1) {
        errors.push('autoResolveThreshold must be a number between 0 and 1');
      }
    }
    
    // Validate OpenAI configuration
    if (updates.openai && updates.openai.enabled && !updates.openai.apiKey) {
      errors.push('OpenAI API key is required when OpenAI is enabled');
    }
    
    // Validate queue concurrency
    if (updates.queue && updates.queue.concurrency) {
      for (const [queueName, concurrency] of Object.entries(updates.queue.concurrency)) {
        if (typeof concurrency !== 'number' || concurrency < 1 || concurrency > 20) {
          errors.push(`Queue concurrency for ${queueName} must be between 1 and 20`);
        }
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Add configuration watcher
   */
  addWatcher(callback) {
    this.watchers.add(callback);
  }

  /**
   * Remove configuration watcher
   */
  removeWatcher(callback) {
    this.watchers.delete(callback);
  }

  /**
   * Notify all watchers of configuration changes
   */
  notifyWatchers() {
    const config = this.getConfig();
    this.watchers.forEach(callback => {
      try {
        callback(config);
      } catch (error) {
        logger.error('Error in configuration watcher:', error);
      }
    });
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      lastLoaded: this.lastLoaded,
      configSize: this.config.size,
      watchers: this.watchers.size,
      features: {
        aiProcessing: this.isEnabled('enabled'),
        classification: this.isEnabled('classification'),
        knowledgeSearch: this.isEnabled('knowledgeSearch'),
        responseGeneration: this.isEnabled('responseGeneration'),
        autoResolution: this.isEnabled('autoResolution'),
        learning: this.isEnabled('learning')
      }
    };
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults() {
    logger.info('Resetting AI configuration to defaults');
    
    this.config = new Map(Object.entries(this.defaultConfig));
    await this.saveConfigToDatabase();
    this.notifyWatchers();
    
    logger.info('AI configuration reset to defaults');
  }

  /**
   * Export configuration for backup
   */
  exportConfig() {
    return {
      type: 'ai_agent',
      version: '1.0',
      timestamp: new Date(),
      config: this.getConfig()
    };
  }

  /**
   * Import configuration from backup
   */
  async importConfig(configData) {
    if (configData.type !== 'ai_agent') {
      throw new Error('Invalid configuration type');
    }
    
    await this.updateConfig(configData.config);
    logger.info('AI configuration imported successfully');
  }
}

module.exports = ConfigManager;
