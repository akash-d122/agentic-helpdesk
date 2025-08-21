import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  UserCheck, 
  UserX,
  Trash2,
  MoreHorizontal,
  Users,
  Calendar,
  User,
  Shield,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'

import { useUsers, useBulkUserOperation, useDeleteUser, useToggleUserStatus, useChangeUserRole } from '@hooks/useUsers'
import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime, getInitials } from '@utils/helpers'
import type { User } from '@types/index'

import DataTable from '@components/ui/DataTable'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import SearchBar from '@components/ui/SearchBar'
import { ConfirmModal } from '@components/ui/Modal'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'

const USER_ROLE_LABELS = {
  admin: 'Administrator',
  agent: 'Agent',
  user: 'User',
} as const

const USER_ROLE_COLORS = {
  admin: 'error',
  agent: 'warning',
  user: 'primary',
} as const

export default function UsersList() {
  const permissions = usePermissions()
  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    search: '',
    role: '',
    isActive: '',
  })
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  // API hooks
  const { data: usersData, isLoading, error } = useUsers(filters)
  const deleteUserMutation = useDeleteUser()
  const toggleStatusMutation = useToggleUserStatus()
  const changeRoleMutation = useChangeUserRole()
  const bulkOperationMutation = useBulkUserOperation()

  const users = usersData?.users || []
  const pagination = usersData?.pagination

  // Search filters configuration
  const searchFilters = [
    {
      key: 'role',
      label: 'Role',
      type: 'select' as const,
      options: Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: 'isActive',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ]

  // Table columns
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600">
                {getInitials(user.firstName, user.lastName)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/admin/users/${user.id}`}
                className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
              >
                {user.firstName} {user.lastName}
              </Link>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-3 w-3 text-secondary-400" />
                <span className="text-xs text-secondary-500 truncate">
                  {user.email}
                </span>
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue('role') as keyof typeof USER_ROLE_LABELS
        return (
          <Badge variant={USER_ROLE_COLORS[role] || 'secondary'}>
            <Shield className="h-3 w-3 mr-1" />
            {USER_ROLE_LABELS[role] || role}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return (
          <Badge variant={isActive ? 'success' : 'secondary'}>
            {isActive ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'emailVerified',
      header: 'Email Verified',
      cell: ({ row }) => {
        const verified = row.getValue('emailVerified') as boolean
        return (
          <div className="flex items-center space-x-1">
            {verified ? (
              <CheckCircle className="h-4 w-4 text-success-500" />
            ) : (
              <XCircle className="h-4 w-4 text-error-500" />
            )}
            <span className="text-sm text-secondary-700">
              {verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => {
        const lastLogin = row.getValue('lastLogin') as string | null
        if (!lastLogin) {
          return (
            <span className="text-sm text-secondary-500 italic">Never</span>
          )
        }
        return (
          <div className="flex items-center space-x-1">
            <Clock className="h-4 w-4 text-secondary-400" />
            <span className="text-sm text-secondary-700">
              {formatRelativeTime(lastLogin)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => {
        const createdAt = row.getValue('createdAt') as string
        return (
          <div className="text-sm text-secondary-500">
            {formatDate(createdAt)}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <UserActions
            user={user}
            onDelete={() => handleDeleteClick(user.id)}
            onToggleStatus={() => toggleStatusMutation.mutate({ 
              id: user.id, 
              isActive: !user.isActive 
            })}
            onChangeRole={(role) => changeRoleMutation.mutate({ 
              id: user.id, 
              role 
            })}
          />
        )
      },
    },
  ], [toggleStatusMutation, changeRoleMutation])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 0 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }))
  }

  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    }))
  }

  const handleSelectionChange = (selection: Record<string, boolean>) => {
    const selectedIds = Object.keys(selection).filter(id => selection[id])
    setSelectedUsers(selectedIds)
  }

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete)
      setUserToDelete(null)
    }
  }

  const handleBulkOperation = (operation: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length > 0) {
      bulkOperationMutation.mutate({
        userIds: selectedUsers,
        operation,
      })
      setSelectedUsers([])
    }
  }

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Export users with filters:', filters)
  }

  // Statistics
  const stats = useMemo(() => {
    const active = users.filter(u => u.isActive).length
    const inactive = users.filter(u => !u.isActive).length
    const admins = users.filter(u => u.role === 'admin').length
    const agents = users.filter(u => u.role === 'agent').length

    return [
      {
        title: 'Total Users',
        value: users.length,
        icon: <Users className="h-6 w-6" />,
        color: 'primary' as const,
      },
      {
        title: 'Active',
        value: active,
        icon: <CheckCircle className="h-6 w-6" />,
        color: 'success' as const,
      },
      {
        title: 'Admins',
        value: admins,
        icon: <Shield className="h-6 w-6" />,
        color: 'error' as const,
      },
      {
        title: 'Agents',
        value: agents,
        icon: <UserCheck className="h-6 w-6" />,
        color: 'warning' as const,
      },
    ]
  }, [users])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            User Management
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Manage user accounts, roles, and permissions across the system.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {permissions.canCreateUsers && (
            <Button
              as={Link}
              to="/admin/users/new"
              icon={<Plus className="h-4 w-4" />}
            >
              New User
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <StatsGrid columns={4}>
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </StatsGrid>

      {/* Search and Filters */}
      <SearchBar
        placeholder="Search users..."
        onSearch={handleSearch}
        showFilters={true}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && permissions.canEditUsers && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-700">
              {selectedUsers.length} user(s) selected
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkOperation('activate')}
              >
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkOperation('deactivate')}
              >
                Deactivate
              </Button>
              {permissions.canDeleteUsers && (
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleBulkOperation('delete')}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        error={error}
        selectable={permissions.canEditUsers}
        exportable={true}
        pagination={pagination ? {
          pageIndex: filters.page,
          pageSize: filters.pageSize,
          pageCount: pagination.totalPages,
          total: pagination.totalItems,
        } : undefined}
        onPaginationChange={handlePaginationChange}
        onSelectionChange={handleSelectionChange}
        onExport={handleExport}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone and will remove all associated data."
        confirmText="Delete"
        variant="error"
      />
    </div>
  )
}

// User Actions Component
interface UserActionsProps {
  user: User
  onDelete: () => void
  onToggleStatus: () => void
  onChangeRole: (role: string) => void
}

function UserActions({ user, onDelete, onToggleStatus, onChangeRole }: UserActionsProps) {
  const permissions = usePermissions()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        icon={<MoreHorizontal className="h-4 w-4" />}
      />

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <Link
              to={`/admin/users/${user.id}`}
              className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              onClick={() => setShowMenu(false)}
            >
              <Eye className="mr-3 h-4 w-4" />
              View
            </Link>
            
            {permissions.canEditUsers && (
              <>
                <Link
                  to={`/admin/users/${user.id}/edit`}
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  onClick={() => setShowMenu(false)}
                >
                  <Edit className="mr-3 h-4 w-4" />
                  Edit
                </Link>

                <button
                  onClick={() => {
                    onToggleStatus()
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                  {user.isActive ? (
                    <>
                      <UserX className="mr-3 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-3 h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>

                {permissions.canChangeUserRoles && (
                  <div className="px-4 py-2">
                    <select
                      className="form-select text-xs w-full"
                      value={user.role}
                      onChange={(e) => {
                        if (e.target.value !== user.role) {
                          onChangeRole(e.target.value)
                          setShowMenu(false)
                        }
                      }}
                    >
                      {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {permissions.canDeleteUsers && (
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-error-700 hover:bg-error-50"
              >
                <Trash2 className="mr-3 h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
