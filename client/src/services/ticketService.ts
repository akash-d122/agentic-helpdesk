import { apiService } from './api'
import { createQueryString } from '@utils/helpers'
import type { 
  ApiResponse, 
  Ticket, 
  PaginationInfo,
  SearchFilters 
} from '@types/index'

export interface TicketFilters extends SearchFilters {
  status?: string
  priority?: string
  category?: string
  assignee?: string
  requester?: string
  search?: string
  createdAfter?: string
  createdBefore?: string
  updatedAfter?: string
  updatedBefore?: string
}

export interface TicketListResponse {
  tickets: Ticket[]
  pagination: PaginationInfo
}

export interface TicketStatistics {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  ticketsByPriority: Record<string, number>
  ticketsByCategory: Record<string, number>
  averageResolutionTime: number
  slaBreaches: number
}

export interface TicketComment {
  id: string
  ticketId: string
  author: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  content: string
  isInternal: boolean
  attachments?: Array<{
    id: string
    name: string
    url: string
    size: number
    type: string
  }>
  createdAt: string
  updatedAt: string
}

export const ticketService = {
  /**
   * Get list of tickets with filtering and pagination
   */
  getTickets: async (filters: TicketFilters = {}): Promise<TicketListResponse> => {
    const queryString = createQueryString(filters)
    const response = await apiService.get<TicketListResponse>(`/tickets?${queryString}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch tickets')
  },

  /**
   * Get ticket by ID
   */
  getTicketById: async (id: string): Promise<Ticket> => {
    const response = await apiService.get<Ticket>(`/tickets/${id}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch ticket')
  },

  /**
   * Create new ticket
   */
  createTicket: async (ticketData: Partial<Ticket>): Promise<Ticket> => {
    const response = await apiService.post<Ticket>('/tickets', ticketData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to create ticket')
  },

  /**
   * Update ticket
   */
  updateTicket: async (id: string, ticketData: Partial<Ticket>): Promise<Ticket> => {
    const response = await apiService.put<Ticket>(`/tickets/${id}`, ticketData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update ticket')
  },

  /**
   * Delete ticket
   */
  deleteTicket: async (id: string): Promise<void> => {
    const response = await apiService.delete(`/tickets/${id}`)
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to delete ticket')
    }
  },

  /**
   * Assign ticket to agent
   */
  assignTicket: async (id: string, assigneeId: string): Promise<Ticket> => {
    const response = await apiService.patch<Ticket>(`/tickets/${id}/assign`, { assigneeId })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to assign ticket')
  },

  /**
   * Update ticket status
   */
  updateTicketStatus: async (id: string, status: string, reason?: string): Promise<Ticket> => {
    const response = await apiService.patch<Ticket>(`/tickets/${id}/status`, { status, reason })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update ticket status')
  },

  /**
   * Update ticket priority
   */
  updateTicketPriority: async (id: string, priority: string): Promise<Ticket> => {
    const response = await apiService.patch<Ticket>(`/tickets/${id}/priority`, { priority })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update ticket priority')
  },

  /**
   * Get ticket comments
   */
  getTicketComments: async (id: string): Promise<TicketComment[]> => {
    const response = await apiService.get<{ comments: TicketComment[] }>(`/tickets/${id}/comments`)
    
    if (response.status === 'success' && response.data) {
      return response.data.comments
    }
    
    throw new Error(response.error?.message || 'Failed to fetch ticket comments')
  },

  /**
   * Add comment to ticket
   */
  addTicketComment: async (
    id: string, 
    content: string, 
    isInternal: boolean = false,
    attachments?: File[]
  ): Promise<TicketComment> => {
    const formData = new FormData()
    formData.append('content', content)
    formData.append('isInternal', isInternal.toString())
    
    if (attachments) {
      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file)
      })
    }

    const response = await apiService.post<TicketComment>(`/tickets/${id}/comments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to add comment')
  },

  /**
   * Search tickets
   */
  searchTickets: async (query: string, filters: TicketFilters = {}): Promise<Ticket[]> => {
    const searchParams = { ...filters, search: query }
    const queryString = createQueryString(searchParams)
    const response = await apiService.get<{ tickets: Ticket[] }>(`/tickets/search?${queryString}`)
    
    if (response.status === 'success' && response.data) {
      return response.data.tickets
    }
    
    throw new Error(response.error?.message || 'Failed to search tickets')
  },

  /**
   * Get ticket statistics
   */
  getTicketStatistics: async (): Promise<TicketStatistics> => {
    const response = await apiService.get<TicketStatistics>('/tickets/statistics')
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch ticket statistics')
  },

  /**
   * Bulk ticket operations
   */
  bulkTicketOperation: async (
    ticketIds: string[], 
    operation: 'assign' | 'status' | 'priority' | 'delete',
    data: any
  ): Promise<void> => {
    const response = await apiService.post('/tickets/bulk', {
      ticketIds,
      operation,
      data,
    })
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to perform bulk operation')
    }
  },

  /**
   * Upload ticket attachments
   */
  uploadAttachments: async (ticketId: string, files: File[]): Promise<any[]> => {
    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file)
    })

    const response = await apiService.upload(`/tickets/${ticketId}/attachments`, formData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to upload attachments')
  },

  /**
   * Export tickets
   */
  exportTickets: async (filters: TicketFilters = {}, format: 'json' | 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    const queryString = createQueryString({ ...filters, format })
    return await apiService.download(`/tickets/export?${queryString}`)
  },
}
