const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Config key is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Config key cannot exceed 100 characters']
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Config value is required']
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: [true, 'Config type is required']
  },
  category: {
    type: String,
    enum: ['ai', 'security', 'performance', 'ui', 'notification', 'sla', 'general'],
    required: [true, 'Config category is required']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    enum: [String],
    required: Boolean
  },
  isPublic: {
    type: Boolean,
    default: false // Whether this config can be accessed by frontend
  },
  isEditable: {
    type: Boolean,
    default: true // Whether this config can be modified through UI
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  history: [{
    value: mongoose.Schema.Types.Mixed,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes
configSchema.index({ key: 1 });
configSchema.index({ category: 1 });
configSchema.index({ isPublic: 1 });

// Pre-save middleware to handle versioning and history
configSchema.pre('save', function(next) {
  if (this.isModified('value') && !this.isNew) {
    // Add to history
    this.history.push({
      value: this.value,
      modifiedBy: this.lastModifiedBy,
      modifiedAt: new Date()
    });
    
    // Increment version
    this.version += 1;
    
    // Keep only last 10 history entries
    if (this.history.length > 10) {
      this.history = this.history.slice(-10);
    }
  }
  next();
});

// Static method to get config value
configSchema.statics.getValue = async function(key, defaultValue = null) {
  try {
    const config = await this.findOne({ key });
    return config ? config.value : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Static method to set config value
configSchema.statics.setValue = async function(key, value, modifiedBy = null, reason = null) {
  try {
    const config = await this.findOne({ key });
    if (config) {
      config.value = value;
      config.lastModifiedBy = modifiedBy;
      if (reason) {
        config.history[config.history.length - 1].reason = reason;
      }
      return await config.save();
    } else {
      // Create new config if it doesn't exist
      return await this.create({
        key,
        value,
        type: typeof value,
        category: 'general',
        lastModifiedBy: modifiedBy
      });
    }
  } catch (error) {
    throw new Error(`Failed to set config ${key}: ${error.message}`);
  }
};

// Static method to get public configs
configSchema.statics.getPublicConfigs = function() {
  return this.find({ isPublic: true }).select('key value type category description');
};

// Static method to get configs by category
configSchema.statics.getByCategory = function(category) {
  return this.find({ category }).sort({ key: 1 });
};

// Static method to initialize default configs
configSchema.statics.initializeDefaults = async function() {
  const defaults = [
    // AI Configuration
    {
      key: 'ai.confidence_threshold',
      value: 0.8,
      type: 'number',
      category: 'ai',
      description: 'Minimum confidence score for auto-resolution',
      validation: { min: 0, max: 1 },
      isPublic: true,
      isEditable: true
    },
    {
      key: 'ai.max_retries',
      value: 3,
      type: 'number',
      category: 'ai',
      description: 'Maximum retry attempts for AI processing',
      validation: { min: 1, max: 10 },
      isEditable: true
    },
    {
      key: 'ai.processing_timeout',
      value: 30000,
      type: 'number',
      category: 'ai',
      description: 'AI processing timeout in milliseconds',
      validation: { min: 5000, max: 120000 },
      isEditable: true
    },
    {
      key: 'ai.enabled_providers',
      value: ['openai', 'deterministic'],
      type: 'array',
      category: 'ai',
      description: 'List of enabled AI providers',
      validation: { enum: ['openai', 'anthropic', 'deterministic', 'custom'] },
      isEditable: true
    },
    
    // Security Configuration
    {
      key: 'security.jwt_expires_in',
      value: '15m',
      type: 'string',
      category: 'security',
      description: 'JWT token expiration time',
      isEditable: true
    },
    {
      key: 'security.max_login_attempts',
      value: 5,
      type: 'number',
      category: 'security',
      description: 'Maximum failed login attempts before lockout',
      validation: { min: 3, max: 10 },
      isEditable: true
    },
    {
      key: 'security.lockout_duration',
      value: 900000,
      type: 'number',
      category: 'security',
      description: 'Account lockout duration in milliseconds',
      validation: { min: 300000, max: 3600000 },
      isEditable: true
    },
    
    // Performance Configuration
    {
      key: 'performance.rate_limit_window',
      value: 900000,
      type: 'number',
      category: 'performance',
      description: 'Rate limiting window in milliseconds',
      validation: { min: 60000, max: 3600000 },
      isEditable: true
    },
    {
      key: 'performance.rate_limit_max',
      value: 100,
      type: 'number',
      category: 'performance',
      description: 'Maximum requests per rate limit window',
      validation: { min: 10, max: 1000 },
      isEditable: true
    },
    
    // SLA Configuration
    {
      key: 'sla.response_time_target',
      value: 240,
      type: 'number',
      category: 'sla',
      description: 'Target response time in minutes',
      validation: { min: 15, max: 1440 },
      isPublic: true,
      isEditable: true
    },
    {
      key: 'sla.resolution_time_target',
      value: 1440,
      type: 'number',
      category: 'sla',
      description: 'Target resolution time in minutes',
      validation: { min: 60, max: 10080 },
      isPublic: true,
      isEditable: true
    },
    
    // UI Configuration
    {
      key: 'ui.tickets_per_page',
      value: 25,
      type: 'number',
      category: 'ui',
      description: 'Number of tickets to display per page',
      validation: { min: 10, max: 100 },
      isPublic: true,
      isEditable: true
    },
    {
      key: 'ui.auto_refresh_interval',
      value: 30000,
      type: 'number',
      category: 'ui',
      description: 'Auto-refresh interval in milliseconds',
      validation: { min: 10000, max: 300000 },
      isPublic: true,
      isEditable: true
    },
    
    // Notification Configuration
    {
      key: 'notification.email_enabled',
      value: true,
      type: 'boolean',
      category: 'notification',
      description: 'Enable email notifications',
      isEditable: true
    },
    {
      key: 'notification.real_time_enabled',
      value: true,
      type: 'boolean',
      category: 'notification',
      description: 'Enable real-time notifications',
      isPublic: true,
      isEditable: true
    }
  ];
  
  for (const config of defaults) {
    const existing = await this.findOne({ key: config.key });
    if (!existing) {
      await this.create(config);
    }
  }
};

// Instance method to validate value
configSchema.methods.validateValue = function(value) {
  const validation = this.validation;
  if (!validation) return true;
  
  // Type validation
  if (this.type === 'number' && typeof value !== 'number') {
    throw new Error(`Value must be a number`);
  }
  if (this.type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`Value must be a boolean`);
  }
  if (this.type === 'string' && typeof value !== 'string') {
    throw new Error(`Value must be a string`);
  }
  
  // Range validation for numbers
  if (this.type === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      throw new Error(`Value must be at least ${validation.min}`);
    }
    if (validation.max !== undefined && value > validation.max) {
      throw new Error(`Value must be at most ${validation.max}`);
    }
  }
  
  // Enum validation
  if (validation.enum && !validation.enum.includes(value)) {
    throw new Error(`Value must be one of: ${validation.enum.join(', ')}`);
  }
  
  // Pattern validation for strings
  if (this.type === 'string' && validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      throw new Error(`Value does not match required pattern`);
    }
  }
  
  return true;
};

module.exports = mongoose.model('Config', configSchema);
