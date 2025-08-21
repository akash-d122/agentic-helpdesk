const User = require('../models/User');
const { createQueryBuilder } = require('../utils/queryBuilder');
const { catchAsync } = require('../middleware/errorHandler');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/logging');
const { canAssignRole, createPermissionFilter } = require('../utils/permissions');
const winston = require('winston');

// Get all users with filtering, search, and pagination
const getUsers = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search,
    role,
    isActive,
    createdAfter,
    createdBefore,
    lastLoginAfter,
    lastLoginBefore,
    fields
  } = req.query;

  // Build query with filters
  const queryBuilder = createQueryBuilder(User, req.query);
  
  // Apply role-based filtering (non-admins can only see basic user info)
  if (req.user.role !== 'admin') {
    queryBuilder.selectFields('firstName,lastName,email,role,isActive,createdAt,lastLogin');
  }
  
  // Apply search if provided
  if (search) {
    queryBuilder.search(search, ['firstName', 'lastName', 'email']);
  }
  
  // Apply filters
  const filters = {};
  if (role) filters.role = role;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  
  queryBuilder.filter(filters);
  
  // Apply date range filters
  if (createdAfter || createdBefore) {
    queryBuilder.dateRange('createdAt', createdAfter, createdBefore);
  }
  
  if (lastLoginAfter || lastLoginBefore) {
    queryBuilder.dateRange('lastLogin', lastLoginAfter, lastLoginBefore);
  }
  
  // Apply sorting, field selection, and pagination
  queryBuilder
    .sort(sort)
    .selectFields(fields)
    .paginate(parseInt(page), parseInt(limit));
  
  // Execute query
  const result = await queryBuilder.execute();
  
  winston.info('Users retrieved', {
    userId: req.user._id,
    userRole: req.user.role,
    totalUsers: result.pagination.totalItems,
    page: result.pagination.currentPage,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      users: result.data,
      pagination: result.pagination
    },
    traceId: req.traceId
  });
});

// Get user by ID
const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  // Check if user is accessing their own profile or has admin privileges
  const isOwnProfile = id === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  const isAgent = req.user.role === 'agent';
  
  if (!isOwnProfile && !isAdmin && !isAgent) {
    throw new AuthorizationError('Access denied to user profile');
  }
  
  // Build query with appropriate field selection
  let selectFields = 'firstName lastName email role isActive createdAt lastLogin';
  
  if (isOwnProfile || isAdmin) {
    selectFields += ' emailVerified updatedAt';
  }
  
  const user = await User.findById(id).select(selectFields);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  // Add user statistics if admin or own profile
  let userStats = null;
  if (isOwnProfile || isAdmin) {
    // Get user activity statistics
    const Ticket = require('../models/Ticket');
    const Article = require('../models/Article');
    
    const [ticketStats, articleStats] = await Promise.all([
      Ticket.aggregate([
        { $match: { requester: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      user.role === 'agent' || user.role === 'admin' ? Article.aggregate([
        { $match: { author: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]) : Promise.resolve([])
    ]);
    
    userStats = {
      tickets: ticketStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      articles: articleStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };
  }
  
  winston.info('User profile retrieved', {
    userId: req.user._id,
    targetUserId: id,
    isOwnProfile,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      user: {
        ...user.toJSON(),
        ...(userStats && { statistics: userStats })
      }
    },
    traceId: req.traceId
  });
});

// Create new user (Admin only)
const createUser = catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, role = 'user' } = req.body;
  
  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }
  
  // Create new user
  const userData = {
    email,
    password,
    firstName,
    lastName,
    role,
    emailVerified: true // Admin-created users are pre-verified
  };
  
  const user = new User(userData);
  await user.save();
  
  winston.info('User created by admin', {
    adminId: req.user._id,
    newUserId: user._id,
    newUserEmail: user.email,
    newUserRole: user.role,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.create',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      newUserData: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    }
  );
  
  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    },
    traceId: req.traceId
  });
});

// Update user
const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, isActive } = req.body;
  
  // Check if user is updating their own profile or has admin privileges
  const isOwnProfile = id === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';
  
  if (!isOwnProfile && !isAdmin) {
    throw new AuthorizationError('Access denied to update this user');
  }
  
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  // Store original data for audit
  const originalData = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive: user.isActive
  };
  
  // Update allowed fields
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  
  // Only admins can update email and active status
  if (isAdmin) {
    if (email !== undefined) {
      // Check if email is already taken by another user
      if (email !== user.email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser && existingUser._id.toString() !== id) {
          throw new ConflictError('Email is already taken by another user');
        }
        updates.email = email;
      }
    }
    if (isActive !== undefined) updates.isActive = isActive;
  }
  
  // Apply updates
  Object.assign(user, updates);
  await user.save();
  
  winston.info('User updated', {
    updatedBy: req.user._id,
    targetUserId: id,
    isOwnProfile,
    updates: Object.keys(updates),
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'user.update',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      changes: Object.keys(updates).map(field => ({
        field,
        oldValue: originalData[field],
        newValue: updates[field]
      }))
    }
  );
  
  res.json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        updatedAt: user.updatedAt
      }
    },
    traceId: req.traceId
  });
});

