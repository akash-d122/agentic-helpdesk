const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Config = require('../models/Config');
const { createQueryBuilder } = require('../utils/queryBuilder');
const { catchAsync } = require('../middleware/errorHandler');
const { NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../middleware/errorHandler');
const { auditLogger } = require('../middleware/logging');
const { canAccessResource, createPermissionFilter } = require('../utils/permissions');
const winston = require('winston');

// Get all tickets with filtering, search, and pagination
const getTickets = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search,
    status,
    priority,
    category,
    assignedTo,
    requester,
    createdAfter,
    createdBefore,
    overdue,
    autoResolved,
    fields
  } = req.query;

  // Build query with role-based filtering
  const queryBuilder = createQueryBuilder(Ticket, req.query);
  
  // Apply permission-based filtering
  const permissionFilter = createPermissionFilter(req.user, 'requester');
  queryBuilder.filter(permissionFilter);
  
  // Apply additional filters
  const filters = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (category) filters.category = category;
  if (assignedTo) filters.assignedTo = assignedTo;
  if (requester && (req.user.role === 'admin' || req.user.role === 'agent')) {
    filters.requester = requester;
  }
  if (autoResolved !== undefined) filters['aiProcessing.autoResolved'] = autoResolved === 'true';
  
  queryBuilder.filter(filters);
  
  // Apply search if provided
  if (search) {
    queryBuilder.search(search, ['subject', 'description', 'ticketNumber']);
  }
  
  // Apply date range filters
  if (createdAfter || createdBefore) {
    queryBuilder.dateRange('createdAt', createdAfter, createdBefore);
  }
  
  // Handle overdue filter
  if (overdue === 'true') {
    const now = new Date();
    const overdueQuery = {
      status: { $in: ['open', 'triaged', 'in_progress'] },
      $or: [
        {
          'sla.responseTime.target': { $exists: true },
          'sla.responseTime.actual': { $exists: false },
          createdAt: { $lt: new Date(now - 4 * 60 * 60 * 1000) } // 4 hours default
        }
      ]
    };
    queryBuilder.filter(overdueQuery);
  }
  
  // Apply sorting, field selection, and pagination
  queryBuilder
    .sort(sort)
    .selectFields(fields)
    .populate('requester', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .paginate(parseInt(page), parseInt(limit));
  
  // Execute query
  const result = await queryBuilder.execute();
  
  winston.info('Tickets retrieved', {
    userId: req.user._id,
    userRole: req.user.role,
    totalTickets: result.pagination.totalItems,
    page: result.pagination.currentPage,
    filters: { status, priority, category, assignedTo, requester },
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      tickets: result.data,
      pagination: result.pagination
    },
    traceId: req.traceId
  });
});

// Get ticket by ID
const getTicketById = catchAsync(async (req, res) => {
  const { id } = req.params;
  
  const ticket = await Ticket.findById(id)
    .populate('requester', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('conversation.author', 'firstName lastName email role')
    .populate('aiProcessing.citedArticles', 'title summary');
  
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }
  
  // Check access permissions
  const canAccess = canAccessResource(req.user, ticket, 'requester', 'ticket:read:all');
  
  if (!canAccess) {
    throw new AuthorizationError('Access denied to this ticket');
  }
  
  // Filter internal comments for non-agents
  if (!['admin', 'agent'].includes(req.user.role)) {
    ticket.conversation = ticket.conversation.filter(msg => !msg.isInternal);
  }
  
  winston.info('Ticket retrieved', {
    userId: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    ticketStatus: ticket.status,
    traceId: req.traceId
  });
  
  res.json({
    status: 'success',
    data: {
      ticket
    },
    traceId: req.traceId
  });
});

// Create new ticket
const createTicket = catchAsync(async (req, res) => {
  const {
    subject,
    description,
    category,
    priority = 'medium',
    tags = []
  } = req.body;
  
  // Get SLA configuration
  const [responseTimeTarget, resolutionTimeTarget] = await Promise.all([
    Config.getValue('sla.response_time_target', 240), // 4 hours default
    Config.getValue('sla.resolution_time_target', 1440) // 24 hours default
  ]);
  
  // Create ticket data
  const ticketData = {
    subject: subject.trim(),
    description,
    category,
    priority,
    tags: tags.map(tag => tag.trim().toLowerCase()),
    requester: req.user._id,
    sla: {
      responseTime: {
        target: responseTimeTarget
      },
      resolutionTime: {
        target: resolutionTimeTarget
      }
    }
  };
  
  const ticket = new Ticket(ticketData);
  await ticket.save();
  
  // Populate requester information
  await ticket.populate('requester', 'firstName lastName email');
  
  winston.info('Ticket created', {
    requesterId: req.user._id,
    ticketId: ticket._id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'ticket.create',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'ticket',
      id: ticket._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      ticketData: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        tags: ticket.tags
      }
    }
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Ticket created successfully',
    data: {
      ticket
    },
    traceId: req.traceId
  });
});

