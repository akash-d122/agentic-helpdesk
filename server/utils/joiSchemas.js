const Joi = require('joi');

/**
 * Joi validation schemas for comprehensive request validation
 */

// Common validation patterns
const mongoIdSchema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid MongoDB ObjectId format');
const emailSchema = Joi.string().email().lowercase().trim();
const passwordSchema = Joi.string().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).message('Password must contain at least one lowercase letter, one uppercase letter, and one number');
const nameSchema = Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z\s'-]+$/).message('Name can only contain letters, spaces, hyphens, and apostrophes');
const tagSchema = Joi.string().trim().min(1).max(50).pattern(/^[a-zA-Z0-9\s-_]+$/).message('Tags can only contain letters, numbers, spaces, hyphens, and underscores');

// User schemas
const userSchemas = {
  register: Joi.object({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    firstName: nameSchema.required(),
    lastName: nameSchema.required(),
    role: Joi.string().valid('admin', 'agent', 'user').default('user')
  }),

  login: Joi.object({
    email: emailSchema.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema
  }).min(1),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: passwordSchema.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match new password'
    })
  }),

  updateUser: Joi.object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    isActive: Joi.boolean()
  }).min(1),

  changeRole: Joi.object({
    role: Joi.string().valid('admin', 'agent', 'user').required()
  }),

  bulkOperation: Joi.object({
    userIds: Joi.array().items(mongoIdSchema).min(1).max(50).required(),
    operation: Joi.string().valid('activate', 'deactivate', 'delete').required(),
    reason: Joi.string().trim().min(1).max(500)
  })
};

// Article schemas
const articleSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    content: Joi.string().trim().min(1).max(50000).required(),
    summary: Joi.string().trim().max(500),
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other').required(),
    tags: Joi.array().items(tagSchema).max(10),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    metadata: Joi.object({
      difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
      estimatedReadTime: Joi.number().integer().min(1).max(120),
      language: Joi.string().pattern(/^[a-z]{2}(-[A-Z]{2})?$/).default('en')
    })
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(200),
    content: Joi.string().trim().min(1).max(50000),
    summary: Joi.string().trim().max(500),
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other'),
    tags: Joi.array().items(tagSchema).max(10),
    status: Joi.string().valid('draft', 'published', 'archived'),
    metadata: Joi.object({
      difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
      estimatedReadTime: Joi.number().integer().min(1).max(120),
      language: Joi.string().pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
    })
  }).min(1),

  publish: Joi.object({
    action: Joi.string().valid('publish', 'unpublish').required()
  }),

  feedback: Joi.object({
    helpful: Joi.boolean().required(),
    feedback: Joi.string().trim().max(1000)
  }),

  bulkOperation: Joi.object({
    articleIds: Joi.array().items(mongoIdSchema).min(1).max(50).required(),
    operation: Joi.string().valid('publish', 'unpublish', 'archive', 'delete').required(),
    reason: Joi.string().trim().min(1).max(500)
  })
};

// Ticket schemas
const ticketSchemas = {
  create: Joi.object({
    subject: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().min(1).max(10000).required(),
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other').required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    tags: Joi.array().items(tagSchema).max(10)
  }),

  update: Joi.object({
    subject: Joi.string().trim().min(1).max(200),
    description: Joi.string().trim().min(1).max(10000),
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    tags: Joi.array().items(tagSchema).max(10)
  }).min(1),

  assign: Joi.object({
    assignedTo: mongoIdSchema.allow(null)
  }),

  statusUpdate: Joi.object({
    status: Joi.string().valid('open', 'triaged', 'waiting_human', 'in_progress', 'waiting_customer', 'resolved', 'closed').required(),
    reason: Joi.string().trim().min(1).max(500)
  }),

  addComment: Joi.object({
    message: Joi.string().trim().min(1).max(10000).required(),
    isInternal: Joi.boolean().default(false)
  }),

  bulkOperation: Joi.object({
    ticketIds: Joi.array().items(mongoIdSchema).min(1).max(50).required(),
    operation: Joi.string().valid('assign', 'close', 'reopen', 'priority', 'category').required(),
    value: Joi.alternatives().conditional('operation', {
      switch: [
        { is: 'assign', then: mongoIdSchema.required() },
        { is: 'priority', then: Joi.string().valid('low', 'medium', 'high', 'urgent').required() },
        { is: 'category', then: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other').required() },
        { is: Joi.string().valid('close', 'reopen'), then: Joi.forbidden() }
      ]
    }),
    reason: Joi.string().trim().min(1).max(500)
  })
};

// Query parameter schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().pattern(/^(-?)[a-zA-Z_]+(,(-?)[a-zA-Z_]+)*$/),
    fields: Joi.string().pattern(/^[a-zA-Z_]+(,[a-zA-Z_]+)*$/)
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  search: Joi.object({
    search: Joi.string().trim().min(1).max(100),
    q: Joi.string().trim().min(1).max(100) // Alternative search parameter
  }),

  userFilters: Joi.object({
    role: Joi.string().valid('admin', 'agent', 'user'),
    isActive: Joi.boolean(),
    createdAfter: Joi.date().iso(),
    createdBefore: Joi.date().iso(),
    lastLoginAfter: Joi.date().iso(),
    lastLoginBefore: Joi.date().iso()
  }),

  articleFilters: Joi.object({
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other'),
    status: Joi.string().valid('draft', 'published', 'archived'),
    author: mongoIdSchema,
    tags: Joi.string().trim().min(1).max(100),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    publishedAfter: Joi.date().iso(),
    publishedBefore: Joi.date().iso()
  }),

  ticketFilters: Joi.object({
    status: Joi.string().valid('open', 'triaged', 'waiting_human', 'in_progress', 'waiting_customer', 'resolved', 'closed'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    category: Joi.string().valid('billing', 'technical', 'shipping', 'account', 'general', 'other'),
    assignedTo: mongoIdSchema,
    requester: mongoIdSchema,
    overdue: Joi.boolean(),
    autoResolved: Joi.boolean()
  }),

  auditFilters: Joi.object({
    action: Joi.string().trim().min(1).max(100),
    actor: mongoIdSchema,
    target: mongoIdSchema,
    severity: Joi.string().valid('info', 'warning', 'error', 'critical'),
    traceId: Joi.string().uuid()
  })
};

// File upload schemas
const fileSchemas = {
  image: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'image/webp').required(),
    size: Joi.number().max(5 * 1024 * 1024) // 5MB max
  }),

  document: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().valid(
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ).required(),
    size: Joi.number().max(10 * 1024 * 1024) // 10MB max
  }),

  attachment: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().max(25 * 1024 * 1024) // 25MB max
  })
};

// Audit and reporting schemas
const auditSchemas = {
  complianceReport: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    actions: Joi.array().items(Joi.string().trim().min(1).max(100)).max(50),
    userIds: Joi.array().items(mongoIdSchema).max(100),
    format: Joi.string().valid('json', 'csv').default('json'),
    includeDetails: Joi.boolean().default(true)
  }),

  exportData: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    format: Joi.string().valid('json', 'csv').default('json'),
    includeDetails: Joi.boolean().default(true)
  })
};

module.exports = {
  userSchemas,
  articleSchemas,
  ticketSchemas,
  querySchemas,
  fileSchemas,
  auditSchemas,
  mongoIdSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
  tagSchema
};
