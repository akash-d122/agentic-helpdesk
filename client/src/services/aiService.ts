/**
 * AI Service
 * Frontend service for interacting with AI agent APIs
 */

import { apiService } from './api'

export interface AIConfig {
  enabled: boolean
  autoResolveThreshold: number
  maxProcessingTime: number
  classification: {
    enabled: boolean
    engine: string
    confidenceThreshold: number
    fallbackToRules: boolean
  }
  knowledgeSearch: {
    enabled: boolean
    maxResults: number
    semanticSearchEnabled: boolean
    keywordFallback: boolean
    minSimilarityScore: number
  }
  responseGeneration: {
    enabled: boolean
    engine: string
    maxLength: number
    includeKnowledgeLinks: boolean
    personalizeResponse: boolean
  }
  openai: {
    enabled: boolean
    model: string
    maxTokens: number
    temperature: number
    rateLimitPerMinute: number
  }
  autoResolution: {
    enabled: boolean
    categories: string[]
    maxPriority: string
    requireKnowledgeMatch: boolean
    minConfidenceScore: number
  }
  learning: {
    enabled: boolean
    feedbackWeight: number
    adaptThresholds: boolean
    trackPerformance: boolean
  }
}

export interface AIHealth {
  service: string
  status: string
  engines: Record<string, any>
  queues: Record<string, any>
  config: any
}

export interface AISuggestion {
  _id: string
  ticketId: string
  traceId: string
  type: string
  status: string
  aiProvider: string
  classification: any
  knowledgeMatches: any[]
  suggestedResponse: any
  confidence: any
  autoResolve: boolean
  autoResolveReason?: string
  humanReview?: any
  processingTime?: number
  errors?: any[]
  createdAt: string
  updatedAt: string
}

export interface AIReview {
  decision: 'approve' | 'modify' | 'reject' | 'escalate'
  feedback?: {
    classificationAccuracy?: 'correct' | 'incorrect' | 'partial'
    knowledgeRelevance?: 'relevant' | 'irrelevant' | 'partial'
    responseQuality?: 'excellent' | 'good' | 'fair' | 'poor'
    overallSatisfaction?: number
    comments?: string
    improvements?: string[]
  }
  modifiedResponse?: string
  alternativeActions?: Array<{
    action: string
    reason: string
  }>
}

class AIService {
  /**
   * Get AI configuration
   */
  async getConfig(): Promise<AIConfig> {
    const response = await apiService.get('/ai/config')
    return response.data
  }

  /**
   * Update AI configuration
   */
  async updateConfig(config: Partial<AIConfig>): Promise<void> {
    await apiService.put('/ai/config', config)
  }

  /**
   * Get AI health status
   */
  async getHealth(): Promise<AIHealth> {
    const response = await apiService.get('/ai/health')
    return response.data
  }

  /**
   * Process a ticket through AI pipeline
   */
  async processTicket(ticketId: string, priority?: string): Promise<any> {
    const response = await apiService.post('/ai/process-ticket', {
      ticketId,
      priority
    })
    return response.data
  }

