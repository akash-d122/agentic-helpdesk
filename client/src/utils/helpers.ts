import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import { DATE_FORMATS, VALIDATION_RULES } from './constants'
import type { ApiResponse, User, UserRole } from '@types/index'

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date using date-fns
 */
export function formatDate(date: string | Date, formatStr: string = DATE_FORMATS.SHORT): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatStr)
  } catch (error) {
    console.warn('Invalid date format:', date)
    return 'Invalid date'
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { addSuffix: true })
  } catch (error) {
    console.warn('Invalid date format:', date)
    return 'Unknown time'
  }
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Generate initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

/**
 * Check if user has permission (for future use)
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false
  // For now, just check role-based permissions
  // This can be extended when backend implements granular permissions
  return true
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return VALIDATION_RULES.EMAIL.test(email)
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6 && VALIDATION_RULES.PASSWORD.test(password)
}

/**
 * Extract error message from API response or error object
 */
export function getErrorMessage(error: any): string {
  // Handle API response errors
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  
  // Handle validation errors
  if (error?.response?.data?.error?.details) {
    const details = error.response.data.error.details
    if (Array.isArray(details) && details.length > 0) {
      return details[0].message || details[0]
    }
  }
  
  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error') {
    return 'Network error. Please check your connection and try again.'
  }
  
  // Handle timeout errors
  if (error?.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.'
  }
  
  // Default error message
  return error?.message || 'An unexpected error occurred'
}

/**
 * Format API response for consistent handling
 */
export function formatApiResponse<T>(response: any): ApiResponse<T> {
  return {
    status: response.data?.status || 'success',
    data: response.data?.data,
    message: response.data?.message,
    error: response.data?.error,
    pagination: response.data?.pagination,
    timestamp: response.data?.timestamp || new Date().toISOString(),
    traceId: response.data?.traceId || '',
  }
}

/**
 * Create query string from object
 */
export function createQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  return searchParams.toString()
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString: string): Record<string, any> {
  const params = new URLSearchParams(queryString)
  const result: Record<string, any> = {}
  
  for (const [key, value] of params.entries()) {
    if (result[key]) {
      // Handle multiple values for same key
      if (Array.isArray(result[key])) {
        result[key].push(value)
      } else {
        result[key] = [result[key], value]
      }
    } else {
      result[key] = value
    }
  }
  
  return result
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Safe local storage operations
 */
export const storage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }
  },
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Download file from blob
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
