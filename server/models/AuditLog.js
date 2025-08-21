const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  traceId: {
    type: String,
    required: [true, 'Trace ID is required'],
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      // Authentication actions
      'user.login', 'user.logout', 'user.register', 'user.password_reset',
      // User management actions
      'user.create', 'user.update', 'user.delete', 'user.role_change',
      // Ticket actions
      'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.resolve', 'ticket.close', 'ticket.reopen',
      'ticket.message_add', 'ticket.status_change', 'ticket.priority_change',
      // Knowledge base actions
      'article.create', 'article.update', 'article.delete', 'article.publish', 'article.archive',
      'article.view', 'article.feedback',
      // AI agent actions
      'ai.process_ticket', 'ai.generate_response', 'ai.classify_ticket', 'ai.suggest_resolution',
      'ai.auto_resolve', 'ai.escalate',
      // Agent review actions
      'agent.review_suggestion', 'agent.approve_response', 'agent.reject_response', 'agent.modify_response',
      // System actions
      'system.startup', 'system.shutdown', 'system.config_change', 'system.backup',
      // Security actions
      'security.failed_login', 'security.suspicious_activity', 'security.rate_limit_exceeded'
    ]
  },
  actor: {
    type: {
      type: String,
      enum: ['user', 'system', 'ai_agent'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    role: String,
    ipAddress: String,
    userAgent: String
  },
  target: {
    type: {
      type: String,
      enum: ['user', 'ticket', 'article', 'suggestion', 'config', 'system'],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    identifier: String, // Human-readable identifier (e.g., ticket number, email)
    previousState: mongoose.Schema.Types.Mixed,
    newState: mongoose.Schema.Types.Mixed
  },
  context: {
    requestId: String,
    sessionId: String,
    endpoint: String,
    method: String,
    statusCode: Number,
    responseTime: Number, // in milliseconds
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      region: String,
      city: String
    }
  },
  details: {
    description: String,
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    metadata: mongoose.Schema.Types.Mixed,
    error: {
      message: String,
      code: String,
      stack: String
    },
    aiMetadata: {
      provider: String,
      model: String,
      confidence: Number,
      processingTime: Number,
      tokensUsed: Number
    }
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: false, // We use custom timestamp field
  capped: { size: 100000000, max: 1000000 } // 100MB cap, max 1M documents
});

// Compound indexes for efficient querying
auditLogSchema.index({ traceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'actor.id': 1, timestamp: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ tags: 1, timestamp: -1 });

// Pre-save middleware to set expiration
auditLogSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set different retention periods based on severity
    const retentionDays = {
      'info': 90,      // 3 months
      'warning': 180,  // 6 months
      'error': 365,    // 1 year
      'critical': 1095 // 3 years
    };
    
    const days = retentionDays[this.severity] || 90;
    this.expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }
  next();
});

// Static method to create audit log entry
auditLogSchema.statics.createEntry = function(data) {
  const entry = new this({
    traceId: data.traceId,
    action: data.action,
    actor: data.actor,
    target: data.target,
    context: data.context,
    details: data.details,
    severity: data.severity || 'info',
    tags: data.tags || []
  });
  
  return entry.save();
};

// Static method to find by trace ID
auditLogSchema.statics.findByTraceId = function(traceId) {
  return this.find({ traceId }).sort({ timestamp: 1 });
};

// Static method to find by target
auditLogSchema.statics.findByTarget = function(targetType, targetId) {
  return this.find({
    'target.type': targetType,
    'target.id': targetId
  }).sort({ timestamp: -1 });
};

// Static method to find by actor
auditLogSchema.statics.findByActor = function(actorId, dateRange = {}) {
  const filter = { 'actor.id': actorId };
  
  if (dateRange.start || dateRange.end) {
    filter.timestamp = {};
    if (dateRange.start) filter.timestamp.$gte = dateRange.start;
    if (dateRange.end) filter.timestamp.$lte = dateRange.end;
  }
  
  return this.find(filter).sort({ timestamp: -1 });
};

// Static method for security monitoring
auditLogSchema.statics.findSecurityEvents = function(timeWindow = 24) {
  const since = new Date(Date.now() - (timeWindow * 60 * 60 * 1000));
  
  return this.find({
    timestamp: { $gte: since },
    $or: [
      { action: { $in: ['security.failed_login', 'security.suspicious_activity', 'security.rate_limit_exceeded'] } },
      { severity: { $in: ['error', 'critical'] } },
      { tags: 'security' }
    ]
  }).sort({ timestamp: -1 });
};

// Static method for analytics
auditLogSchema.statics.getActionStats = function(dateRange = {}) {
  const matchStage = {};
  if (dateRange.start || dateRange.end) {
    matchStage.timestamp = {};
    if (dateRange.start) matchStage.timestamp.$gte = dateRange.start;
    if (dateRange.end) matchStage.timestamp.$lte = dateRange.end;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$context.responseTime' },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'error'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get user activity summary
auditLogSchema.statics.getUserActivitySummary = function(userId, days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        'actor.id': userId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          action: '$action'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalActions: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ]);
};

// Instance method to add related log entry
auditLogSchema.methods.addRelatedEntry = function(action, details = {}) {
  return this.constructor.createEntry({
    traceId: this.traceId,
    action,
    actor: this.actor,
    target: this.target,
    context: this.context,
    details: {
      ...details,
      relatedTo: this._id
    },
    severity: details.severity || 'info'
  });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
