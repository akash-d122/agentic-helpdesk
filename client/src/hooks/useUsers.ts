import { useApiQuery, useApiMutationWithInvalidation } from './useApi'
import { userService, type UserFilters } from '@services/userService'
import type { User } from '@types/index'

/**
 * Hook for fetching users list
 */
export function useUsers(filters: UserFilters = {}) {
  return useApiQuery(
    ['users', filters],
    () => userService.getUsers(filters),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      keepPreviousData: true,
    }
  )
}

/**
 * Hook for fetching single user
 */
export function useUser(id: string) {
  return useApiQuery(
    ['users', id],
    () => userService.getUserById(id),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

/**
 * Hook for fetching user statistics
 */
export function useUserStatistics() {
  return useApiQuery(
    ['users', 'statistics'],
    () => userService.getUserStatistics(),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )
}

/**
 * Hook for creating user
 */
export function useCreateUser() {
  return useApiMutationWithInvalidation(
    (userData: Partial<User>) => userService.createUser(userData),
    ['users'],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for updating user
 */
export function useUpdateUser() {
  return useApiMutationWithInvalidation(
    ({ id, userData }: { id: string; userData: Partial<User> }) => 
      userService.updateUser(id, userData),
    [['users'], ['users', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for deleting user
 */
export function useDeleteUser() {
  return useApiMutationWithInvalidation(
    (id: string) => userService.deleteUser(id),
    [['users'], ['users', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for changing user role
 */
export function useChangeUserRole() {
  return useApiMutationWithInvalidation(
    ({ id, role }: { id: string; role: string }) => 
      userService.changeUserRole(id, role),
    [['users'], ['users', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for toggling user status
 */
export function useToggleUserStatus() {
  return useApiMutationWithInvalidation(
    ({ id, isActive }: { id: string; isActive: boolean }) => 
      userService.toggleUserStatus(id, isActive),
    [['users'], ['users', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}

/**
 * Hook for bulk user operations
 */
export function useBulkUserOperation() {
  return useApiMutationWithInvalidation(
    ({ userIds, operation, reason }: { 
      userIds: string[]
      operation: 'activate' | 'deactivate' | 'delete'
      reason?: string 
    }) => userService.bulkUserOperation(userIds, operation, reason),
    [['users'], ['users', 'statistics']],
    {
      onSuccess: () => {
        // Could add success toast here if needed
      },
    }
  )
}
