import { useApiQuery, useApiMutationWithInvalidation } from './useApi'
import { aiService } from '@services/aiService'

/**
 * Hook for fetching AI configuration
 */
export function useAIConfig() {
  return useApiQuery(
    ['ai', 'config'],
    () => aiService.getConfig(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for updating AI configuration
 */
export function useUpdateAIConfig() {
  return useApiMutationWithInvalidation(
    (config: any) => aiService.updateConfig(config),
    [['ai', 'config'], ['ai', 'health']],
    {
      onSuccess: () => {
        // Configuration updated successfully
      },
    }
  )
}

/**
 * Hook for fetching AI health status
 */
export function useAIHealth() {
  return useApiQuery(
    ['ai', 'health'],
    () => aiService.getHealth(),
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 60 * 1000, // Refresh every minute
    }
  )
}

/**
 * Hook for processing a ticket through AI
 */
export function useProcessTicket() {
  return useApiMutationWithInvalidation(
    ({ ticketId, priority }: { ticketId: string; priority?: string }) => 
      aiService.processTicket(ticketId, priority),
    [['ai', 'suggestions'], ['tickets']],
    {
      onSuccess: () => {
        // Ticket processing initiated
      },
    }
  )
}

/**
 * Hook for fetching AI suggestions
 */
export function useAISuggestions(filters: any = {}) {
  return useApiQuery(
    ['ai', 'suggestions', filters],
    () => aiService.getSuggestions(filters),
    {
      staleTime: 1 * 60 * 1000, // 1 minute
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching a specific AI suggestion
 */
export function useAISuggestion(id: string) {
  return useApiQuery(
    ['ai', 'suggestions', id],
    () => aiService.getSuggestion(id),
    {
      enabled: !!id,
      staleTime: 30 * 1000, // 30 seconds
    }
  )
}

/**
 * Hook for submitting human review of AI suggestion
 */
export function useSubmitAIReview() {
  return useApiMutationWithInvalidation(
    ({ suggestionId, review }: { suggestionId: string; review: any }) => 
      aiService.submitReview(suggestionId, review),
    [['ai', 'suggestions'], ['ai', 'analytics']],
    {
      onSuccess: () => {
        // Review submitted successfully
      },
    }
  )
}

/**
 * Hook for fetching pending AI reviews
 */
export function usePendingAIReviews(limit?: number) {
  return useApiQuery(
    ['ai', 'suggestions', 'pending-review', { limit }],
    () => aiService.getPendingReviews(limit),
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    }
  )
}

/**
 * Hook for fetching auto-resolve candidates
 */
export function useAutoResolveCandidates(limit?: number) {
  return useApiQuery(
    ['ai', 'suggestions', 'auto-resolve-candidates', { limit }],
    () => aiService.getAutoResolveCandidates(limit),
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    }
  )
}

/**
 * Hook for fetching AI analytics
 */
export function useAIAnalytics(dateRange?: { startDate?: string; endDate?: string }) {
  return useApiQuery(
    ['ai', 'analytics', dateRange],
    () => aiService.getAnalytics(dateRange),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )
}

/**
 * Hook for triggering knowledge base reindexing
 */
export function useReindexKnowledge() {
  return useApiMutationWithInvalidation(
    () => aiService.reindexKnowledge(),
    [['ai', 'health']],
    {
      onSuccess: () => {
        // Knowledge base reindexing initiated
      },
    }
  )
}

/**
 * Hook for bulk operations on AI suggestions
 */
export function useBulkAIOperation() {
  return useApiMutationWithInvalidation(
    ({ suggestionIds, operation, data }: { 
      suggestionIds: string[]
      operation: 'approve' | 'reject' | 'escalate'
      data?: any
    }) => aiService.bulkOperation(suggestionIds, operation, data),
    [['ai', 'suggestions'], ['ai', 'analytics']],
    {
      onSuccess: () => {
        // Bulk operation completed
      },
    }
  )
}

/**
 * Hook for getting AI suggestion statistics
 */
export function useAISuggestionStats() {
  return useApiQuery(
    ['ai', 'suggestions', 'stats'],
    () => aiService.getSuggestionStats(),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

/**
 * Hook for real-time AI processing status
 */
export function useAIProcessingStatus(ticketId: string) {
  return useApiQuery(
    ['ai', 'processing-status', ticketId],
    () => aiService.getProcessingStatus(ticketId),
    {
      enabled: !!ticketId,
      staleTime: 5 * 1000, // 5 seconds
      refetchInterval: 10 * 1000, // Refresh every 10 seconds
    }
  )
}

/**
 * Hook for AI performance metrics
 */
export function useAIPerformanceMetrics(timeframe: string = '30d') {
  return useApiQuery(
    ['ai', 'performance', timeframe],
    () => aiService.getPerformanceMetrics(timeframe),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

/**
 * Hook for AI confidence calibration data
 */
export function useAIConfidenceCalibration() {
  return useApiQuery(
    ['ai', 'confidence', 'calibration'],
    () => aiService.getConfidenceCalibration(),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  )
}

/**
 * Hook for submitting AI feedback for learning
 */
export function useSubmitAIFeedback() {
  return useApiMutationWithInvalidation(
    ({ suggestionId, feedback }: { suggestionId: string; feedback: any }) => 
      aiService.submitFeedback(suggestionId, feedback),
    [['ai', 'suggestions'], ['ai', 'performance']],
    {
      onSuccess: () => {
        // Feedback submitted for AI learning
      },
    }
  )
}

/**
 * Hook for AI model training status
 */
export function useAITrainingStatus() {
  return useApiQuery(
    ['ai', 'training', 'status'],
    () => aiService.getTrainingStatus(),
    {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    }
  )
}

/**
 * Hook for triggering AI model retraining
 */
export function useRetrain() {
  return useApiMutationWithInvalidation(
    (options?: any) => aiService.triggerRetraining(options),
    [['ai', 'training'], ['ai', 'performance']],
    {
      onSuccess: () => {
        // AI model retraining initiated
      },
    }
  )
}
