const winston = require('winston');
const { ValidationError } = require('express-validator');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler for different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationError(message, errors);
};

const handleJWTError = () =>
  new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = () =>
  new AuthenticationError('Your token has expired! Please log in again.');

// Send error response in development
const sendErrorDev = (err, req, res) => {
  winston.error('Development Error', {
    error: err,
    traceId: req.traceId,
    stack: err.stack
  });

  res.status(err.statusCode || 500).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack,
    traceId: req.traceId
  });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      status: 'error',
      message: err.message,
      traceId: req.traceId
    };
    
    // Add validation errors if present
    if (err.errors && err.errors.length > 0) {
      response.errors = err.errors;
    }
    
    res.status(err.statusCode).json(response);
  } else {
    // Programming or other unknown error: don't leak error details
    winston.error('Unknown Error', {
      error: err,
      traceId: req.traceId,
      stack: err.stack
    });

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      traceId: req.traceId
    });
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Validation error handler for express-validator
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    const err = new ValidationError('Validation failed', errorMessages);
    return next(err);
  }
  
  next();
};

// Mongoose connection error handler
const handleMongooseErrors = () => {
  const mongoose = require('mongoose');
  
  mongoose.connection.on('error', (err) => {
    winston.error('MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    winston.warn('MongoDB disconnected');
  });
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
  winston.error('Unhandled Promise Rejection', {
    error: err.message,
    stack: err.stack,
    promise
  });
  
  // Close server gracefully
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  winston.error('Uncaught Exception', {
    error: err.message,
    stack: err.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  handleValidationErrors,
  handleMongooseErrors
};