// Update ticket
const updateTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }
  
  // Check if user can update this ticket
  const canUpdate = canAccessResource(req.user, ticket, 'requester', 'ticket:update:all');
  
  if (!canUpdate) {
    throw new AuthorizationError('Access denied to update this ticket');
  }
  
  // Store original data for audit
  const originalData = {
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    tags: ticket.tags
  };
  
  // Apply updates based on user role
  const allowedUpdates = ['subject', 'description', 'tags'];
  
  // Agents and admins can update more fields
  if (['admin', 'agent'].includes(req.user.role)) {
    allowedUpdates.push('category', 'priority');
  }
  
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'subject') {
        ticket[field] = updates[field].trim();
      } else if (field === 'tags') {
        ticket[field] = updates[field].map(tag => tag.trim().toLowerCase());
      } else {
        ticket[field] = updates[field];
      }
    }
  });
  
  await ticket.save();
  
  // Populate related data
  await ticket.populate('requester', 'firstName lastName email');
  await ticket.populate('assignedTo', 'firstName lastName email');
  
  winston.info('Ticket updated', {
    updatedBy: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    updates: Object.keys(updates),
    traceId: req.traceId
  });
  
  // Create audit log
  await auditLogger.logAction(
    'ticket.update',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'ticket',
      id: ticket._id
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
        newValue: ticket[field]
      }))
    }
  );
  
  res.json({
    status: 'success',
    message: 'Ticket updated successfully',
    data: {
      ticket
    },
    traceId: req.traceId
  });
});

// Assign ticket to agent
const assignTicket = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { assignedTo } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Validate assigned user if provided
  let assignedUser = null;
  if (assignedTo) {
    assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      throw new NotFoundError('Assigned user not found');
    }
    if (!['agent', 'admin'].includes(assignedUser.role)) {
      throw new ValidationError('Tickets can only be assigned to agents or admins');
    }
    if (!assignedUser.isActive) {
      throw new ValidationError('Cannot assign ticket to inactive user');
    }
  }

  const originalAssignee = ticket.assignedTo;

  // Update assignment
  if (assignedTo) {
    ticket.assignedTo = assignedTo;
    ticket.assignedAt = new Date();
    if (ticket.status === 'open') {
      ticket.status = 'triaged';
    }
  } else {
    // Unassign ticket
    ticket.assignedTo = null;
    ticket.assignedAt = null;
    if (ticket.status === 'triaged' || ticket.status === 'in_progress') {
      ticket.status = 'open';
    }
  }

  await ticket.save();

  // Populate related data
  await ticket.populate('requester', 'firstName lastName email');
  await ticket.populate('assignedTo', 'firstName lastName email');

  winston.info('Ticket assignment changed', {
    changedBy: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    originalAssignee,
    newAssignee: assignedTo,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'ticket.assign',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'ticket',
      id: ticket._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      assignment: {
        from: originalAssignee,
        to: assignedTo,
        assignedUser: assignedUser ? {
          id: assignedUser._id,
          name: `${assignedUser.firstName} ${assignedUser.lastName}`,
          email: assignedUser.email
        } : null
      }
    }
  );

  res.json({
    status: 'success',
    message: assignedTo ? 'Ticket assigned successfully' : 'Ticket unassigned successfully',
    data: {
      ticket
    },
    traceId: req.traceId
  });
});

// Update ticket status
const updateTicketStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Check permissions for status changes
  const canUpdateStatus = canAccessResource(req.user, ticket, 'requester', 'ticket:update:all');

  // Special rules for certain status changes
  if (status === 'resolved' || status === 'closed') {
    // Only agents/admins or ticket owner can resolve/close
    if (!canUpdateStatus && ticket.requester.toString() !== req.user._id.toString()) {
      throw new AuthorizationError('Access denied to change ticket status');
    }
  } else if (status === 'in_progress') {
    // Only assigned agent or admin can set to in_progress
    if (req.user.role !== 'admin' &&
        (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user._id.toString())) {
      throw new AuthorizationError('Only assigned agent can set ticket to in progress');
    }
  }

  const originalStatus = ticket.status;

  // Validate status transition
  const validTransitions = {
    'open': ['triaged', 'in_progress', 'resolved', 'closed'],
    'triaged': ['in_progress', 'waiting_human', 'resolved', 'closed'],
    'waiting_human': ['in_progress', 'resolved', 'closed'],
    'in_progress': ['waiting_customer', 'resolved', 'closed'],
    'waiting_customer': ['in_progress', 'resolved', 'closed'],
    'resolved': ['closed', 'open'], // Can reopen
    'closed': ['open'] // Can reopen
  };

  if (!validTransitions[originalStatus]?.includes(status)) {
    throw new ValidationError(`Invalid status transition from ${originalStatus} to ${status}`);
  }

  // Update status
  ticket.status = status;

  // Set timestamps for certain status changes
  if (status === 'resolved' && !ticket.resolvedAt) {
    ticket.resolvedAt = new Date();
  } else if (status === 'closed' && !ticket.closedAt) {
    ticket.closedAt = new Date();
  } else if (status === 'open' && originalStatus === 'closed') {
    // Reopening ticket
    ticket.reopenCount += 1;
    ticket.resolvedAt = null;
    ticket.closedAt = null;
  }

  await ticket.save();

  // Populate related data
  await ticket.populate('requester', 'firstName lastName email');
  await ticket.populate('assignedTo', 'firstName lastName email');

  winston.info('Ticket status updated', {
    updatedBy: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    originalStatus,
    newStatus: status,
    reason,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'ticket.status_change',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'ticket',
      id: ticket._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      statusChange: {
        from: originalStatus,
        to: status,
        reason
      }
    }
  );

  res.json({
    status: 'success',
    message: 'Ticket status updated successfully',
    data: {
      ticket
    },
    traceId: req.traceId
  });
});

