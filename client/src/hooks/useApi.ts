import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

import { getErrorMessage } from '@utils/helpers'
import type { ApiResponse } from '@types/index'

/**
 * Generic hook for API queries with React Query
 */
export function useApiQuery<TData = any, TError = any>(
  queryKey: any[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  })
}

/**
 * Generic hook for API mutations with React Query
 */
export function useApiMutation<TData = any, TError = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onError: (error) => {
      const message = getErrorMessage(error)
      toast.error(message)
      options?.onError?.(error, {} as TVariables, undefined)
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

/**
 * Hook for mutations that invalidate queries on success
 */
export function useApiMutationWithInvalidation<TData = any, TError = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateQueries: string[] | string[][],
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient()

  return useApiMutation(mutationFn, {
    ...options,
    onSuccess: (data, variables, context) => {
      // Invalidate specified queries
      if (Array.isArray(invalidateQueries[0])) {
        // Multiple query keys
        (invalidateQueries as string[][]).forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey })
        })
      } else {
        // Single query key
        queryClient.invalidateQueries({ queryKey: invalidateQueries as string[] })
      }
      
      options?.onSuccess?.(data, variables, context)
    },
  })
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticMutation<TData = any, TError = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKey: string[],
  updateFn: (oldData: any, variables: TVariables) => any,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey)

      // Optimistically update
      queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables))

      // Return context with snapshot
      return { previousData }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      
      const message = getErrorMessage(error)
      toast.error(message)
      
      options?.onError?.(error, variables, context)
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey })
    },
    ...options,
  })
}

/**
 * Hook for paginated queries
 */
export function usePaginatedQuery<TData = any>(
  queryKey: any[],
  queryFn: (page: number, limit: number) => Promise<TData>,
  page: number = 1,
  limit: number = 10,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKey, page, limit],
    queryFn: () => queryFn(page, limit),
    keepPreviousData: true, // Keep previous data while fetching new page
    ...options,
  })
}

/**
 * Hook for infinite queries (load more pattern)
 */
export function useInfiniteApiQuery<TData = any>(
  queryKey: any[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<TData>,
  options?: any
) {
  return useQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => queryFn({ pageParam }),
    getNextPageParam: (lastPage: any) => {
      // Assuming API returns pagination info
      if (lastPage?.pagination?.hasNextPage) {
        return lastPage.pagination.nextPage
      }
      return undefined
    },
    ...options,
  })
}

/**
 * Hook for search queries with debouncing
 */
export function useSearchQuery<TData = any>(
  queryKey: any[],
  queryFn: (searchTerm: string) => Promise<TData>,
  searchTerm: string,
  debounceMs: number = 300,
  options?: Omit<UseQueryOptions<TData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKey, searchTerm],
    queryFn: () => queryFn(searchTerm),
    enabled: searchTerm.length > 0, // Only search when there's a term
    staleTime: debounceMs, // Debounce effect
    ...options,
  })
}

/**
 * Hook for prefetching data
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  const prefetchQuery = <TData = any>(
    queryKey: any[],
    queryFn: () => Promise<TData>,
    options?: any
  ) => {
    return queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options,
    })
  }

  return { prefetchQuery }
}

/**
 * Hook for manual cache updates
 */
export function useCacheUtils() {
  const queryClient = useQueryClient()

  const updateCache = <TData = any>(queryKey: any[], updateFn: (oldData: TData) => TData) => {
    queryClient.setQueryData(queryKey, updateFn)
  }

  const invalidateQueries = (queryKey: any[]) => {
    queryClient.invalidateQueries({ queryKey })
  }

  const removeQueries = (queryKey: any[]) => {
    queryClient.removeQueries({ queryKey })
  }

  const getQueryData = <TData = any>(queryKey: any[]): TData | undefined => {
    return queryClient.getQueryData(queryKey)
  }

  return {
    updateCache,
    invalidateQueries,
    removeQueries,
    getQueryData,
  }
}
