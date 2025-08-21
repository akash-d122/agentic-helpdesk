import { useApiQuery, useApiMutationWithInvalidation } from './useApi'
import { articleService, type ArticleFilters } from '@services/articleService'
import type { Article } from '@types/index'

/**
 * Hook for fetching articles list
 */
export function useArticles(filters: ArticleFilters = {}) {
  return useApiQuery(
    ['articles', filters],
    () => articleService.getArticles(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching single article
 */
export function useArticle(id: string) {
  return useApiQuery(
    ['articles', id],
    () => articleService.getArticleById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

/**
 * Hook for fetching article statistics
 */
export function useArticleStatistics() {
  return useApiQuery(
    ['articles', 'statistics'],
    () => articleService.getArticleStatistics(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

/**
 * Hook for fetching article tags
 */
export function useArticleTags() {
  return useApiQuery(
    ['articles', 'tags'],
    () => articleService.getArticleTags(),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  )
}

/**
 * Hook for searching articles
 */
export function useSearchArticles(query: string, filters: ArticleFilters = {}) {
  return useApiQuery(
    ['articles', 'search', query, filters],
    () => articleService.searchArticles(query, filters),
    {
      enabled: query.length > 0,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )
}

/**
 * Hook for creating article
 */
export function useCreateArticle() {
  return useApiMutationWithInvalidation(
    (articleData: Partial<Article>) => articleService.createArticle(articleData),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for updating article
 */
export function useUpdateArticle() {
  return useApiMutationWithInvalidation(
    ({ id, articleData }: { id: string; articleData: Partial<Article> }) => 
      articleService.updateArticle(id, articleData),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for deleting article
 */
export function useDeleteArticle() {
  return useApiMutationWithInvalidation(
    (id: string) => articleService.deleteArticle(id),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for publishing article
 */
export function usePublishArticle() {
  return useApiMutationWithInvalidation(
    (id: string) => articleService.publishArticle(id),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for archiving article
 */
export function useArchiveArticle() {
  return useApiMutationWithInvalidation(
    (id: string) => articleService.archiveArticle(id),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for bulk article operations
 */
export function useBulkArticleOperation() {
  return useApiMutationWithInvalidation(
    ({ articleIds, operation, reason }: { 
      articleIds: string[]
      operation: 'publish' | 'archive' | 'delete'
      reason?: string 
    }) => articleService.bulkArticleOperation(articleIds, operation, reason),
    [['articles'], ['articles', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for rating article
 */
export function useRateArticle() {
  return useApiMutationWithInvalidation(
    ({ id, helpful }: { id: string; helpful: boolean }) => 
      articleService.rateArticle(id, helpful),
    [['articles']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}
