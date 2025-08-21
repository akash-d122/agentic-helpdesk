const mongoose = require('mongoose');

const agentSuggestionSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket reference is required']
  },
  traceId: {
    type: String,
    required: [true, 'Trace ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['classification', 'response', 'resolution', 'escalation'],
    required: [true, 'Suggestion type is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'modified', 'auto_applied'],
    default: 'pending',
    required: true
  },
  aiProvider: {
    type: String,
    enum: ['openai', 'anthropic', 'deterministic', 'custom'],
    required: [true, 'AI provider is required']
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence score is required'],
    min: 0,
    max: 1
  },
  originalData: {
    // Store the original ticket data that was processed
    subject: String,
    description: String,
    category: String,
    attachments: [String]
  },
  suggestions: {
    category: {
      suggested: {
        type: String,
        enum: ['billing', 'technical', 'shipping', 'account', 'general', 'other']
      },
      confidence: Number,
      reasoning: String
    },
    priority: {
      suggested: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent']
      },
      confidence: Number,
      reasoning: String
    },
    response: {
      suggested: String,
      confidence: Number,
      tone: {
        type: String,
        enum: ['formal', 'friendly', 'empathetic', 'technical']
      }
    },
    resolution: {
      canAutoResolve: Boolean,
      confidence: Number,
      reasoning: String,
      requiredActions: [String]
    },
    escalation: {
      shouldEscalate: Boolean,
      reason: String,
      suggestedAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }
  },
  citedArticles: [{
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    },
    relevanceScore: {
      type: Number,
      min: 0,
      max: 1
    },
    excerpts: [String], // Relevant excerpts from the article
    usedInResponse: Boolean
  }],
  processingMetadata: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    processingTimeMs: {
      type: Number,
      required: true
    },
    tokensUsed: {
      input: Number,
      output: Number,
      total: Number
    },
    modelVersion: String,
    temperature: Number,
    maxTokens: Number
  },
  humanReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'modified']
    },
    modifications: {
      category: String,
      priority: String,
      response: String,
      reasoning: String
    },
    feedback: String,
    timeToReviewMs: Number
  },
  applicationResult: {
    appliedAt: Date,
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedActions: [String],
    success: Boolean,
    errors: [String]
  },
  qualityMetrics: {
    customerSatisfaction: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      submittedAt: Date
    },
    accuracyScore: Number, // Post-review accuracy assessment
    helpfulness: Number,   // How helpful the suggestion was
    efficiency: Number     // How much time it saved
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
agentSuggestionSchema.index({ ticket: 1, createdAt: -1 });
agentSuggestionSchema.index({ traceId: 1 });
agentSuggestionSchema.index({ status: 1, confidence: -1 });
agentSuggestionSchema.index({ aiProvider: 1, type: 1 });
agentSuggestionSchema.index({ 'humanReview.reviewedBy': 1 });
agentSuggestionSchema.index({ 'suggestions.resolution.canAutoResolve': 1, confidence: -1 });

// Virtual for overall confidence score
agentSuggestionSchema.virtual('overallConfidence').get(function() {
  const suggestions = this.suggestions;
  const scores = [];
  
  if (suggestions.category?.confidence) scores.push(suggestions.category.confidence);
  if (suggestions.priority?.confidence) scores.push(suggestions.priority.confidence);
  if (suggestions.response?.confidence) scores.push(suggestions.response.confidence);
  if (suggestions.resolution?.confidence) scores.push(suggestions.resolution.confidence);
  
  return scores.length > 0 ? scores.reduce((a, b) => a + b) / scores.length : this.confidence;
});

// Virtual for processing efficiency
agentSuggestionSchema.virtual('processingEfficiency').get(function() {
  if (!this.processingMetadata?.processingTimeMs) return null;
  
  // Calculate efficiency based on processing time and confidence
  const timeScore = Math.max(0, 1 - (this.processingMetadata.processingTimeMs / 30000)); // 30s baseline
  const confidenceScore = this.confidence;
  
  return (timeScore + confidenceScore) / 2;
});

// Pre-save middleware
agentSuggestionSchema.pre('save', function(next) {
  // Calculate processing time if not set
  if (this.processingMetadata?.startTime && this.processingMetadata?.endTime && !this.processingMetadata.processingTimeMs) {
    this.processingMetadata.processingTimeMs = 
      this.processingMetadata.endTime - this.processingMetadata.startTime;
  }
  
  // Calculate review time if human review is completed
  if (this.humanReview?.reviewedAt && this.createdAt && !this.humanReview.timeToReviewMs) {
    this.humanReview.timeToReviewMs = this.humanReview.reviewedAt - this.createdAt;
  }
  
  next();
});

// Static method to find pending suggestions
agentSuggestionSchema.statics.findPending = function(assignedTo = null) {
  const filter = { status: 'pending' };
  const query = this.find(filter)
    .populate('ticket')
    .populate('citedArticles.article')
    .sort({ confidence: -1, createdAt: 1 });
  
  if (assignedTo) {
    query.populate({
      path: 'ticket',
      match: { assignedTo }
    });
  }
  
  return query;
};

// Static method to find auto-resolvable suggestions
agentSuggestionSchema.statics.findAutoResolvable = function(confidenceThreshold = 0.8) {
  return this.find({
    status: 'pending',
    confidence: { $gte: confidenceThreshold },
    'suggestions.resolution.canAutoResolve': true
  }).populate('ticket');
};

// Static method for analytics
agentSuggestionSchema.statics.getAnalytics = function(dateRange = {}) {
  const matchStage = {};
  if (dateRange.start || dateRange.end) {
    matchStage.createdAt = {};
    if (dateRange.start) matchStage.createdAt.$gte = dateRange.start;
    if (dateRange.end) matchStage.createdAt.$lte = dateRange.end;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSuggestions: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgProcessingTime: { $avg: '$processingMetadata.processingTimeMs' },
        autoResolvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'auto_applied'] }, 1, 0] }
        },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Instance method to approve suggestion
agentSuggestionSchema.methods.approve = function(reviewerId, modifications = {}) {
  this.status = Object.keys(modifications).length > 0 ? 'modified' : 'approved';
  this.humanReview = {
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    decision: this.status,
    modifications
  };
  return this.save();
};

// Instance method to reject suggestion
agentSuggestionSchema.methods.reject = function(reviewerId, feedback) {
  this.status = 'rejected';
  this.humanReview = {
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    decision: 'rejected',
    feedback
  };
  return this.save();
};

// Instance method to apply suggestion
agentSuggestionSchema.methods.apply = function(appliedBy, actions = []) {
  this.applicationResult = {
    appliedAt: new Date(),
    appliedBy,
    appliedActions: actions,
    success: true
  };
  return this.save();
};

module.exports = mongoose.model('AgentSuggestion', agentSuggestionSchema);
