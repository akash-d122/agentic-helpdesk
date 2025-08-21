const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Article content is required'],
    maxlength: [50000, 'Content cannot exceed 50,000 characters']
  },
  summary: {
    type: String,
    maxlength: [500, 'Summary cannot exceed 500 characters'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['billing', 'technical', 'shipping', 'account', 'general', 'other'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  publishedAt: {
    type: Date
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },
  searchKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
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
  metadata: {
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    estimatedReadTime: {
      type: Number, // in minutes
      min: 1
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 5
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and search
articleSchema.index({ title: 'text', content: 'text', summary: 'text', tags: 'text' });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ author: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ 'metadata.difficulty': 1 });

// Virtual for helpfulness ratio
articleSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  return total > 0 ? (this.helpfulCount / total) : 0;
});

// Virtual for estimated read time calculation
articleSchema.virtual('calculatedReadTime').get(function() {
  if (this.metadata.estimatedReadTime) {
    return this.metadata.estimatedReadTime;
  }
  // Estimate based on content length (average 200 words per minute)
  const wordCount = this.content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
});

// Pre-save middleware
articleSchema.pre('save', function(next) {
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Generate search keywords from title and content
  if (this.isModified('title') || this.isModified('content') || this.isModified('tags')) {
    const titleWords = this.title.toLowerCase().split(/\s+/);
    const contentWords = this.content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const tagWords = this.tags || [];
    
    // Combine and deduplicate keywords
    this.searchKeywords = [...new Set([...titleWords, ...contentWords.slice(0, 50), ...tagWords])];
  }
  
  next();
});

// Static method to find published articles
articleSchema.statics.findPublished = function(filter = {}) {
  return this.find({ ...filter, status: 'published' }).sort({ publishedAt: -1 });
};

// Static method for search
articleSchema.statics.search = function(query, category = null) {
  const searchFilter = {
    status: 'published',
    $text: { $search: query }
  };
  
  if (category) {
    searchFilter.category = category;
  }
  
  return this.find(searchFilter, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Instance method to increment view count
articleSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to record feedback
articleSchema.methods.recordFeedback = function(isHelpful) {
  if (isHelpful) {
    this.helpfulCount += 1;
  } else {
    this.notHelpfulCount += 1;
  }
  return this.save();
};

module.exports = mongoose.model('Article', articleSchema);
