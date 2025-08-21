import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

import { API_BASE_URL, STORAGE_KEYS, TOKEN_REFRESH_THRESHOLD } from '@utils/constants'
import { getErrorMessage, storage } from '@utils/helpers'
import type { ApiResponse, AuthTokens } from '@types/index'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: any) => void
  reject: (reason: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

// Get stored tokens
const getStoredTokens = (): AuthTokens | null => {
  return storage.get(STORAGE_KEYS.AUTH_TOKENS, null)
}

// Store tokens
const storeTokens = (tokens: AuthTokens): void => {
  storage.set(STORAGE_KEYS.AUTH_TOKENS, tokens)
}

// Clear tokens
const clearTokens = (): void => {
  storage.remove(STORAGE_KEYS.AUTH_TOKENS)
  storage.remove(STORAGE_KEYS.USER_DATA)
}

// Check if token is expired or about to expire
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Date.now() / 1000
    return payload.exp < currentTime + TOKEN_REFRESH_THRESHOLD / 1000
  } catch {
    return true
  }
}

// Refresh token function
const refreshToken = async (): Promise<string | null> => {
  const tokens = getStoredTokens()
  
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available')
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: tokens.refreshToken,
    })
    
    const newTokens: AuthTokens = response.data.data
    storeTokens(newTokens)
    
    return newTokens.accessToken
  } catch (error) {
    clearTokens()
    // Redirect to login will be handled by the auth context
    throw error
  }
}

// Request interceptor
api.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    const tokens = getStoredTokens()
    
    if (tokens?.accessToken) {
      // Check if token needs refresh
      if (isTokenExpired(tokens.accessToken)) {
        if (!isRefreshing) {
          isRefreshing = true
          
          try {
            const newToken = await refreshToken()
            isRefreshing = false
            processQueue(null, newToken)
            
            if (newToken && config.headers) {
              config.headers.Authorization = `Bearer ${newToken}`
            }
          } catch (error) {
            isRefreshing = false
            processQueue(error, null)
            throw error
          }
        } else {
          // Wait for token refresh to complete
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          }).then((token) => {
            if (config.headers && token) {
              config.headers.Authorization = `Bearer ${token}`
            }
            return config
          })
        }
      } else if (config.headers) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`
      }
    }
    
    // Add trace ID for request correlation
    if (config.headers) {
      config.headers['X-Trace-ID'] = crypto.randomUUID()
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return api(originalRequest)
        })
      }
      
      try {
        isRefreshing = true
        const newToken = await refreshToken()
        isRefreshing = false
        processQueue(null, newToken)
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        isRefreshing = false
        processQueue(refreshError, null)
        clearTokens()
        
        // Don't show error toast for auth endpoints
        if (!originalRequest.url?.includes('/auth/')) {
          toast.error('Session expired. Please log in again.')
        }
        
        // Redirect to login will be handled by auth context
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other errors
    const errorMessage = getErrorMessage(error)
    
    // Don't show toast for certain errors
    const skipToast = 
      originalRequest.url?.includes('/auth/verify') || // Skip for token verification
      error.response?.status === 404 || // Skip for not found
      originalRequest._skipErrorToast // Skip if explicitly requested
    
    if (!skipToast) {
      toast.error(errorMessage)
    }
    
    return Promise.reject(error)
  }
)

// API service methods
export const apiService = {
  // Generic methods
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.get(url, config).then(response => response.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.post(url, data, config).then(response => response.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.put(url, data, config).then(response => response.data),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.patch(url, data, config).then(response => response.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.delete(url, config).then(response => response.data),
  
  // File upload
  upload: <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => 
    api.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    }).then(response => response.data),
  
  // Download file
  download: (url: string, config?: AxiosRequestConfig): Promise<Blob> => 
    api.get(url, {
      ...config,
      responseType: 'blob',
    }).then(response => response.data),
}

// Export token management functions
export const tokenManager = {
  getTokens: getStoredTokens,
  storeTokens,
  clearTokens,
  isTokenExpired,
  refreshToken,
}

export default api