// Add comment to ticket
const addComment = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { message, isInternal = false } = req.body;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Check access permissions
  const canAccess = canAccessResource(req.user, ticket, 'requester', 'ticket:update:all');

  if (!canAccess) {
    throw new AuthorizationError('Access denied to add comment to this ticket');
  }

  // Only agents/admins can add internal comments
  if (isInternal && !['admin', 'agent'].includes(req.user.role)) {
    throw new AuthorizationError('Only agents and admins can add internal comments');
  }

  // Determine author type
  let authorType = 'user';
  if (req.user.role === 'agent') authorType = 'agent';
  else if (req.user.role === 'admin') authorType = 'agent'; // Admins act as agents in tickets

  // Add comment to conversation
  const comment = {
    author: req.user._id,
    authorType,
    message,
    isInternal,
    metadata: {}
  };

  ticket.conversation.push(comment);

  // Update ticket status if needed
  if (ticket.status === 'waiting_customer' && authorType === 'user') {
    ticket.status = 'in_progress';
  } else if (ticket.status === 'waiting_human' && authorType === 'agent') {
    ticket.status = 'in_progress';
  }

  await ticket.save();

  // Populate the new comment
  await ticket.populate('conversation.author', 'firstName lastName email role');

  // Get the newly added comment
  const newComment = ticket.conversation[ticket.conversation.length - 1];

  winston.info('Comment added to ticket', {
    authorId: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    isInternal,
    authorType,
    traceId: req.traceId
  });

  // Create audit log
  await auditLogger.logAction(
    'ticket.message_add',
    {
      type: 'user',
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    {
      type: 'ticket',
      id: ticket._id
    },
    {
      traceId: req.traceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    },
    {
      comment: {
        isInternal,
        authorType,
        messageLength: message.length
      }
    }
  );

  res.status(201).json({
    status: 'success',
    message: 'Comment added successfully',
    data: {
      comment: newComment,
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        conversationCount: ticket.conversation.length
      }
    },
    traceId: req.traceId
  });
});

// Get ticket history
const getTicketHistory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }

  // Check access permissions
  const canAccess = canAccessResource(req.user, ticket, 'requester', 'ticket:read:all');

  if (!canAccess) {
    throw new AuthorizationError('Access denied to view ticket history');
  }

  // Get audit logs for this ticket
  const AuditLog = require('../models/AuditLog');
  const auditLogs = await AuditLog.findByTarget('ticket', id);

  // Get AI processing history if available
  const AgentSuggestion = require('../models/AgentSuggestion');
  const aiSuggestions = await AgentSuggestion.find({ ticket: id })
    .populate('humanReview.reviewedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  // Combine and sort all history events
  const historyEvents = [
    ...auditLogs.map(log => ({
      type: 'audit',
      action: log.action,
      timestamp: log.timestamp,
      actor: log.actor,
      details: log.details,
      traceId: log.traceId
    })),
    ...aiSuggestions.map(suggestion => ({
      type: 'ai_suggestion',
      action: 'ai.suggestion_created',
      timestamp: suggestion.createdAt,
      actor: { type: 'ai_agent', id: 'system' },
      details: {
        suggestionType: suggestion.type,
        confidence: suggestion.confidence,
        status: suggestion.status
      },
      suggestion
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  winston.info('Ticket history retrieved', {
    userId: req.user._id,
    ticketId: id,
    ticketNumber: ticket.ticketNumber,
    historyEventCount: historyEvents.length,
    traceId: req.traceId
  });

  res.json({
    status: 'success',
    data: {
      ticket: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      },
      history: historyEvents
    },
    traceId: req.traceId
  });
});

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  assignTicket,
  updateTicketStatus,
  addComment,
  getTicketHistory
};
