import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

import { authService } from '@services/authService'
import type { AuthUser, LoginCredentials, RegisterData } from '@types/index'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (userData: Partial<AuthUser>) => Promise<void>
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Check if user is authenticated
  const isAuthenticated = !!user

  // Initialize authentication state
  useEffect(() => {
    initializeAuth()
  }, [])

  // Handle route protection
  useEffect(() => {
    if (!isLoading) {
      const isAuthRoute = ['/login', '/register'].includes(location.pathname)
      const isPublicRoute = isAuthRoute || location.pathname === '/'

      if (!isAuthenticated && !isPublicRoute) {
        // Redirect to login if not authenticated and trying to access protected route
        navigate('/login', { 
          replace: true,
          state: { from: location.pathname }
        })
      } else if (isAuthenticated && isAuthRoute) {
        // Redirect to dashboard if authenticated and trying to access auth routes
        const from = (location.state as any)?.from || '/dashboard'
        navigate(from, { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate])

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      setIsLoading(true)
      
      // Check if user is stored locally
      const storedUser = authService.getStoredUser()
      
      if (storedUser && authService.isAuthenticated()) {
        // Verify token with server
        const verifiedUser = await authService.verifyToken()
        
        if (verifiedUser) {
          setUser(verifiedUser)
        } else {
          // Token verification failed, clear auth data
          authService.clearAuth()
          setUser(null)
        }
      } else {
        // No stored user or not authenticated
        authService.clearAuth()
        setUser(null)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      authService.clearAuth()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Login user
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      
      const { user: loggedInUser } = await authService.login(credentials)
      setUser(loggedInUser)
      
      toast.success(`Welcome back, ${loggedInUser.firstName}!`)
      
      // Navigate to intended destination or dashboard
      const from = (location.state as any)?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (error: any) {
      console.error('Login failed:', error)
      throw error // Re-throw to let the component handle the error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Register new user
   */
  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true)
      
      const { user: newUser } = await authService.register(userData)
      setUser(newUser)
      
      toast.success(`Welcome to Smart Helpdesk, ${newUser.firstName}!`)
      
      // Navigate to dashboard
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      console.error('Registration failed:', error)
      throw error // Re-throw to let the component handle the error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      setIsLoading(true)
      
      await authService.logout()
      setUser(null)
      
      toast.success('Logged out successfully')
      
      // Navigate to login
      navigate('/login', { replace: true })
    } catch (error: any) {
      console.error('Logout failed:', error)
      // Still clear local state even if server logout fails
      setUser(null)
      navigate('/login', { replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (userData: Partial<AuthUser>) => {
    try {
      const updatedUser = await authService.updateProfile(userData)
      setUser(updatedUser)
      
      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Profile update failed:', error)
      throw error
    }
  }

  /**
   * Change password
   */
  const changePassword = async (passwordData: { 
    currentPassword: string
    newPassword: string 
  }) => {
    try {
      await authService.changePassword(passwordData)
      toast.success('Password changed successfully')
    } catch (error: any) {
      console.error('Password change failed:', error)
      throw error
    }
  }

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const updatedUser = await authService.getProfile()
      setUser(updatedUser)
    } catch (error: any) {
      console.error('Failed to refresh user data:', error)
      // If refresh fails, user might need to re-authenticate
      if (error.response?.status === 401) {
        setUser(null)
        authService.clearAuth()
        navigate('/login', { replace: true })
      }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default AuthContext
