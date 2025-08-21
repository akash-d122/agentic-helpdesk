// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error'
  data?: T
  message?: string
  error?: {
    code: number
    message: string
    details?: any
    type?: string
  }
  pagination?: PaginationInfo
  timestamp: string
  traceId: string
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

// User Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: UserRole
  isActive: boolean
  emailVerified: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  statistics?: UserStatistics
}

export type UserRole = 'admin' | 'agent' | 'user'

export interface UserStatistics {
  tickets: Record<string, number>
  articles: Record<string, number>
}

// Authentication Types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
}

export interface AuthUser extends User {
  permissions?: string[]
}

// Article Types
export interface Article {
  id: string
  title: string
  content: string
  summary?: string
  category: ArticleCategory
  tags: string[]
  status: ArticleStatus
  author: User
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  helpfulnessRatio: number
  publishedAt?: string
  createdAt: string
  updatedAt: string
  lastModifiedBy?: string
  metadata: ArticleMetadata
  relatedArticles?: Article[]
}

export type ArticleCategory = 'billing' | 'technical' | 'shipping' | 'account' | 'general' | 'other'
export type ArticleStatus = 'draft' | 'published' | 'archived'

export interface ArticleMetadata {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime?: number
  language: string
}

// Ticket Types
export interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  tags: string[]
  requester: User
  assignedTo?: User
  assignedAt?: string
  conversation: TicketMessage[]
  sla: TicketSLA
  aiProcessing: TicketAIProcessing
  viewCount: number
  reopenCount: number
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
}

export type TicketCategory = 'billing' | 'technical' | 'shipping' | 'account' | 'general' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'triaged' | 'waiting_human' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'

export interface TicketMessage {
  id: string
  author: User
  authorType: 'user' | 'agent' | 'ai'
  message: string
  isInternal: boolean
  attachments?: TicketAttachment[]
  metadata: Record<string, any>
  createdAt: string
}

export interface TicketAttachment {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: string
}

export interface TicketSLA {
  responseTime: {
    target: number
    actual?: number
    breached: boolean
  }
  resolutionTime: {
    target: number
    actual?: number
    breached: boolean
  }
}

export interface TicketAIProcessing {
  processed: boolean
  confidence?: number
  suggestedCategory?: TicketCategory
  suggestedPriority?: TicketPriority
  citedArticles: string[]
  autoResolved: boolean
  processingTime?: number
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio'
  placeholder?: string
  required?: boolean
  validation?: ValidationRule[]
  options?: SelectOption[]
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern'
  value?: any
  message: string
}

// UI Component Types
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  error?: string | null
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

// Filter and Search Types
export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'text' | 'date' | 'boolean'
  options?: SelectOption[]
  placeholder?: string
}

export interface SearchFilters {
  [key: string]: any
}

// Error Types
export interface AppError extends Error {
  code?: string
  status?: number
  details?: any
}

// Route Types
export interface RouteConfig {
  path: string
  element: React.ComponentType
  protected?: boolean
  roles?: UserRole[]
  exact?: boolean
}

// Theme Types
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
  }
  fonts: {
    sans: string
    mono: string
  }
  spacing: Record<string, string>
}
