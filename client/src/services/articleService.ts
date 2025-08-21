import { apiService } from './api'
import { createQueryString } from '@utils/helpers'
import type { 
  ApiResponse, 
  Article, 
  PaginationInfo,
  SearchFilters 
} from '@types/index'

export interface ArticleFilters extends SearchFilters {
  status?: string
  category?: string
  author?: string
  tags?: string[]
  search?: string
  createdAfter?: string
  createdBefore?: string
  publishedAfter?: string
  publishedBefore?: string
}

export interface ArticleListResponse {
  articles: Article[]
  pagination: PaginationInfo
}

export interface ArticleStatistics {
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  archivedArticles: number
  articlesByCategory: Record<string, number>
  topViewedArticles: Article[]
  recentArticles: Article[]
}

export const articleService = {
  /**
   * Get list of articles with filtering and pagination
   */
  getArticles: async (filters: ArticleFilters = {}): Promise<ArticleListResponse> => {
    const queryString = createQueryString(filters)
    const response = await apiService.get<ArticleListResponse>(`/articles?${queryString}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch articles')
  },

  /**
   * Get article by ID
   */
  getArticleById: async (id: string): Promise<Article> => {
    const response = await apiService.get<Article>(`/articles/${id}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch article')
  },

  /**
   * Create new article
   */
  createArticle: async (articleData: Partial<Article>): Promise<Article> => {
    const response = await apiService.post<Article>('/articles', articleData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to create article')
  },

  /**
   * Update article
   */
  updateArticle: async (id: string, articleData: Partial<Article>): Promise<Article> => {
    const response = await apiService.put<Article>(`/articles/${id}`, articleData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update article')
  },

  /**
   * Delete article
   */
  deleteArticle: async (id: string): Promise<void> => {
    const response = await apiService.delete(`/articles/${id}`)
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to delete article')
    }
  },

  /**
   * Publish article
   */
  publishArticle: async (id: string): Promise<Article> => {
    const response = await apiService.patch<Article>(`/articles/${id}/publish`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to publish article')
  },

  /**
   * Archive article
   */
  archiveArticle: async (id: string): Promise<Article> => {
    const response = await apiService.patch<Article>(`/articles/${id}/archive`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to archive article')
  },

  /**
   * Search articles
   */
  searchArticles: async (query: string, filters: ArticleFilters = {}): Promise<Article[]> => {
    const searchParams = { ...filters, search: query }
    const queryString = createQueryString(searchParams)
    const response = await apiService.get<{ articles: Article[] }>(`/articles/search?${queryString}`)
    
    if (response.status === 'success' && response.data) {
      return response.data.articles
    }
    
    throw new Error(response.error?.message || 'Failed to search articles')
  },

  /**
   * Get article statistics
   */
  getArticleStatistics: async (): Promise<ArticleStatistics> => {
    const response = await apiService.get<ArticleStatistics>('/articles/statistics')
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch article statistics')
  },

  /**
   * Bulk article operations
   */
  bulkArticleOperation: async (
    articleIds: string[], 
    operation: 'publish' | 'archive' | 'delete',
    reason?: string
  ): Promise<void> => {
    const response = await apiService.post('/articles/bulk', {
      articleIds,
      operation,
      reason,
    })
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to perform bulk operation')
    }
  },

  /**
   * Get article tags
   */
  getArticleTags: async (): Promise<string[]> => {
    const response = await apiService.get<{ tags: string[] }>('/articles/tags')
    
    if (response.status === 'success' && response.data) {
      return response.data.tags
    }
    
    throw new Error(response.error?.message || 'Failed to fetch article tags')
  },

  /**
   * Rate article helpfulness
   */
  rateArticle: async (id: string, helpful: boolean): Promise<Article> => {
    const response = await apiService.post<Article>(`/articles/${id}/rate`, { helpful })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to rate article')
  },

  /**
   * Export articles
   */
  exportArticles: async (filters: ArticleFilters = {}, format: 'json' | 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    const queryString = createQueryString({ ...filters, format })
    return await apiService.download(`/articles/export?${queryString}`)
  },
}
