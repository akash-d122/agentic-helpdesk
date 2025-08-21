const { hasPermission, canAccessResource, createPermissionFilter } = require('../utils/permissions');
const { AuthorizationError } = require('./errorHandler');
const { securityLogger } = require('./logging');

/**
 * Permission-based authorization middleware
 * @param {string|string[]} permissions - Required permission(s)
 * @param {Object} options - Additional options
 * @returns {Function} - Express middleware function
 */
const requirePermission = (permissions, options = {}) => {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const requireAll = options.requireAll || false; // Whether all permissions are required
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    
    const userRole = req.user.role;
    let hasRequiredPermission = false;
    
    if (requireAll) {
      // User must have ALL specified permissions
      hasRequiredPermission = permissionArray.every(permission => 
        hasPermission(userRole, permission)
      );
    } else {
      // User must have ANY of the specified permissions
      hasRequiredPermission = permissionArray.some(permission => 
        hasPermission(userRole, permission)
      );
    }
    
    if (!hasRequiredPermission) {
      securityLogger.logSuspiciousActivity(
        'insufficient_permissions',
        {
          userId: req.user._id,
          userRole,
          requiredPermissions: permissionArray,
          requireAll,
          endpoint: req.originalUrl
        },
        req
      );
      
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Resource ownership authorization middleware
 * @param {string} resourceModel - Name of the resource model
 * @param {string} ownerField - Field name that contains owner ID
 * @param {string} permission - Required permission for non-owners
 * @returns {Function} - Express middleware function
 */
const requireResourceAccess = (resourceModel, ownerField = 'requester', permission = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthorizationError('Authentication required'));
      }
      
      const resourceId = req.params.id;
      if (!resourceId) {
        return next(new Error('Resource ID is required'));
      }
      
      // Get the model
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return next(new Error('Resource not found'));
      }
      
      // Check if user can access this resource
      const canAccess = canAccessResource(req.user, resource, ownerField, permission);
      
      if (!canAccess) {
        securityLogger.logSuspiciousActivity(
          'unauthorized_resource_access',
          {
            userId: req.user._id,
            userRole: req.user.role,
            resourceId,
            resourceType: resourceModel,
            ownerField,
            permission
          },
          req
        );
        
        return next(new AuthorizationError('Access denied to this resource'));
      }
      
      // Attach resource to request for use in controllers
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Query filter middleware for list endpoints
 * @param {string} ownerField - Field name that contains owner ID
 * @returns {Function} - Express middleware function
 */
const applyPermissionFilter = (ownerField = 'requester') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    
    // Create permission-based filter
    const permissionFilter = createPermissionFilter(req.user, ownerField);
    
    // Attach filter to request
    req.permissionFilter = permissionFilter;
    
    next();
  };
};

/**
 * Role hierarchy authorization middleware
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} - Express middleware function
 */
const requireMinimumRole = (minimumRole) => {
  const { isRoleEqualOrHigher } = require('../utils/permissions');
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    
    if (!isRoleEqualOrHigher(req.user.role, minimumRole)) {
      securityLogger.logSuspiciousActivity(
        'insufficient_role_level',
        {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRole: minimumRole,
          endpoint: req.originalUrl
        },
        req
      );
      
      return next(new AuthorizationError('Insufficient role level'));
    }
    
    next();
  };
};

/**
 * Self-access authorization middleware (user can only access their own data)
 * @param {string} userIdParam - Parameter name containing user ID
 * @returns {Function} - Express middleware function
 */
const requireSelfAccess = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    
    const targetUserId = req.params[userIdParam];
    const currentUserId = req.user._id.toString();
    
    // Admins can access any user's data
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Agents can access basic user data (limited permissions)
    if (req.user.role === 'agent') {
      // This would be controlled by specific permissions in the controller
      return next();
    }
    
    // Regular users can only access their own data
    if (targetUserId !== currentUserId) {
      securityLogger.logSuspiciousActivity(
        'unauthorized_user_access',
        {
          userId: currentUserId,
          targetUserId,
          userRole: req.user.role,
          endpoint: req.originalUrl
        },
        req
      );
      
      return next(new AuthorizationError('Access denied to other user data'));
    }
    
    next();
  };
};

/**
 * Conditional authorization middleware
 * @param {Function} condition - Function that returns boolean based on req
 * @param {string} errorMessage - Custom error message
 * @returns {Function} - Express middleware function
 */
const requireCondition = (condition, errorMessage = 'Access denied') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthorizationError('Authentication required'));
      }
      
      const isAllowed = await condition(req);
      
      if (!isAllowed) {
        securityLogger.logSuspiciousActivity(
          'conditional_access_denied',
          {
            userId: req.user._id,
            userRole: req.user.role,
            endpoint: req.originalUrl,
            condition: condition.name || 'anonymous'
          },
          req
        );
        
        return next(new AuthorizationError(errorMessage));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Time-based access control middleware
 * @param {Object} timeRestrictions - Time restrictions object
 * @returns {Function} - Express middleware function
 */
const requireTimeAccess = (timeRestrictions = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check hour restrictions
    if (timeRestrictions.allowedHours) {
      const { start, end } = timeRestrictions.allowedHours;
      if (currentHour < start || currentHour > end) {
        return next(new AuthorizationError('Access not allowed at this time'));
      }
    }
    
    // Check day restrictions
    if (timeRestrictions.allowedDays) {
      if (!timeRestrictions.allowedDays.includes(currentDay)) {
        return next(new AuthorizationError('Access not allowed on this day'));
      }
    }
    
    // Admins bypass time restrictions
    if (req.user.role === 'admin') {
      return next();
    }
    
    next();
  };
};

module.exports = {
  requirePermission,
  requireResourceAccess,
  applyPermissionFilter,
  requireMinimumRole,
  requireSelfAccess,
  requireCondition,
  requireTimeAccess
};
