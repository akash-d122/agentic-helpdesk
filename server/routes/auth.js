const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const {
  authenticate,
  refreshToken,
  logout,
  trackAuthAttempt,
  clearAuthAttempts
} = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateLogout,
  validateProfileUpdate,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword
} = require('../validators/authValidators');

// Public routes (no authentication required)

// Register new user
router.post('/register',
  authRateLimit,
  validateRegister,
  handleValidationErrors,
  authController.register
);

// Login user
router.post('/login',
  authRateLimit,
  trackAuthAttempt,
  validateLogin,
  handleValidationErrors,
  authController.login,
  clearAuthAttempts
);

// Refresh access token
router.post('/refresh',
  authRateLimit,
  validateRefreshToken,
  handleValidationErrors,
  refreshToken,
  authController.refresh
);

// Forgot password
router.post('/forgot-password',
  authRateLimit,
  validateForgotPassword,
  handleValidationErrors,
  authController.forgotPassword
);

// Reset password
router.post('/reset-password',
  authRateLimit,
  validateResetPassword,
  handleValidationErrors,
  authController.resetPassword
);

// Protected routes (authentication required)

// Get current user (alias for profile)
router.get('/me',
  authenticate,
  authController.getProfile
);

// Get current user profile
router.get('/profile',
  authenticate,
  authController.getProfile
);

// Update user profile
router.patch('/profile',
  authenticate,
  validateProfileUpdate,
  handleValidationErrors,
  authController.updateProfile
);

// Change password
router.patch('/change-password',
  authenticate,
  validatePasswordChange,
  handleValidationErrors,
  authController.changePassword
);

// Logout user
router.post('/logout',
  authenticate,
  validateLogout,
  handleValidationErrors,
  logout,
  authController.logout
);

// Verify token endpoint (for frontend to check if token is valid)
router.get('/verify',
  authenticate,
  (req, res) => {
    res.json({
      status: 'success',
      message: 'Token is valid',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          emailVerified: req.user.emailVerified
        }
      },
      traceId: req.traceId
    });
  }
);

module.exports = router;