// Delete user (Admin only - soft delete)
const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (id === req.user._id.toString()) {
    throw new ValidationError('You cannot delete your own account');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent deletion of the last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) {
      throw new ValidationError('Cannot delete the last active admin user');
    }
  }

  // Soft delete by deactivating
  user.isActive = false;
  await user.save();

  winston.info('User deleted (deactivated)', {
    deletedBy: req.user._id,
    targetUserId: id,
    targetUserEmail: user.email,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'user.delete',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      deletedUserData: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    }
  );

  res.json({
    status: 'success',
    message: 'User deleted successfully',
    traceId: req.traceId
  });
});

// Change user role (Admin only)
const changeUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Prevent self-role changes
  if (id === req.user._id.toString()) {
    throw new ValidationError('You cannot change your own role');
  }

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if current user can assign this role
  if (!canAssignRole(req.user, role, user.role)) {
    throw new AuthorizationError('You do not have permission to assign this role');
  }

  // Prevent changing the last admin's role
  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (adminCount <= 1) {
      throw new ValidationError('Cannot change the role of the last active admin');
    }
  }

  const originalRole = user.role;
  user.role = role;
  await user.save();

  winston.info('User role changed', {
    changedBy: req.user._id,
    targetUserId: id,
    originalRole,
    newRole: role,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'user.role_change',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'user',
      id: user._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      changes: [{
        field: 'role',
        oldValue: originalRole,
        newValue: role
      }]
    }
  );

  res.json({
    status: 'success',
    message: 'User role updated successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    },
    traceId: req.traceId
  });
});

// Get user statistics (Admin only)
const getUserStatistics = catchAsync(async (req, res) => {
  const {
    period = 'month',
    startDate,
    endDate,
    groupBy = 'role'
  } = req.query;

  // Build date range
  let dateRange = {};
  if (startDate || endDate) {
    dateRange.createdAt = {};
    if (startDate) dateRange.createdAt.$gte = new Date(startDate);
    if (endDate) dateRange.createdAt.$lte = new Date(endDate);
  } else {
    // Default to last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dateRange.createdAt = { $gte: lastMonth };
  }

  // Build aggregation pipeline
  const pipeline = [
    { $match: dateRange }
  ];

  if (groupBy === 'role') {
    pipeline.push({
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
      }
    });
  } else if (groupBy === 'status') {
    pipeline.push({
      $group: {
        _id: '$isActive',
        count: { $sum: 1 }
      }
    });
  } else if (groupBy === 'date') {
    pipeline.push({
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    });
  }

  pipeline.push({ $sort: { _id: 1 } });

  const stats = await User.aggregate(pipeline);

  // Get overall statistics
  const [totalUsers, activeUsers, recentLogins] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  winston.info('User statistics retrieved', {
    userId: req.user._id,
    period,
    groupBy,
    traceId: req.traceId
  });

  res.json({
    status: 'success',
    data: {
      statistics: stats,
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentLogins
      },
      period,
      groupBy
    },
    traceId: req.traceId
  });
});

// Bulk user operations (Admin only)
const bulkUserOperation = catchAsync(async (req, res) => {
  const { userIds, operation, reason } = req.body;

  // Validate that current user is not in the list for certain operations
  if (['deactivate', 'delete'].includes(operation)) {
    if (userIds.includes(req.user._id.toString())) {
      throw new ValidationError(`You cannot ${operation} your own account`);
    }
  }

  const users = await User.find({ _id: { $in: userIds } });

  if (users.length !== userIds.length) {
    throw new NotFoundError('One or more users not found');
  }

  // Check for admin protection
  if (['deactivate', 'delete'].includes(operation)) {
    const adminUsers = users.filter(user => user.role === 'admin');
    if (adminUsers.length > 0) {
      const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });
      if (totalAdmins - adminUsers.length < 1) {
        throw new ValidationError('Cannot deactivate all admin users');
      }
    }
  }

  let updateOperation = {};
  let auditAction = '';

  switch (operation) {
    case 'activate':
      updateOperation = { isActive: true };
      auditAction = 'user.bulk_activate';
      break;
    case 'deactivate':
      updateOperation = { isActive: false };
      auditAction = 'user.bulk_deactivate';
      break;
    case 'delete':
      updateOperation = { isActive: false }; // Soft delete
      auditAction = 'user.bulk_delete';
      break;
    default:
      throw new ValidationError('Invalid operation');
  }

  // Perform bulk update
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    updateOperation
  );

  winston.info('Bulk user operation completed', {
    performedBy: req.user._id,
    operation,
    userCount: userIds.length,
    modifiedCount: result.modifiedCount,
    reason,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    auditAction,
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'system',
      id: 'bulk_operation'
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      operation,
      userIds,
      reason,
      modifiedCount: result.modifiedCount
    }
  );

  res.json({
    status: 'success',
    message: `Bulk ${operation} operation completed successfully`,
    data: {
      operation,
      totalUsers: userIds.length,
      modifiedUsers: result.modifiedCount,
      reason
    },
    traceId: req.traceId
  });
});

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  getUserStatistics,
  bulkUserOperation
};
