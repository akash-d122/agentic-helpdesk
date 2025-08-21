import { useMemo } from 'react'

import { useAuth } from '@hooks/useAuth'
import { hasRole, hasPermission } from '@utils/helpers'
import type { UserRole } from '@types/index'

/**
 * Hook for checking user permissions and roles
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth()

  const permissions = useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        // Authentication
        isAuthenticated: false,
        
        // Roles
        isAdmin: false,
        isAgent: false,
        isUser: false,
        
        // General permissions
        canViewDashboard: false,
        canViewTickets: false,
        canViewArticles: false,
        canViewUsers: false,
        canViewProfile: false,
        
        // Ticket permissions
        canCreateTickets: false,
        canEditTickets: false,
        canDeleteTickets: false,
        canAssignTickets: false,
        canCloseTickets: false,
        canViewAllTickets: false,
        
        // Article permissions
        canCreateArticles: false,
        canEditArticles: false,
        canDeleteArticles: false,
        canPublishArticles: false,
        canViewDraftArticles: false,
        
        // User management permissions
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canChangeUserRoles: false,
        canViewUserStatistics: false,
        
        // Admin permissions
        canAccessAdminPanel: false,
        canViewAuditLogs: false,
        canManageSystem: false,

        // AI permissions
        canViewAISuggestions: false,
        canReviewAISuggestions: false,
        canManageAI: false,
        canConfigureAI: false,
        canViewAIAnalytics: false,
        
        // Helper functions
        hasRole: (roles: UserRole[]) => false,
        hasPermission: (permission: string) => false,
      }
    }

    const isAdmin = user.role === 'admin'
    const isAgent = user.role === 'agent'
    const isUserRole = user.role === 'user'

    return {
      // Authentication
      isAuthenticated: true,
      
      // Roles
      isAdmin,
      isAgent,
      isUser: isUserRole,
      
      // General permissions
      canViewDashboard: true, // All authenticated users can view dashboard
      canViewTickets: true, // All authenticated users can view tickets
      canViewArticles: true, // All authenticated users can view articles
      canViewUsers: isAdmin || isAgent, // Only admins and agents can view user lists
      canViewProfile: true, // All authenticated users can view their profile
      
      // Ticket permissions
      canCreateTickets: true, // All authenticated users can create tickets
      canEditTickets: isAdmin || isAgent, // Only admins and agents can edit tickets
      canDeleteTickets: isAdmin, // Only admins can delete tickets
      canAssignTickets: isAdmin || isAgent, // Only admins and agents can assign tickets
      canCloseTickets: isAdmin || isAgent, // Only admins and agents can close tickets
      canViewAllTickets: isAdmin || isAgent, // Only admins and agents can view all tickets
      
      // Article permissions
      canCreateArticles: isAdmin || isAgent, // Only admins and agents can create articles
      canEditArticles: isAdmin || isAgent, // Only admins and agents can edit articles
      canDeleteArticles: isAdmin, // Only admins can delete articles
      canPublishArticles: isAdmin || isAgent, // Only admins and agents can publish articles
      canViewDraftArticles: isAdmin || isAgent, // Only admins and agents can view draft articles
      
      // User management permissions
      canCreateUsers: isAdmin, // Only admins can create users
      canEditUsers: isAdmin, // Only admins can edit users
      canDeleteUsers: isAdmin, // Only admins can delete users
      canChangeUserRoles: isAdmin, // Only admins can change user roles
      canViewUserStatistics: isAdmin, // Only admins can view user statistics
      
      // Admin permissions
      canAccessAdminPanel: isAdmin, // Only admins can access admin panel
      canViewAuditLogs: isAdmin, // Only admins can view audit logs
      canManageSystem: isAdmin, // Only admins can manage system settings

      // AI permissions
      canViewAISuggestions: isAdmin || isAgent, // Admins and agents can view AI suggestions
      canReviewAISuggestions: isAdmin || isAgent, // Admins and agents can review AI suggestions
      canManageAI: isAdmin, // Only admins can manage AI settings
      canConfigureAI: isAdmin, // Only admins can configure AI
      canViewAIAnalytics: isAdmin, // Only admins can view AI analytics

      // Helper functions
      hasRole: (roles: UserRole[]) => hasRole(user, roles),
      hasPermission: (permission: string) => hasPermission(user, permission),
    }
  }, [user, isAuthenticated])

  return permissions
}

/**
 * Hook for checking specific permissions
 */
export function useHasPermission(permission: string) {
  const { hasPermission } = usePermissions()
  return hasPermission(permission)
}

/**
 * Hook for checking specific roles
 */
export function useHasRole(roles: UserRole[]) {
  const { hasRole } = usePermissions()
  return hasRole(roles)
}

/**
 * Hook for checking if user is admin
 */
export function useIsAdmin() {
  const { isAdmin } = usePermissions()
  return isAdmin
}

/**
 * Hook for checking if user is agent
 */
export function useIsAgent() {
  const { isAgent } = usePermissions()
  return isAgent
}

/**
 * Hook for checking if user can perform ticket operations
 */
export function useTicketPermissions() {
  const permissions = usePermissions()
  
  return {
    canCreate: permissions.canCreateTickets,
    canEdit: permissions.canEditTickets,
    canDelete: permissions.canDeleteTickets,
    canAssign: permissions.canAssignTickets,
    canClose: permissions.canCloseTickets,
    canViewAll: permissions.canViewAllTickets,
  }
}

/**
 * Hook for checking if user can perform article operations
 */
export function useArticlePermissions() {
  const permissions = usePermissions()
  
  return {
    canCreate: permissions.canCreateArticles,
    canEdit: permissions.canEditArticles,
    canDelete: permissions.canDeleteArticles,
    canPublish: permissions.canPublishArticles,
    canViewDrafts: permissions.canViewDraftArticles,
  }
}

/**
 * Hook for checking if user can perform user management operations
 */
export function useUserManagementPermissions() {
  const permissions = usePermissions()

  return {
    canCreate: permissions.canCreateUsers,
    canEdit: permissions.canEditUsers,
    canDelete: permissions.canDeleteUsers,
    canChangeRoles: permissions.canChangeUserRoles,
    canViewStatistics: permissions.canViewUserStatistics,
    canView: permissions.canViewUsers,
  }
}

/**
 * Hook for checking if user can perform AI operations
 */
export function useAIPermissions() {
  const permissions = usePermissions()

  return {
    canView: permissions.canViewAISuggestions,
    canReview: permissions.canReviewAISuggestions,
    canManage: permissions.canManageAI,
    canConfigure: permissions.canConfigureAI,
    canViewAnalytics: permissions.canViewAIAnalytics,
  }
}

export default usePermissions
