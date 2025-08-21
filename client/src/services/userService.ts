import { apiService } from './api'
import { createQueryString } from '@utils/helpers'
import type { 
  ApiResponse, 
  User, 
  PaginationInfo,
  SearchFilters 
} from '@types/index'

export interface UserFilters extends SearchFilters {
  role?: string
  isActive?: boolean
  search?: string
  createdAfter?: string
  createdBefore?: string
  lastLoginAfter?: string
  lastLoginBefore?: string
}

export interface UserListResponse {
  users: User[]
  pagination: PaginationInfo
}

export interface UserStatistics {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  usersByRole: Record<string, number>
  recentRegistrations: number
  lastWeekLogins: number
}

export const userService = {
  /**
   * Get list of users with filtering and pagination
   */
  getUsers: async (filters: UserFilters = {}): Promise<UserListResponse> => {
    const queryString = createQueryString(filters)
    const response = await apiService.get<UserListResponse>(`/users?${queryString}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch users')
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: string): Promise<User> => {
    const response = await apiService.get<User>(`/users/${id}`)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch user')
  },

  /**
   * Create new user
   */
  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await apiService.post<User>('/users', userData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to create user')
  },

  /**
   * Update user
   */
  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await apiService.put<User>(`/users/${id}`, userData)
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update user')
  },

  /**
   * Delete user
   */
  deleteUser: async (id: string): Promise<void> => {
    const response = await apiService.delete(`/users/${id}`)
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to delete user')
    }
  },

  /**
   * Change user role
   */
  changeUserRole: async (id: string, role: string): Promise<User> => {
    const response = await apiService.patch<User>(`/users/${id}/role`, { role })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to change user role')
  },

  /**
   * Activate/deactivate user
   */
  toggleUserStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await apiService.patch<User>(`/users/${id}/status`, { isActive })
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update user status')
  },

  /**
   * Get user statistics
   */
  getUserStatistics: async (): Promise<UserStatistics> => {
    const response = await apiService.get<UserStatistics>('/users/statistics')
    
    if (response.status === 'success' && response.data) {
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to fetch user statistics')
  },

  /**
   * Bulk user operations
   */
  bulkUserOperation: async (
    userIds: string[], 
    operation: 'activate' | 'deactivate' | 'delete',
    reason?: string
  ): Promise<void> => {
    const response = await apiService.post('/users/bulk', {
      userIds,
      operation,
      reason,
    })
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to perform bulk operation')
    }
  },

  /**
   * Export users data
   */
  exportUsers: async (filters: UserFilters = {}, format: 'json' | 'csv' = 'csv'): Promise<Blob> => {
    const queryString = createQueryString({ ...filters, format })
    return await apiService.download(`/users/export?${queryString}`)
  },
}
