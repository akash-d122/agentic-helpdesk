/**
 * Knowledge Engine
 * Intelligent knowledge base search and retrieval system
 */

const natural = require('natural');
const compromise = require('compromise');
const Article = require('../../../models/Article');
const logger = require('../../../config/logger');

class KnowledgeEngine {
  constructor() {
    this.config = null;
    this.isInitialized = false;
    this.tfidf = null;
    this.articleIndex = new Map();
    this.categoryIndex = new Map();
    this.tagIndex = new Map();
    this.successMetrics = new Map();
    this.searchCache = new Map();
  }

  /**
   * Initialize the knowledge engine
   */
  async initialize(config) {
    try {
      logger.info('Initializing Knowledge Engine...');
      
      this.config = config;
      
      // Initialize NLP components
      this.initializeNLP();
      
      // Build knowledge base index
      await this.buildKnowledgeIndex();
      
      // Load success metrics
      await this.loadSuccessMetrics();
      
      this.isInitialized = true;
      logger.info('Knowledge Engine initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Knowledge Engine:', error);
      throw error;
    }
  }

  /**
   * Initialize NLP components
   */
  initializeNLP() {
    this.tfidf = new natural.TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.distance = natural.JaroWinklerDistance;
  }

  /**
   * Build knowledge base index from articles
   */
  async buildKnowledgeIndex() {
    try {
      logger.info('Building knowledge base index...');
      
      // Fetch all published articles
      const articles = await Article.find({ 
        status: 'published' 
      }).populate('author', 'firstName lastName');
      
      // Clear existing indexes
      this.articleIndex.clear();
      this.categoryIndex.clear();
      this.tagIndex.clear();
      this.tfidf = new natural.TfIdf();
      
      // Index each article
      for (const article of articles) {
        await this.indexArticle(article);
      }
      
      logger.info(`Indexed ${articles.length} articles`);
      
    } catch (error) {
      logger.error('Failed to build knowledge index:', error);
      throw error;
    }
  }

