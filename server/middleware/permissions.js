const { hasPermission, hasAnyPermission, hasAllPermissions } = require('../utils/permissions');
const { AuthorizationError } = require('./errorHandler');

/**
 * Middleware to check if user has required permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware function
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!hasPermission(req.user, permission)) {
        throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 * @returns {Function} Express middleware function
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!hasAnyPermission(req.user, permissions)) {
        throw new AuthorizationError(`Insufficient permissions. Required any of: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has all required permissions
 * @param {string[]} permissions - Array of permissions (user needs all)
 * @returns {Function} Express middleware function
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!hasAllPermissions(req.user, permissions)) {
        throw new AuthorizationError(`Insufficient permissions. Required all of: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!requiredRoles.includes(req.user.role)) {
        throw new AuthorizationError(`Insufficient role. Required: ${requiredRoles.join(' or ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access own resource or has admin permissions
 * @param {string} userIdField - Field name containing user ID (default: 'userId')
 * @returns {Function} Express middleware function
 */
const requireOwnershipOrAdmin = (userIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
      
      if (resourceUserId && resourceUserId.toString() === req.user.userId.toString()) {
        return next();
      }

      throw new AuthorizationError('Access denied. You can only access your own resources.');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access ticket (owner, assignee, or has permissions)
 * @returns {Function} Express middleware function
 */
const requireTicketAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Admin and agents can access all tickets
      if (req.user.role === 'admin' || hasPermission(req.user, 'ticket:read:all')) {
        return next();
      }

      // For regular users, check if they own the ticket
      const ticketId = req.params.id || req.params.ticketId;
      
      if (!ticketId) {
        throw new AuthorizationError('Ticket ID required');
      }

      // In a real implementation, you would fetch the ticket from database
      // For now, we'll assume the user can access their own tickets
      if (hasPermission(req.user, 'ticket:read:own')) {
        return next();
      }

      throw new AuthorizationError('Access denied. Insufficient permissions to access this ticket.');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can modify ticket
 * @returns {Function} Express middleware function
 */
const requireTicketModifyAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Admin and agents can modify all tickets
      if (req.user.role === 'admin' || hasPermission(req.user, 'ticket:update:all')) {
        return next();
      }

      // Regular users can only modify their own tickets
      if (hasPermission(req.user, 'ticket:update:own')) {
        // In a real implementation, you would verify ticket ownership
        return next();
      }

      throw new AuthorizationError('Access denied. Insufficient permissions to modify this ticket.');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user can access knowledge base articles
 * @param {boolean} requirePublished - Whether to require published articles only
 * @returns {Function} Express middleware function
 */
const requireArticleAccess = (requirePublished = true) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Admin and agents can access all articles
      if (req.user.role === 'admin' || hasPermission(req.user, 'article:read:all')) {
        return next();
      }

      // Regular users can only access published articles
      if (requirePublished && hasPermission(req.user, 'article:read:published')) {
        return next();
      }

      throw new AuthorizationError('Access denied. Insufficient permissions to access articles.');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to log permission checks for auditing
 * @param {string} action - Action being performed
 * @returns {Function} Express middleware function
 */
const auditPermissionCheck = (action) => {
  return (req, res, next) => {
    const auditData = {
      userId: req.user?.userId,
      userRole: req.user?.role,
      action,
      resource: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // In a real implementation, you would save this to audit log
    console.log('Permission check audit:', auditData);
    
    next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireOwnershipOrAdmin,
  requireTicketAccess,
  requireTicketModifyAccess,
  requireArticleAccess,
  auditPermissionCheck
};
