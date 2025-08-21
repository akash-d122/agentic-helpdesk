import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@hooks/useAuth'
import { hasRole } from '@utils/helpers'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import UnauthorizedPage from '@pages/UnauthorizedPage'
import type { UserRole } from '@types/index'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: UserRole[]
  requireAuth?: boolean
  fallbackPath?: string
}

/**
 * Protected route component that handles authentication and authorization
 */
export default function ProtectedRoute({
  children,
  roles = [],
  requireAuth = true,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return path
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  // Check role-based authorization
  if (isAuthenticated && roles.length > 0 && !hasRole(user, roles)) {
    // User is authenticated but doesn't have required role
    return <UnauthorizedPage />
  }

  // User is authenticated and authorized
  return <>{children}</>
}

/**
 * Higher-order component for protecting routes
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

/**
 * Hook for checking route permissions
 */
export function useRoutePermissions(requiredRoles: UserRole[] = []) {
  const { user, isAuthenticated, isLoading } = useAuth()

  const canAccess = React.useMemo(() => {
    if (isLoading) return null
    if (!isAuthenticated) return false
    if (requiredRoles.length === 0) return true
    return hasRole(user, requiredRoles)
  }, [user, isAuthenticated, isLoading, requiredRoles])

  return {
    canAccess,
    isLoading,
    isAuthenticated,
    user,
  }
}
