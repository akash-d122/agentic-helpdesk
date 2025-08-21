// Role hierarchy and permissions system

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  user: 1,
  agent: 2,
  admin: 3
};

// Define permissions for each role
const ROLE_PERMISSIONS = {
  user: [
    // Ticket permissions
    'ticket:create',
    'ticket:read:own',
    'ticket:update:own',
    
    // Profile permissions
    'profile:read:own',
    'profile:update:own',
    
    // Knowledge base permissions
    'article:read:published'
  ],
  
  agent: [
    // Inherit all user permissions
    ...ROLE_PERMISSIONS?.user || [],
    
    // Ticket permissions
    'ticket:read:all',
    'ticket:update:all',
    'ticket:assign',
    'ticket:resolve',
    'ticket:close',
    
    // AI agent permissions
    'agent:review:suggestions',
    'agent:approve:responses',
    'agent:reject:responses',
    'agent:modify:responses',
    
    // Knowledge base permissions
    'article:read:all',
    'article:feedback',
    
    // Audit permissions
    'audit:read:tickets',
    
    // User permissions (limited)
    'user:read:basic'
  ],
  
  admin: [
    // Inherit all agent permissions
    ...ROLE_PERMISSIONS?.agent || [],
    
    // User management permissions
    'user:create',
    'user:read:all',
    'user:update:all',
    'user:delete',
    'user:role:change',
    
    // Knowledge base management
    'article:create',
    'article:update:all',
    'article:delete',
    'article:publish',
    'article:archive',
    
    // System configuration
    'config:read',
    'config:update',
    
    // Audit permissions
    'audit:read:all',
    
    // AI agent configuration
    'agent:config:update',
    'agent:analytics:read',
    
    // System permissions
    'system:health:read',
    'system:logs:read'
  ]
};

// Flatten permissions for easier lookup
const flattenPermissions = () => {
  const flattened = {};
  
  Object.keys(ROLE_PERMISSIONS).forEach(role => {
    flattened[role] = new Set(ROLE_PERMISSIONS[role]);
  });
  
  return flattened;
};

const FLATTENED_PERMISSIONS = flattenPermissions();

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} - Whether the role has the permission
 */
const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  
  const rolePermissions = FLATTENED_PERMISSIONS[role];
  return rolePermissions ? rolePermissions.has(permission) : false;
};

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the role has any of the permissions
 */
const hasAnyPermission = (role, permissions) => {
  if (!role || !Array.isArray(permissions)) return false;
  
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} - Whether the role has all of the permissions
 */
const hasAllPermissions = (role, permissions) => {
  if (!role || !Array.isArray(permissions)) return false;
  
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Check if a role is higher in hierarchy than another role
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} - Whether role1 is higher than role2
 */
const isRoleHigher = (role1, role2) => {
  const level1 = ROLE_HIERARCHY[role1] || 0;
  const level2 = ROLE_HIERARCHY[role2] || 0;
  
  return level1 > level2;
};

/**
 * Check if a role is equal or higher in hierarchy than another role
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} - Whether role1 is equal or higher than role2
 */
const isRoleEqualOrHigher = (role1, role2) => {
  const level1 = ROLE_HIERARCHY[role1] || 0;
  const level2 = ROLE_HIERARCHY[role2] || 0;
  
  return level1 >= level2;
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} - Array of permissions
 */
const getRolePermissions = (role) => {
  const rolePermissions = FLATTENED_PERMISSIONS[role];
  return rolePermissions ? Array.from(rolePermissions) : [];
};

/**
 * Check if user can access resource based on ownership and role
 * @param {Object} user - User object
 * @param {Object} resource - Resource object
 * @param {string} ownerField - Field name that contains owner ID
 * @param {string} permission - Required permission
 * @returns {boolean} - Whether user can access the resource
 */
const canAccessResource = (user, resource, ownerField = 'requester', permission = null) => {
  if (!user || !resource) return false;
  
  // Check if user has the required permission
  if (permission && !hasPermission(user.role, permission)) {
    return false;
  }
  
  // Admins can access everything
  if (user.role === 'admin') return true;
  
  // Agents can access most resources
  if (user.role === 'agent') {
    // Check if there are agent-specific restrictions
    const agentRestrictedPermissions = [
      'user:delete',
      'user:role:change',
      'config:update'
    ];
    
    if (permission && agentRestrictedPermissions.includes(permission)) {
      return false;
    }
    
    return true;
  }
  
  // Regular users can only access their own resources
  const ownerId = resource[ownerField];
  return ownerId && ownerId.toString() === user._id.toString();
};

/**
 * Filter resources based on user permissions
 * @param {Object} user - User object
 * @param {Array} resources - Array of resources
 * @param {string} ownerField - Field name that contains owner ID
 * @returns {Array} - Filtered resources
 */
const filterResourcesByPermission = (user, resources, ownerField = 'requester') => {
  if (!user || !Array.isArray(resources)) return [];
  
  // Admins and agents can see all resources
  if (['admin', 'agent'].includes(user.role)) {
    return resources;
  }
  
  // Regular users can only see their own resources
  return resources.filter(resource => {
    const ownerId = resource[ownerField];
    return ownerId && ownerId.toString() === user._id.toString();
  });
};

/**
 * Create a permission-based query filter
 * @param {Object} user - User object
 * @param {string} ownerField - Field name that contains owner ID
 * @returns {Object} - MongoDB query filter
 */
const createPermissionFilter = (user, ownerField = 'requester') => {
  if (!user) return { _id: null }; // Return filter that matches nothing
  
  // Admins and agents can see all resources
  if (['admin', 'agent'].includes(user.role)) {
    return {}; // No filter - return all
  }
  
  // Regular users can only see their own resources
  return { [ownerField]: user._id };
};

/**
 * Validate role assignment permissions
 * @param {Object} currentUser - User making the change
 * @param {string} targetRole - Role being assigned
 * @param {string} currentTargetRole - Current role of target user
 * @returns {boolean} - Whether the assignment is allowed
 */
const canAssignRole = (currentUser, targetRole, currentTargetRole = null) => {
  if (!currentUser || !targetRole) return false;
  
  // Only admins can assign roles
  if (currentUser.role !== 'admin') return false;
  
  // Admins can assign any role except admin (to prevent privilege escalation)
  if (targetRole === 'admin') {
    // Only allow admin assignment if current user is admin and target is not already admin
    return currentUser.role === 'admin' && currentTargetRole !== 'admin';
  }
  
  return ['user', 'agent'].includes(targetRole);
};

module.exports = {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleHigher,
  isRoleEqualOrHigher,
  getRolePermissions,
  canAccessResource,
  filterResourcesByPermission,
  createPermissionFilter,
  canAssignRole
};
