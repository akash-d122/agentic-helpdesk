import { useApiQuery, useApiMutationWithInvalidation } from './useApi'
import { ticketService, type TicketFilters } from '@services/ticketService'
import type { Ticket } from '@types/index'

/**
 * Hook for fetching tickets list
 */
export function useTickets(filters: TicketFilters = {}) {
  return useApiQuery(
    ['tickets', filters],
    () => ticketService.getTickets(filters),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching single ticket
 */
export function useTicket(id: string) {
  return useApiQuery(
    ['tickets', id],
    () => ticketService.getTicketById(id),
    {
      enabled: !!id,
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  )
}

/**
 * Hook for fetching ticket comments
 */
export function useTicketComments(id: string) {
  return useApiQuery(
    ['tickets', id, 'comments'],
    () => ticketService.getTicketComments(id),
    {
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds
    }
  )
}

/**
 * Hook for fetching ticket statistics
 */
export function useTicketStatistics() {
  return useApiQuery(
    ['tickets', 'statistics'],
    () => ticketService.getTicketStatistics(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for searching tickets
 */
export function useSearchTickets(query: string, filters: TicketFilters = {}) {
  return useApiQuery(
    ['tickets', 'search', query, filters],
    () => ticketService.searchTickets(query, filters),
    {
      enabled: query.length > 0,
      staleTime: 1 * 60 * 1000, // 1 minute
    }
  )
}

/**
 * Hook for creating ticket
 */
export function useCreateTicket() {
  return useApiMutationWithInvalidation(
    (ticketData: Partial<Ticket>) => ticketService.createTicket(ticketData),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for updating ticket
 */
export function useUpdateTicket() {
  return useApiMutationWithInvalidation(
    ({ id, ticketData }: { id: string; ticketData: Partial<Ticket> }) => 
      ticketService.updateTicket(id, ticketData),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for deleting ticket
 */
export function useDeleteTicket() {
  return useApiMutationWithInvalidation(
    (id: string) => ticketService.deleteTicket(id),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for assigning ticket
 */
export function useAssignTicket() {
  return useApiMutationWithInvalidation(
    ({ id, assigneeId }: { id: string; assigneeId: string }) => 
      ticketService.assignTicket(id, assigneeId),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for updating ticket status
 */
export function useUpdateTicketStatus() {
  return useApiMutationWithInvalidation(
    ({ id, status, reason }: { id: string; status: string; reason?: string }) => 
      ticketService.updateTicketStatus(id, status, reason),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for updating ticket priority
 */
export function useUpdateTicketPriority() {
  return useApiMutationWithInvalidation(
    ({ id, priority }: { id: string; priority: string }) => 
      ticketService.updateTicketPriority(id, priority),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for adding ticket comment
 */
export function useAddTicketComment() {
  return useApiMutationWithInvalidation(
    ({ id, content, isInternal, attachments }: { 
      id: string
      content: string
      isInternal?: boolean
      attachments?: File[]
    }) => ticketService.addTicketComment(id, content, isInternal, attachments),
    [['tickets'], ['tickets', 'comments']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for bulk ticket operations
 */
export function useBulkTicketOperation() {
  return useApiMutationWithInvalidation(
    ({ ticketIds, operation, data }: { 
      ticketIds: string[]
      operation: 'assign' | 'status' | 'priority' | 'delete'
      data: any
    }) => ticketService.bulkTicketOperation(ticketIds, operation, data),
    [['tickets'], ['tickets', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for uploading ticket attachments
 */
export function useUploadTicketAttachments() {
  return useApiMutationWithInvalidation(
    ({ ticketId, files }: { ticketId: string; files: File[] }) => 
      ticketService.uploadAttachments(ticketId, files),
    [['tickets']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}
