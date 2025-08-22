const mongoose = require('mongoose');

const knowledgeArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['technical', 'billing', 'account', 'general', 'getting-started', 'troubleshooting', 'api', 'best-practices', 'faq']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  unhelpfulCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: {
    type: Date
  },
  metadata: {
    seoTitle: String,
    seoDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better search performance
knowledgeArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });
knowledgeArticleSchema.index({ category: 1, isPublished: 1 });
knowledgeArticleSchema.index({ isPublished: 1, viewCount: -1 });
knowledgeArticleSchema.index({ author: 1 });
knowledgeArticleSchema.index({ createdAt: -1 });

// Virtual for helpfulness ratio
knowledgeArticleSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulCount + this.unhelpfulCount;
  return total > 0 ? this.helpfulCount / total : 0;
});

// Pre-save middleware to generate excerpt if not provided
knowledgeArticleSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    // Strip HTML tags and create excerpt
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
  }
  next();
});

// Static method to search articles
knowledgeArticleSchema.statics.search = function(query, options = {}) {
  const {
    category,
    isPublished = true,
    limit = 10,
    skip = 0,
    sortBy = 'relevance'
  } = options;

  const searchQuery = {
    isPublished
  };

  if (category) {
    searchQuery.category = category;
  }

  if (query) {
    searchQuery.$text = { $search: query };
  }

  let sort = {};
  switch (sortBy) {
    case 'relevance':
      sort = query ? { score: { $meta: 'textScore' } } : { viewCount: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'popular':
      sort = { viewCount: -1 };
      break;
    case 'helpful':
      sort = { helpfulCount: -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  return this.find(searchQuery)
    .populate('author', 'firstName lastName email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Instance method to increment view count
knowledgeArticleSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

// Instance method to mark as helpful
knowledgeArticleSchema.methods.markHelpful = function(isHelpful = true) {
  if (isHelpful) {
    this.helpfulCount += 1;
  } else {
    this.unhelpfulCount += 1;
  }
  return this.save();
};

module.exports = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
