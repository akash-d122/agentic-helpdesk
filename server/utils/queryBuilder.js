const mongoose = require('mongoose');

/**
 * Advanced query builder for MongoDB with pagination, filtering, and sorting
 */
class QueryBuilder {
  constructor(model, query = {}) {
    this.model = model;
    this.query = query;
    this.mongoQuery = model.find();
    this.totalQuery = model.countDocuments();
    this.aggregationPipeline = [];
    this.isAggregation = false;
  }

  /**
   * Apply filters to the query
   * @param {Object} filters - Filter object
   * @returns {QueryBuilder} - Chainable instance
   */
  filter(filters = {}) {
    const queryObj = { ...filters };
    
    // Remove pagination and sorting fields
    const excludedFields = ['page', 'limit', 'sort', 'fields', 'search'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Handle advanced filtering operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne)\b/g, match => `$${match}`);
    const parsedQuery = JSON.parse(queryStr);
    
    // Apply filters
    this.mongoQuery = this.mongoQuery.find(parsedQuery);
    this.totalQuery = this.totalQuery.find(parsedQuery);
    
    return this;
  }

  /**
   * Apply search functionality
   * @param {string} searchTerm - Search term
   * @param {string[]} searchFields - Fields to search in
   * @returns {QueryBuilder} - Chainable instance
   */
  search(searchTerm, searchFields = []) {
    if (searchTerm && searchFields.length > 0) {
      const searchRegex = new RegExp(searchTerm, 'i');
      const searchQuery = {
        $or: searchFields.map(field => ({
          [field]: searchRegex
        }))
      };
      
      this.mongoQuery = this.mongoQuery.find(searchQuery);
      this.totalQuery = this.totalQuery.find(searchQuery);
    }
    
    return this;
  }

  /**
   * Apply text search using MongoDB text indexes
   * @param {string} searchTerm - Search term
   * @returns {QueryBuilder} - Chainable instance
   */
  textSearch(searchTerm) {
    if (searchTerm) {
      const textQuery = { $text: { $search: searchTerm } };
      this.mongoQuery = this.mongoQuery.find(textQuery);
      this.totalQuery = this.totalQuery.find(textQuery);
      
      // Add text score for sorting
      this.mongoQuery = this.mongoQuery.select({ score: { $meta: 'textScore' } });
    }
    
    return this;
  }

  /**
   * Apply sorting
   * @param {string} sortBy - Sort string (e.g., '-createdAt,name')
   * @returns {QueryBuilder} - Chainable instance
   */
  sort(sortBy) {
    if (sortBy) {
      const sortObj = {};
      const sortFields = sortBy.split(',');
      
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
      
      this.mongoQuery = this.mongoQuery.sort(sortObj);
    } else {
      // Default sort by creation date
      this.mongoQuery = this.mongoQuery.sort({ createdAt: -1 });
    }
    
    return this;
  }

  /**
   * Select specific fields
   * @param {string} fields - Comma-separated field names
   * @returns {QueryBuilder} - Chainable instance
   */
  selectFields(fields) {
    if (fields) {
      const selectFields = fields.split(',').join(' ');
      this.mongoQuery = this.mongoQuery.select(selectFields);
    }
    
    return this;
  }

  /**
   * Apply pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {QueryBuilder} - Chainable instance
   */
  paginate(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    this.mongoQuery = this.mongoQuery.skip(skip).limit(limit);
    this.pagination = { page, limit, skip };
    
    return this;
  }

  /**
   * Populate related documents
   * @param {string|Object} populateOptions - Populate options
   * @returns {QueryBuilder} - Chainable instance
   */
  populate(populateOptions) {
    if (populateOptions) {
      this.mongoQuery = this.mongoQuery.populate(populateOptions);
    }
    
    return this;
  }

  /**
   * Apply date range filtering
   * @param {string} field - Date field name
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {QueryBuilder} - Chainable instance
   */
  dateRange(field, startDate, endDate) {
    if (startDate || endDate) {
      const dateQuery = {};
      
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      
      if (endDate) {
        dateQuery.$lte = new Date(endDate);
      }
      
      this.mongoQuery = this.mongoQuery.find({ [field]: dateQuery });
      this.totalQuery = this.totalQuery.find({ [field]: dateQuery });
    }
    
    return this;
  }

  /**
   * Apply aggregation pipeline
   * @param {Array} pipeline - Aggregation pipeline stages
   * @returns {QueryBuilder} - Chainable instance
   */
  aggregate(pipeline) {
    this.aggregationPipeline = pipeline;
    this.isAggregation = true;
    return this;
  }

  /**
   * Execute the query and return results with metadata
   * @returns {Object} - Query results with pagination info
   */
  async execute() {
    try {
      let results;
      let total;
      
      if (this.isAggregation) {
        // Execute aggregation pipeline
        results = await this.model.aggregate(this.aggregationPipeline);
        total = results.length;
      } else {
        // Execute regular query
        [results, total] = await Promise.all([
          this.mongoQuery.exec(),
          this.totalQuery.exec()
        ]);
      }
      
      // Calculate pagination metadata
      const pagination = this.pagination || { page: 1, limit: results.length };
      const totalPages = Math.ceil(total / pagination.limit);
      const hasNextPage = pagination.page < totalPages;
      const hasPrevPage = pagination.page > 1;
      
      return {
        data: results,
        pagination: {
          currentPage: pagination.page,
          totalPages,
          totalItems: total,
          itemsPerPage: pagination.limit,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pagination.page + 1 : null,
          prevPage: hasPrevPage ? pagination.page - 1 : null
        }
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Get only the count of matching documents
   * @returns {number} - Count of documents
   */
  async count() {
    try {
      return await this.totalQuery.exec();
    } catch (error) {
      throw new Error(`Count query failed: ${error.message}`);
    }
  }

  /**
   * Check if any documents match the query
   * @returns {boolean} - Whether any documents exist
   */
  async exists() {
    try {
      const count = await this.count();
      return count > 0;
    } catch (error) {
      throw new Error(`Exists query failed: ${error.message}`);
    }
  }
}

/**
 * Create a new QueryBuilder instance
 * @param {mongoose.Model} model - Mongoose model
 * @param {Object} query - Query parameters
 * @returns {QueryBuilder} - QueryBuilder instance
 */
const createQueryBuilder = (model, query = {}) => {
  return new QueryBuilder(model, query);
};

module.exports = {
  QueryBuilder,
  createQueryBuilder
};
