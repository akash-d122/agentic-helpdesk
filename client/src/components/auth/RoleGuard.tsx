import React, { ReactNode } from 'react'

import { useAuth } from '@hooks/useAuth'
import { hasRole } from '@utils/helpers'
import type { UserRole } from '@types/index'

interface RoleGuardProps {
  children: ReactNode
  roles: UserRole[]
  fallback?: ReactNode
  requireAll?: boolean
}

/**
 * Component that conditionally renders children based on user roles
 */
export default function RoleGuard({
  children,
  roles,
  fallback = null,
  requireAll = false,
}: RoleGuardProps) {
  const { user, isAuthenticated } = useAuth()

  // If not authenticated, don't render anything
  if (!isAuthenticated || !user) {
    return <>{fallback}</>
  }

  // Check if user has required roles
  const userHasAccess = requireAll
    ? roles.every(role => hasRole(user, [role]))
    : hasRole(user, roles)

  if (!userHasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook for conditional rendering based on roles
 */
export function useRoleAccess(roles: UserRole[], requireAll = false) {
  const { user, isAuthenticated } = useAuth()

  const hasAccess = React.useMemo(() => {
    if (!isAuthenticated || !user) return false
    
    return requireAll
      ? roles.every(role => hasRole(user, [role]))
      : hasRole(user, roles)
  }, [user, isAuthenticated, roles, requireAll])

  return {
    hasAccess,
    user,
    isAuthenticated,
  }
}

/**
 * Higher-order component for role-based rendering
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  roles: UserRole[],
  options: { fallback?: ReactNode; requireAll?: boolean } = {}
) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard roles={roles} {...options}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}
