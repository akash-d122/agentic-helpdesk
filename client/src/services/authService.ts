import { apiService, tokenManager } from './api'
import { STORAGE_KEYS } from '@utils/constants'
import { storage } from '@utils/helpers'
import type { 
  ApiResponse, 
  AuthTokens, 
  AuthUser, 
  LoginCredentials, 
  RegisterData 
} from '@types/index'

export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> => {
    const response = await apiService.post<{ user: AuthUser; tokens: AuthTokens }>('/auth/login', credentials)
    
    if (response.status === 'success' && response.data) {
      // Store tokens and user data
      tokenManager.storeTokens(response.data.tokens)
      storage.set(STORAGE_KEYS.USER_DATA, response.data.user)
      
      return response.data
    }
    
    throw new Error(response.error?.message || 'Login failed')
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> => {
    const response = await apiService.post<{ user: AuthUser; tokens: AuthTokens }>('/auth/register', userData)
    
    if (response.status === 'success' && response.data) {
      // Store tokens and user data
      tokenManager.storeTokens(response.data.tokens)
      storage.set(STORAGE_KEYS.USER_DATA, response.data.user)
      
      return response.data
    }
    
    throw new Error(response.error?.message || 'Registration failed')
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    try {
      // Call logout endpoint to invalidate tokens on server
      await apiService.post('/auth/logout')
    } catch (error) {
      // Continue with client-side logout even if server call fails
      console.warn('Server logout failed:', error)
    } finally {
      // Clear client-side data
      tokenManager.clearTokens()
    }
  },

  /**
   * Verify current token and get user data
   */
  verifyToken: async (): Promise<AuthUser | null> => {
    try {
      const tokens = tokenManager.getTokens()
      
      if (!tokens?.accessToken) {
        return null
      }

      // Check if token is expired
      if (tokenManager.isTokenExpired(tokens.accessToken)) {
        try {
          // Try to refresh token
          await tokenManager.refreshToken()
        } catch (error) {
          // Refresh failed, clear tokens
          tokenManager.clearTokens()
          return null
        }
      }

      // Verify token with server
      const response = await apiService.get<AuthUser>('/auth/verify', {
        _skipErrorToast: true, // Don't show error toast for verification
      })
      
      if (response.status === 'success' && response.data) {
        // Update stored user data
        storage.set(STORAGE_KEYS.USER_DATA, response.data)
        return response.data
      }
      
      return null
    } catch (error) {
      // Token verification failed
      tokenManager.clearTokens()
      return null
    }
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<AuthUser> => {
    const response = await apiService.get<AuthUser>('/auth/profile')
    
    if (response.status === 'success' && response.data) {
      // Update stored user data
      storage.set(STORAGE_KEYS.USER_DATA, response.data)
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to get profile')
  },

  /**
   * Update user profile
   */
  updateProfile: async (userData: Partial<AuthUser>): Promise<AuthUser> => {
    const response = await apiService.put<AuthUser>('/auth/profile', userData)
    
    if (response.status === 'success' && response.data) {
      // Update stored user data
      storage.set(STORAGE_KEYS.USER_DATA, response.data)
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to update profile')
  },

  /**
   * Change password
   */
  changePassword: async (passwordData: {
    currentPassword: string
    newPassword: string
  }): Promise<void> => {
    const response = await apiService.put('/auth/change-password', passwordData)
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to change password')
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    const response = await apiService.post('/auth/forgot-password', { email })
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to request password reset')
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await apiService.post('/auth/reset-password', {
      token,
      newPassword,
    })
    
    if (response.status !== 'success') {
      throw new Error(response.error?.message || 'Failed to reset password')
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<AuthTokens> => {
    const tokens = tokenManager.getTokens()
    
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiService.post<AuthTokens>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    })
    
    if (response.status === 'success' && response.data) {
      tokenManager.storeTokens(response.data)
      return response.data
    }
    
    throw new Error(response.error?.message || 'Failed to refresh token')
  },

  /**
   * Get stored user data
   */
  getStoredUser: (): AuthUser | null => {
    return storage.get(STORAGE_KEYS.USER_DATA, null)
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const tokens = tokenManager.getTokens()
    const user = storage.get(STORAGE_KEYS.USER_DATA, null)
    
    return !!(tokens?.accessToken && user)
  },

  /**
   * Get stored tokens
   */
  getTokens: (): AuthTokens | null => {
    return tokenManager.getTokens()
  },

  /**
   * Clear all authentication data
   */
  clearAuth: (): void => {
    tokenManager.clearTokens()
  },
}
