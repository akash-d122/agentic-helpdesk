const express = require('express');
const router = express.Router();

// Import controllers and middleware
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/errorHandler');
const {
  validateCreateTicket,
  validateUpdateTicket,
  validateTicketAssignment,
  validateStatusUpdate,
  validateCreateComment,
  validateTicketQuery,
  validateTicketId
} = require('../validators/ticketValidators');

// All routes require authentication
router.use(authenticate);

// GET /api/tickets - List tickets with filtering and pagination
router.get('/',
  validateTicketQuery,
  handleValidationErrors,
  ticketController.getTickets
);

// POST /api/tickets - Create new ticket
router.post('/',
  validateCreateTicket,
  handleValidationErrors,
  ticketController.createTicket
);

// GET /api/tickets/:id - Get ticket by ID
router.get('/:id',
  validateTicketId,
  handleValidationErrors,
  ticketController.getTicketById
);

// PUT /api/tickets/:id - Update ticket
router.put('/:id',
  validateUpdateTicket,
  handleValidationErrors,
  ticketController.updateTicket
);

// PUT /api/tickets/:id/assign - Assign ticket to agent (Agent/Admin only)
router.put('/:id/assign',
  authorize('admin', 'agent'),
  validateTicketAssignment,
  handleValidationErrors,
  ticketController.assignTicket
);

// PUT /api/tickets/:id/status - Update ticket status
router.put('/:id/status',
  validateStatusUpdate,
  handleValidationErrors,
  ticketController.updateTicketStatus
);

// POST /api/tickets/:id/comments - Add comment to ticket
router.post('/:id/comments',
  validateCreateComment,
  handleValidationErrors,
  ticketController.addComment
);

// GET /api/tickets/:id/history - Get ticket history
router.get('/:id/history',
  validateTicketId,
  handleValidationErrors,
  ticketController.getTicketHistory
);

module.exports = router;