  /**
   * Index a single article
   */
  async indexArticle(article) {
    try {
      const articleData = {
        id: article._id.toString(),
        title: article.title,
        summary: article.summary || '',
        content: article.content,
        category: article.category,
        tags: article.tags || [],
        viewCount: article.viewCount || 0,
        helpfulnessRatio: article.helpfulnessRatio || 0,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        author: article.author
      };

      // Create searchable text
      const searchableText = this.createSearchableText(articleData);
      
      // Add to TF-IDF index
      this.tfidf.addDocument(searchableText);
      
      // Store article data with TF-IDF index
      articleData.tfidfIndex = this.tfidf.documents.length - 1;
      this.articleIndex.set(article._id.toString(), articleData);
      
      // Index by category
      if (!this.categoryIndex.has(article.category)) {
        this.categoryIndex.set(article.category, []);
      }
      this.categoryIndex.get(article.category).push(article._id.toString());
      
      // Index by tags
      for (const tag of article.tags || []) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, []);
        }
        this.tagIndex.get(tag).push(article._id.toString());
      }
      
    } catch (error) {
      logger.error(`Failed to index article ${article._id}:`, error);
    }
  }

  /**
   * Create searchable text from article data
   */
  createSearchableText(article) {
    const textParts = [
      article.title,
      article.summary,
      article.content.replace(/<[^>]*>/g, ''), // Remove HTML tags
      article.tags.join(' ')
    ];
    
    return textParts.join(' ').toLowerCase();
  }

  /**
   * Search knowledge base for relevant articles
   */
  async search(ticketData, classification = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('Knowledge Engine not initialized');
      }

      logger.debug(`Searching knowledge base for ticket: ${ticketData.id}`);
      
      const searchQuery = this.buildSearchQuery(ticketData, classification);
      const cacheKey = this.generateCacheKey(searchQuery);
      
      // Check cache first
      if (this.searchCache.has(cacheKey)) {
        logger.debug('Returning cached search results');
        return this.searchCache.get(cacheKey);
      }
      
      const results = [];
      
      // Semantic search using TF-IDF
      const semanticResults = await this.semanticSearch(searchQuery);
      results.push(...semanticResults);
      
      // Category-based search
      if (classification?.category) {
        const categoryResults = await this.categorySearch(classification.category.category);
        results.push(...categoryResults);
      }
      
      // Tag-based search
      const tagResults = await this.tagSearch(searchQuery.tags);
      results.push(...tagResults);
      
      // Keyword search (fallback)
      const keywordResults = await this.keywordSearch(searchQuery.text);
      results.push(...keywordResults);
      
      // Merge and rank results
      const rankedResults = this.rankAndMergeResults(results, searchQuery, classification);
      
      // Apply filters and limits
      const filteredResults = this.filterResults(rankedResults, searchQuery);
      
      // Cache results
      this.searchCache.set(cacheKey, filteredResults);
      this.cleanSearchCache();
      
      logger.debug(`Found ${filteredResults.length} relevant articles`);
      
      return filteredResults;
      
    } catch (error) {
      logger.error(`Failed to search knowledge base for ticket ${ticketData.id}:`, error);
      return [];
    }
  }

  /**
   * Build search query from ticket data
   */
  buildSearchQuery(ticketData, classification) {
    const query = {
      text: '',
      category: null,
      tags: [],
      priority: ticketData.priority || 'medium',
      userRole: ticketData.requester?.role || 'user'
    };
    
    // Build search text
    const textParts = [
      ticketData.subject || '',
      ticketData.description || ''
    ];
    query.text = textParts.join(' ').toLowerCase();
    
    // Extract category from classification
    if (classification?.category) {
      query.category = classification.category.category;
    }
    
    // Extract tags from ticket or classification
    if (ticketData.tags) {
      query.tags = ticketData.tags;
    }
    
    return query;
  }

  /**
   * Perform semantic search using TF-IDF
   */
  async semanticSearch(searchQuery) {
    const results = [];
    
    try {
      // Tokenize and stem the search query
      const tokens = this.tokenizer.tokenize(searchQuery.text);
      const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
      const queryText = stemmedTokens.join(' ');
      
      // Calculate TF-IDF scores for the query against all documents
      const scores = [];
      this.tfidf.tfidfs(queryText, (i, measure) => {
        if (measure > 0) {
          scores.push({ index: i, score: measure });
        }
      });
      
      // Sort by score and get top results
      scores.sort((a, b) => b.score - a.score);
      
      for (const result of scores.slice(0, 20)) {
        const articleId = this.getArticleIdByTfidfIndex(result.index);
        if (articleId) {
          const article = this.articleIndex.get(articleId);
          if (article) {
            results.push({
              article: article,
              score: result.score,
              source: 'semantic',
              relevance: this.calculateRelevance(article, searchQuery)
            });
          }
        }
      }
      
    } catch (error) {
      logger.error('Error in semantic search:', error);
    }
    
    return results;
  }

  /**
   * Get article ID by TF-IDF index
   */
  getArticleIdByTfidfIndex(tfidfIndex) {
    for (const [articleId, article] of this.articleIndex) {
      if (article.tfidfIndex === tfidfIndex) {
        return articleId;
      }
    }
    return null;
  }

  /**
   * Search by category
   */
  async categorySearch(category) {
    const results = [];
    
    const articleIds = this.categoryIndex.get(category) || [];
    
    for (const articleId of articleIds) {
      const article = this.articleIndex.get(articleId);
      if (article) {
        results.push({
          article: article,
          score: 0.8, // High score for category match
          source: 'category',
          relevance: 0.8
        });
      }
    }
    
    return results;
  }

  /**
   * Search by tags
   */
  async tagSearch(tags) {
    const results = [];
    const articleScores = new Map();
    
    for (const tag of tags) {
      const articleIds = this.tagIndex.get(tag) || [];
      
      for (const articleId of articleIds) {
        const currentScore = articleScores.get(articleId) || 0;
        articleScores.set(articleId, currentScore + 0.6);
      }
    }
    
    for (const [articleId, score] of articleScores) {
      const article = this.articleIndex.get(articleId);
      if (article) {
        results.push({
          article: article,
          score: Math.min(score, 1.0),
          source: 'tags',
          relevance: score
        });
      }
    }
    
    return results;
  }

  /**
   * Keyword search (fallback)
   */
  async keywordSearch(searchText) {
    const results = [];
    const keywords = this.tokenizer.tokenize(searchText.toLowerCase());
    
    for (const [articleId, article] of this.articleIndex) {
      let score = 0;
      const articleText = this.createSearchableText(article).toLowerCase();
      
      for (const keyword of keywords) {
        if (articleText.includes(keyword)) {
          score += 0.3;
        }
      }
      
      if (score > 0) {
        results.push({
          article: article,
          score: Math.min(score, 1.0),
          source: 'keyword',
          relevance: score
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate relevance score for an article
   */
  calculateRelevance(article, searchQuery) {
    let relevance = 0;
    
    // Base relevance from helpfulness ratio
    relevance += (article.helpfulnessRatio || 0) * 0.3;
    
    // Boost for recent articles
    const daysSinceUpdate = (Date.now() - new Date(article.updatedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      relevance += 0.2;
    }
    
    // Boost for popular articles
    if (article.viewCount > 100) {
      relevance += 0.2;
    }
    
    // Category match bonus
    if (searchQuery.category && article.category === searchQuery.category) {
      relevance += 0.3;
    }
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Rank and merge search results
   */
  rankAndMergeResults(results, searchQuery, classification) {
    // Remove duplicates
    const uniqueResults = new Map();
    
    for (const result of results) {
      const articleId = result.article.id;
      
      if (!uniqueResults.has(articleId)) {
        uniqueResults.set(articleId, result);
      } else {
        // Merge scores from different sources
        const existing = uniqueResults.get(articleId);
        existing.score = Math.max(existing.score, result.score);
        existing.relevance = Math.max(existing.relevance, result.relevance);
        existing.source = existing.source + '+' + result.source;
      }
    }
    
    // Convert back to array and calculate final scores
    const mergedResults = Array.from(uniqueResults.values());
    
    for (const result of mergedResults) {
      // Combine search score and relevance
      result.finalScore = (result.score * 0.7) + (result.relevance * 0.3);
      
      // Apply success metrics if available
      const successMetric = this.successMetrics.get(result.article.id);
      if (successMetric) {
        result.finalScore *= (1 + successMetric.successRate * 0.2);
      }
    }
    
    // Sort by final score
    mergedResults.sort((a, b) => b.finalScore - a.finalScore);
    
    return mergedResults;
  }

  /**
   * Filter and limit results
   */
  filterResults(results, searchQuery) {
    const maxResults = this.config?.knowledgeSearch?.maxResults || 10;
    const minScore = this.config?.knowledgeSearch?.minSimilarityScore || 0.3;
    
    return results
      .filter(result => result.finalScore >= minScore)
      .slice(0, maxResults)
      .map(result => ({
        id: result.article.id,
        title: result.article.title,
        summary: result.article.summary,
        category: result.article.category,
        tags: result.article.tags,
        score: result.finalScore,
        source: result.source,
        url: `/articles/${result.article.id}`,
        helpfulnessRatio: result.article.helpfulnessRatio,
        viewCount: result.article.viewCount
      }));
  }

  /**
   * Generate cache key for search query
   */
  generateCacheKey(searchQuery) {
    return Buffer.from(JSON.stringify(searchQuery)).toString('base64');
  }

  /**
   * Clean search cache
   */
  cleanSearchCache() {
    const maxCacheSize = 1000;
    if (this.searchCache.size > maxCacheSize) {
      const entries = Array.from(this.searchCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      
      for (const [key] of toDelete) {
        this.searchCache.delete(key);
      }
    }
  }

  /**
   * Load success metrics for articles
   */
  async loadSuccessMetrics() {
    // In a real implementation, this would load from a metrics database
    // For now, we'll use a simple placeholder
    this.successMetrics.clear();
    
    logger.info('Success metrics loaded');
  }

  /**
   * Record search success/failure for learning
   */
  async recordSearchFeedback(articleId, ticketId, wasHelpful) {
    try {
      const metric = this.successMetrics.get(articleId) || {
        totalSearches: 0,
        successfulSearches: 0,
        successRate: 0
      };
      
      metric.totalSearches += 1;
      if (wasHelpful) {
        metric.successfulSearches += 1;
      }
      metric.successRate = metric.successfulSearches / metric.totalSearches;
      
      this.successMetrics.set(articleId, metric);
      
      logger.debug(`Recorded feedback for article ${articleId}: helpful=${wasHelpful}`);
      
    } catch (error) {
      logger.error('Failed to record search feedback:', error);
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = newConfig;
    logger.info('Knowledge Engine configuration updated');
  }

  /**
   * Get health status
   */
  async getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      indexedArticles: this.articleIndex.size,
      categories: this.categoryIndex.size,
      tags: this.tagIndex.size,
      cacheSize: this.searchCache.size,
      successMetrics: this.successMetrics.size
    };
  }

  /**
   * Reindex knowledge base
   */
  async reindex() {
    logger.info('Reindexing knowledge base...');
    await this.buildKnowledgeIndex();
    this.searchCache.clear();
    logger.info('Knowledge base reindexed successfully');
  }
}

module.exports = KnowledgeEngine;
