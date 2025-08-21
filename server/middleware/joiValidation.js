const Joi = require('joi');
const { ValidationError } = require('./errorHandler');
const winston = require('winston');

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi schema object
 * @param {string} source - Source of data to validate ('body', 'query', 'params', 'files')
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateWithJoi = (schema, source = 'body', options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    allowUnknown: false, // Don't allow unknown fields
    stripUnknown: true, // Remove unknown fields
    convert: true, // Convert values to correct types
    ...options
  };

  return (req, res, next) => {
    try {
      // Get data to validate based on source
      let dataToValidate;
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'files':
          dataToValidate = req.files || req.file;
          break;
        case 'headers':
          dataToValidate = req.headers;
          break;
        default:
          dataToValidate = req[source];
      }

      // Validate data
      const { error, value } = schema.validate(dataToValidate, defaultOptions);

      if (error) {
        // Format validation errors
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));

        winston.warn('Joi validation failed', {
          source,
          errors: validationErrors,
          traceId: req.traceId,
          endpoint: req.originalUrl
        });

        throw new ValidationError('Validation failed', validationErrors);
      }

      // Replace original data with validated and sanitized data
      if (source === 'body') {
        req.body = value;
      } else if (source === 'query') {
        req.query = value;
      } else if (source === 'params') {
        req.params = value;
      } else {
        req[source] = value;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate multiple sources with different schemas
 * @param {Object} schemas - Object with source as key and schema as value
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateMultiple = (schemas, options = {}) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each source
    for (const [source, schema] of Object.entries(schemas)) {
      try {
        let dataToValidate;
        switch (source) {
          case 'body':
            dataToValidate = req.body;
            break;
          case 'query':
            dataToValidate = req.query;
            break;
          case 'params':
            dataToValidate = req.params;
            break;
          case 'files':
            dataToValidate = req.files || req.file;
            break;
          default:
            dataToValidate = req[source];
        }

        const { error, value } = schema.validate(dataToValidate, {
          abortEarly: false,
          allowUnknown: false,
          stripUnknown: true,
          convert: true,
          ...options
        });

        if (error) {
          const sourceErrors = error.details.map(detail => ({
            source,
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          }));
          errors.push(...sourceErrors);
        } else {
          // Update request with validated data
          if (source === 'body') {
            req.body = value;
          } else if (source === 'query') {
            req.query = value;
          } else if (source === 'params') {
            req.params = value;
          } else {
            req[source] = value;
          }
        }
      } catch (err) {
        errors.push({
          source,
          field: 'general',
          message: err.message,
          type: 'validation.error'
        });
      }
    }

    if (errors.length > 0) {
      winston.warn('Multiple validation failed', {
        errors,
        traceId: req.traceId,
        endpoint: req.originalUrl
      });

      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
};

/**
 * Conditional validation based on request properties
 * @param {Function} condition - Function that returns boolean based on req
 * @param {Object} schema - Joi schema to apply if condition is true
 * @param {string} source - Source of data to validate
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateConditional = (condition, schema, source = 'body', options = {}) => {
  return (req, res, next) => {
    try {
      // Check condition
      if (!condition(req)) {
        return next();
      }

      // Apply validation if condition is met
      const validator = validateWithJoi(schema, source, options);
      return validator(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Sanitize and validate file uploads
 * @param {Object} fileSchema - Joi schema for file validation
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
const validateFiles = (fileSchema, options = {}) => {
  const {
    maxFiles = 10,
    allowedMimeTypes = [],
    maxFileSize = 25 * 1024 * 1024, // 25MB default
    sanitizeFilename = true
  } = options;

  return (req, res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);

      if (files.length === 0) {
        return next();
      }

      if (files.length > maxFiles) {
        throw new ValidationError(`Too many files. Maximum ${maxFiles} files allowed.`);
      }

      const validationErrors = [];

      files.forEach((file, index) => {
        // Validate file with Joi schema
        const { error } = fileSchema.validate(file, { abortEarly: false });
        
        if (error) {
          const fileErrors = error.details.map(detail => ({
            field: `file[${index}].${detail.path.join('.')}`,
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          }));
          validationErrors.push(...fileErrors);
        }

        // Additional file validations
        if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
          validationErrors.push({
            field: `file[${index}].mimetype`,
            message: `File type ${file.mimetype} is not allowed`,
            value: file.mimetype,
            type: 'file.mimetype.invalid'
          });
        }

        if (file.size > maxFileSize) {
          validationErrors.push({
            field: `file[${index}].size`,
            message: `File size ${file.size} exceeds maximum allowed size of ${maxFileSize} bytes`,
            value: file.size,
            type: 'file.size.too_large'
          });
        }

        // Sanitize filename
        if (sanitizeFilename && file.originalname) {
          file.originalname = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .substring(0, 255); // Limit length
        }
      });

      if (validationErrors.length > 0) {
        winston.warn('File validation failed', {
          errors: validationErrors,
          fileCount: files.length,
          traceId: req.traceId,
          endpoint: req.originalUrl
        });

        throw new ValidationError('File validation failed', validationErrors);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Create a validation middleware that combines query parameters with filters
 * @param {Object} baseSchema - Base query schema (pagination, etc.)
 * @param {Object} filterSchema - Filter-specific schema
 * @returns {Function} - Express middleware function
 */
const validateQuery = (baseSchema, filterSchema = null) => {
  let combinedSchema = baseSchema;
  
  if (filterSchema) {
    combinedSchema = baseSchema.concat(filterSchema);
  }

  return validateWithJoi(combinedSchema, 'query', {
    allowUnknown: true, // Allow additional query parameters
    stripUnknown: false // Keep unknown parameters for flexibility
  });
};

/**
 * Validate request body with automatic XSS protection
 * @param {Object} schema - Joi schema
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateBodyWithXSS = (schema, options = {}) => {
  return (req, res, next) => {
    // Apply XSS protection to string fields
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Apply Joi validation
    const validator = validateWithJoi(schema, 'body', options);
    return validator(req, res, next);
  };
};

/**
 * Recursively sanitize object to prevent XSS
 * @param {*} obj - Object to sanitize
 * @returns {*} - Sanitized object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    // Basic XSS protection - remove script tags and javascript: protocols
    return obj
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  } else if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

module.exports = {
  validateWithJoi,
  validateMultiple,
  validateConditional,
  validateFiles,
  validateQuery,
  validateBodyWithXSS,
  sanitizeObject
};
