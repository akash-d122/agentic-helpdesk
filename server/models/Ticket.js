const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorType: {
    type: String,
    enum: ['user', 'agent', 'system'],
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [10000, 'Message cannot exceed 10,000 characters']
  },
  isInternal: {
    type: Boolean,
    default: false // Internal notes only visible to agents
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    aiGenerated: {
      type: Boolean,
      default: false
    },
    confidence: Number,
    citedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }],
    processingTime: Number // in milliseconds
  }
}, {
  timestamps: true
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [10000, 'Description cannot exceed 10,000 characters']
  },
  category: {
    type: String,
    enum: ['billing', 'technical', 'shipping', 'account', 'general', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'triaged', 'waiting_human', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'open',
    required: true
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  conversation: [conversationSchema],
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiProcessing: {
    lastProcessedAt: Date,
    processingAttempts: {
      type: Number,
      default: 0
    },
    autoResolved: {
      type: Boolean,
      default: false
    },
    confidence: Number,
    suggestedCategory: String,
    suggestedResponse: String,
    citedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }]
  },
  sla: {
    responseTime: {
      target: Number, // in minutes
      actual: Number
    },
    resolutionTime: {
      target: Number, // in minutes
      actual: Number
    },
    breached: {
      type: Boolean,
      default: false
    }
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    submittedAt: Date
  },
  resolvedAt: Date,
  closedAt: Date,
  reopenCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ requester: 1, status: 1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ 'aiProcessing.autoResolved': 1 });

// Virtual for age in hours
ticketSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for response time calculation
ticketSchema.virtual('responseTimeActual').get(function() {
  if (this.conversation.length > 1) {
    const firstResponse = this.conversation.find(msg => 
      msg.authorType === 'agent' || msg.authorType === 'system'
    );
    if (firstResponse) {
      return Math.floor((firstResponse.createdAt - this.createdAt) / (1000 * 60));
    }
  }
  return null;
});

// Pre-save middleware to generate ticket number
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TK-${String(count + 1).padStart(6, '0')}`;
  }
  
  // Set timestamps for status changes
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    if (this.status === 'closed' && !this.closedAt) {
      this.closedAt = new Date();
    }
  }
  
  // Set assignment timestamp
  if (this.isModified('assignedTo') && this.assignedTo) {
    this.assignedAt = new Date();
  }
  
  next();
});

// Static method to find tickets by status
ticketSchema.statics.findByStatus = function(status, assignedTo = null) {
  const filter = { status };
  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }
  return this.find(filter).sort({ priority: -1, createdAt: 1 });
};

// Static method to find overdue tickets
ticketSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({
    status: { $in: ['open', 'triaged', 'in_progress'] },
    $or: [
      {
        'sla.responseTime.target': { $exists: true },
        'sla.responseTime.actual': { $exists: false },
        createdAt: { $lt: new Date(now - this.sla.responseTime.target * 60 * 1000) }
      },
      {
        'sla.resolutionTime.target': { $exists: true },
        resolvedAt: { $exists: false },
        createdAt: { $lt: new Date(now - this.sla.resolutionTime.target * 60 * 1000) }
      }
    ]
  });
};

// Instance method to add conversation message
ticketSchema.methods.addMessage = function(authorId, authorType, message, isInternal = false, metadata = {}) {
  this.conversation.push({
    author: authorId,
    authorType,
    message,
    isInternal,
    metadata
  });
  return this.save();
};

// Instance method to assign ticket
ticketSchema.methods.assignTo = function(agentId) {
  this.assignedTo = agentId;
  this.assignedAt = new Date();
  if (this.status === 'open') {
    this.status = 'triaged';
  }
  return this.save();
};

// Instance method to update AI processing
ticketSchema.methods.updateAIProcessing = function(data) {
  this.aiProcessing = {
    ...this.aiProcessing,
    ...data,
    lastProcessedAt: new Date(),
    processingAttempts: (this.aiProcessing.processingAttempts || 0) + 1
  };
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);
