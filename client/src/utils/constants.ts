// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// Authentication
export const TOKEN_STORAGE_KEY = 'auth_tokens'
export const USER_STORAGE_KEY = 'auth_user'
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes before expiry

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKENS: 'smart_helpdesk_auth_tokens',
  USER_DATA: 'smart_helpdesk_user_data',
  THEME: 'smart_helpdesk_theme',
  SIDEBAR_COLLAPSED: 'smart_helpdesk_sidebar_collapsed',
  TABLE_PREFERENCES: 'smart_helpdesk_table_preferences',
} as const

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  USER: 'user',
} as const

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.AGENT]: 'Agent',
  [USER_ROLES.USER]: 'User',
} as const

// Ticket Configuration
export const TICKET_CATEGORIES = {
  BILLING: 'billing',
  TECHNICAL: 'technical',
  SHIPPING: 'shipping',
  ACCOUNT: 'account',
  GENERAL: 'general',
  OTHER: 'other',
} as const

export const TICKET_CATEGORY_LABELS = {
  [TICKET_CATEGORIES.BILLING]: 'Billing',
  [TICKET_CATEGORIES.TECHNICAL]: 'Technical',
  [TICKET_CATEGORIES.SHIPPING]: 'Shipping',
  [TICKET_CATEGORIES.ACCOUNT]: 'Account',
  [TICKET_CATEGORIES.GENERAL]: 'General',
  [TICKET_CATEGORIES.OTHER]: 'Other',
} as const

export const TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

export const TICKET_PRIORITY_LABELS = {
  [TICKET_PRIORITIES.LOW]: 'Low',
  [TICKET_PRIORITIES.MEDIUM]: 'Medium',
  [TICKET_PRIORITIES.HIGH]: 'High',
  [TICKET_PRIORITIES.URGENT]: 'Urgent',
} as const

export const TICKET_STATUSES = {
  OPEN: 'open',
  TRIAGED: 'triaged',
  WAITING_HUMAN: 'waiting_human',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const

export const TICKET_STATUS_LABELS = {
  [TICKET_STATUSES.OPEN]: 'Open',
  [TICKET_STATUSES.TRIAGED]: 'Triaged',
  [TICKET_STATUSES.WAITING_HUMAN]: 'Waiting for Human',
  [TICKET_STATUSES.IN_PROGRESS]: 'In Progress',
  [TICKET_STATUSES.WAITING_CUSTOMER]: 'Waiting for Customer',
  [TICKET_STATUSES.RESOLVED]: 'Resolved',
  [TICKET_STATUSES.CLOSED]: 'Closed',
} as const

// Article Configuration
export const ARTICLE_CATEGORIES = TICKET_CATEGORIES
export const ARTICLE_CATEGORY_LABELS = TICKET_CATEGORY_LABELS

export const ARTICLE_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export const ARTICLE_STATUS_LABELS = {
  [ARTICLE_STATUSES.DRAFT]: 'Draft',
  [ARTICLE_STATUSES.PUBLISHED]: 'Published',
  [ARTICLE_STATUSES.ARCHIVED]: 'Archived',
} as const

export const ARTICLE_DIFFICULTIES = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const

export const ARTICLE_DIFFICULTY_LABELS = {
  [ARTICLE_DIFFICULTIES.BEGINNER]: 'Beginner',
  [ARTICLE_DIFFICULTIES.INTERMEDIATE]: 'Intermediate',
  [ARTICLE_DIFFICULTIES.ADVANCED]: 'Advanced',
} as const

// Pagination
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// File Upload
export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

// Validation
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
  NAME: /^[a-zA-Z\s'-]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
} as const

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PASSWORD: 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
  PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
  NAME: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  PHONE: 'Please enter a valid phone number',
  FILE_SIZE: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  FILE_TYPE: 'File type is not supported',
} as const

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  WITH_TIME: 'MMM d, yyyy h:mm a',
  TIME_ONLY: 'h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const

// Theme Colors (matching Tailwind config)
export const THEME_COLORS = {
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  SUCCESS: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  WARNING: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  ERROR: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
} as const

// Status Colors
export const STATUS_COLORS = {
  [TICKET_STATUSES.OPEN]: 'bg-secondary-100 text-secondary-800',
  [TICKET_STATUSES.TRIAGED]: 'bg-primary-100 text-primary-800',
  [TICKET_STATUSES.WAITING_HUMAN]: 'bg-warning-100 text-warning-800',
  [TICKET_STATUSES.IN_PROGRESS]: 'bg-primary-100 text-primary-800',
  [TICKET_STATUSES.WAITING_CUSTOMER]: 'bg-warning-100 text-warning-800',
  [TICKET_STATUSES.RESOLVED]: 'bg-success-100 text-success-800',
  [TICKET_STATUSES.CLOSED]: 'bg-secondary-100 text-secondary-800',
} as const

export const PRIORITY_COLORS = {
  [TICKET_PRIORITIES.LOW]: 'bg-secondary-100 text-secondary-800',
  [TICKET_PRIORITIES.MEDIUM]: 'bg-primary-100 text-primary-800',
  [TICKET_PRIORITIES.HIGH]: 'bg-warning-100 text-warning-800',
  [TICKET_PRIORITIES.URGENT]: 'bg-error-100 text-error-800',
} as const

// Navigation
export const NAVIGATION_ITEMS = {
  DASHBOARD: { path: '/dashboard', label: 'Dashboard', roles: ['admin', 'agent', 'user'] },
  TICKETS: { path: '/tickets', label: 'Tickets', roles: ['admin', 'agent', 'user'] },
  ARTICLES: { path: '/articles', label: 'Knowledge Base', roles: ['admin', 'agent', 'user'] },
  USERS: { path: '/admin/users', label: 'Users', roles: ['admin'] },
  PROFILE: { path: '/profile', label: 'Profile', roles: ['admin', 'agent', 'user'] },
} as const