  /**
   * Get AI suggestions with filtering
   */
  async getSuggestions(filters: any = {}): Promise<{
    suggestions: AISuggestion[]
    pagination: any
  }> {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })

    const response = await apiService.get(`/ai/suggestions?${queryParams}`)
    return response.data
  }

  /**
   * Get a specific AI suggestion
   */
  async getSuggestion(id: string): Promise<AISuggestion> {
    const response = await apiService.get(`/ai/suggestions/${id}`)
    return response.data
  }

  /**
   * Submit human review for AI suggestion
   */
  async submitReview(suggestionId: string, review: AIReview): Promise<void> {
    await apiService.post(`/ai/suggestions/${suggestionId}/review`, review)
  }

  /**
   * Get suggestions pending human review
   */
  async getPendingReviews(limit?: number): Promise<AISuggestion[]> {
    const queryParams = limit ? `?limit=${limit}` : ''
    const response = await apiService.get(`/ai/suggestions/pending-review${queryParams}`)
    return response.data
  }

  /**
   * Get auto-resolve candidates
   */
  async getAutoResolveCandidates(limit?: number): Promise<AISuggestion[]> {
    const queryParams = limit ? `?limit=${limit}` : ''
    const response = await apiService.get(`/ai/suggestions/auto-resolve-candidates${queryParams}`)
    return response.data
  }

  /**
   * Get AI analytics
   */
  async getAnalytics(dateRange?: { startDate?: string; endDate?: string }): Promise<any> {
    const queryParams = new URLSearchParams()
    if (dateRange?.startDate) queryParams.append('startDate', dateRange.startDate)
    if (dateRange?.endDate) queryParams.append('endDate', dateRange.endDate)

    const response = await apiService.get(`/ai/analytics?${queryParams}`)
    return response.data
  }

  /**
   * Trigger knowledge base reindexing
   */
  async reindexKnowledge(): Promise<void> {
    await apiService.post('/ai/reindex-knowledge')
  }

  /**
   * Bulk operations on AI suggestions
   */
  async bulkOperation(
    suggestionIds: string[], 
    operation: 'approve' | 'reject' | 'escalate',
    data?: any
  ): Promise<void> {
    await apiService.post('/ai/suggestions/bulk', {
      suggestionIds,
      operation,
      data
    })
  }

  /**
   * Get AI suggestion statistics
   */
  async getSuggestionStats(): Promise<any> {
    const response = await apiService.get('/ai/suggestions/stats')
    return response.data
  }

  /**
   * Get AI processing status for a ticket
   */
  async getProcessingStatus(ticketId: string): Promise<any> {
    const response = await apiService.get(`/ai/processing-status/${ticketId}`)
    return response.data
  }

  /**
   * Get AI performance metrics
   */
  async getPerformanceMetrics(timeframe: string = '30d'): Promise<any> {
    const response = await apiService.get(`/ai/performance?timeframe=${timeframe}`)
    return response.data
  }

  /**
   * Get confidence calibration data
   */
  async getConfidenceCalibration(): Promise<any> {
    const response = await apiService.get('/ai/confidence/calibration')
    return response.data
  }

  /**
   * Submit feedback for AI learning
   */
  async submitFeedback(suggestionId: string, feedback: any): Promise<void> {
    await apiService.post(`/ai/suggestions/${suggestionId}/feedback`, feedback)
  }

  /**
   * Get AI training status
   */
  async getTrainingStatus(): Promise<any> {
    const response = await apiService.get('/ai/training/status')
    return response.data
  }

  /**
   * Trigger AI model retraining
   */
  async triggerRetraining(options?: any): Promise<void> {
    await apiService.post('/ai/training/retrain', options || {})
  }

  /**
   * Get AI queue status
   */
  async getQueueStatus(): Promise<any> {
    const response = await apiService.get('/ai/queues/status')
    return response.data
  }

  /**
   * Pause AI processing
   */
  async pauseProcessing(): Promise<void> {
    await apiService.post('/ai/processing/pause')
  }

  /**
   * Resume AI processing
   */
  async resumeProcessing(): Promise<void> {
    await apiService.post('/ai/processing/resume')
  }

  /**
   * Get AI error logs
   */
  async getErrorLogs(filters?: any): Promise<any> {
    const queryParams = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await apiService.get(`/ai/errors?${queryParams}`)
    return response.data
  }

  /**
   * Export AI data
   */
  async exportData(type: 'suggestions' | 'analytics' | 'config', filters?: any): Promise<Blob> {
    const queryParams = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await apiService.get(`/ai/export/${type}?${queryParams}`, {
      responseType: 'blob'
    })
    return response
  }

  /**
   * Test AI configuration
   */
  async testConfiguration(config?: Partial<AIConfig>): Promise<any> {
    const response = await apiService.post('/ai/test-config', config || {})
    return response.data
  }

  /**
   * Get AI usage statistics
   */
  async getUsageStats(period: string = '30d'): Promise<any> {
    const response = await apiService.get(`/ai/usage?period=${period}`)
    return response.data
  }

  /**
   * Get AI cost analysis
   */
  async getCostAnalysis(period: string = '30d'): Promise<any> {
    const response = await apiService.get(`/ai/costs?period=${period}`)
    return response.data
  }

  /**
   * Update AI learning preferences
   */
  async updateLearningPreferences(preferences: any): Promise<void> {
    await apiService.put('/ai/learning/preferences', preferences)
  }

  /**
   * Get AI model information
   */
  async getModelInfo(): Promise<any> {
    const response = await apiService.get('/ai/models/info')
    return response.data
  }

  /**
   * Validate AI setup
   */
  async validateSetup(): Promise<any> {
    const response = await apiService.post('/ai/validate-setup')
    return response.data
  }
}

export const aiService = new AIService()
