const express = require('express');
const router = express.Router();

// Import controllers and middleware
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission, requireSelfAccess } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  validateCreateUser,
  validateUpdateUser,
  validateRoleChange,
  validateUserQuery,
  validateUserId,
  validateBulkOperation,
  validateStatsQuery
} = require('../validators/userValidators');

// All routes require authentication
router.use(authenticate);

// GET /api/users - List users with filtering and pagination
router.get('/',
  authorize('admin', 'agent'), // Only admins and agents can list users
  validateUserQuery,
  handleValidationErrors,
  userController.getUsers
);

// GET /api/users/statistics - Get user statistics (Admin only)
router.get('/statistics',
  authorize('admin'),
  validateStatsQuery,
  handleValidationErrors,
  userController.getUserStatistics
);

// POST /api/users - Create new user (Admin only)
router.post('/',
  authorize('admin'),
  validateCreateUser,
  handleValidationErrors,
  userController.createUser
);

// POST /api/users/bulk - Bulk user operations (Admin only)
router.post('/bulk',
  authorize('admin'),
  validateBulkOperation,
  handleValidationErrors,
  userController.bulkUserOperation
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  validateUserId,
  handleValidationErrors,
  userController.getUserById
);

// PUT /api/users/:id - Update user
router.put('/:id',
  validateUpdateUser,
  handleValidationErrors,
  userController.updateUser
);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id',
  authorize('admin'),
  validateUserId,
  handleValidationErrors,
  userController.deleteUser
);

// PUT /api/users/:id/role - Change user role (Admin only)
router.put('/:id/role',
  authorize('admin'),
  validateRoleChange,
  handleValidationErrors,
  userController.changeUserRole
);

module.exports = router;
