import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Shield, 
  Mail,
  MoreHorizontal,
  Download,
  Upload,
  Users,
  UserPlus,
  Activity,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import DataTable from '@components/ui/DataTable'
import Modal from '@components/ui/Modal'
import Dropdown from '@components/ui/Dropdown'
import Avatar from '@components/ui/Avatar'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import { formatRelativeTime } from '@utils/helpers'

interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'agent' | 'admin'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
  profile?: {
    phone?: string
    department?: string
    timezone?: string
  }
  stats?: {
    ticketsCreated: number
    ticketsResolved: number
    avgResponseTime: number
  }
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  usersByRole: {
    customer: number
    agent: number
    admin: number
  }
  recentActivity: Array<{
    type: string
    user: string
    timestamp: string
  }>
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  useEffect(() => {
    loadUsers()
    loadStats()
  }, [searchTerm, roleFilter, statusFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockUsers: User[] = [
        {
          _id: '1',
          email: 'john.doe@company.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'admin',
          isActive: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          profile: {
            phone: '+1-555-0123',
            department: 'IT',
            timezone: 'America/New_York'
          },
          stats: {
            ticketsCreated: 0,
            ticketsResolved: 156,
            avgResponseTime: 45
          }
        },
        {
          _id: '2',
          email: 'jane.smith@company.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'agent',
          isActive: true,
          lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          profile: {
            phone: '+1-555-0124',
            department: 'Support',
            timezone: 'America/Los_Angeles'
          },
          stats: {
            ticketsCreated: 5,
            ticketsResolved: 234,
            avgResponseTime: 32
          }
        },
        {
          _id: '3',
          email: 'customer@example.com',
          firstName: 'Alice',
          lastName: 'Johnson',
          role: 'customer',
          isActive: true,
          lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          stats: {
            ticketsCreated: 12,
            ticketsResolved: 0,
            avgResponseTime: 0
          }
        },
        {
          _id: '4',
          email: 'inactive@example.com',
          firstName: 'Bob',
          lastName: 'Wilson',
          role: 'customer',
          isActive: false,
          lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          stats: {
            ticketsCreated: 3,
            ticketsResolved: 0,
            avgResponseTime: 0
          }
        }
      ]
      
      // Apply filters
      let filteredUsers = mockUsers
      
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
          user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      if (roleFilter) {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter)
      }
      
      if (statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user =>
          statusFilter === 'active' ? user.isActive : !user.isActive
        )
      }
      
      setUsers(filteredUsers)
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - replace with actual API call
      const mockStats: UserStats = {
        totalUsers: 1247,
        activeUsers: 1156,
        newUsersThisMonth: 89,
        usersByRole: {
          customer: 1089,
          agent: 145,
          admin: 13
        },
        recentActivity: [
          {
            type: 'user_created',
            user: 'Alice Johnson',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            type: 'user_activated',
            user: 'Bob Wilson',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleCreateUser = () => {
    setEditingUser(null)
    setShowCreateModal(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setShowCreateModal(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      // API call to delete user
      setUsers(prev => prev.filter(user => user._id !== userId))
      toast.success('User deleted successfully')
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const updatedUser = { ...user, isActive: !user.isActive }
      setUsers(prev => prev.map(u => u._id === user._id ? updatedUser : u))
      toast.success(`User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleSendPasswordReset = async (user: User) => {
    try {
      // API call to send password reset
      toast.success(`Password reset email sent to ${user.email}`)
    } catch (error) {
      toast.error('Failed to send password reset email')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    try {
      switch (action) {
        case 'activate':
          setUsers(prev => prev.map(user =>
            selectedUsers.includes(user._id)
              ? { ...user, isActive: true }
              : user
          ))
          toast.success(`${selectedUsers.length} users activated`)
          break
        case 'deactivate':
          setUsers(prev => prev.map(user =>
            selectedUsers.includes(user._id)
              ? { ...user, isActive: false }
              : user
          ))
          toast.success(`${selectedUsers.length} users deactivated`)
          break
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users?`)) return
          setUsers(prev => prev.filter(user => !selectedUsers.includes(user._id)))
          toast.success(`${selectedUsers.length} users deleted`)
          break
      }
      setSelectedUsers([])
    } catch (error) {
      toast.error('Failed to perform bulk action')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error'
      case 'agent': return 'warning'
      case 'customer': return 'primary'
      default: return 'secondary'
    }
  }

  const columns = [
    {
      key: 'user',
      label: 'User',
      render: (user: User) => (
        <div className="flex items-center space-x-3">
          <Avatar
            name={`${user.firstName} ${user.lastName}`}
            size="sm"
          />
          <div>
            <div className="font-medium text-secondary-900">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-secondary-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (user: User) => (
        <Badge variant={getRoleBadgeColor(user.role) as any}>
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (user: User) => (
        <Badge variant={user.isActive ? 'success' : 'secondary'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (user: User) => (
        <span className="text-sm text-secondary-600">
          {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}
        </span>
      )
    },
    {
      key: 'stats',
      label: 'Activity',
      render: (user: User) => (
        <div className="text-sm text-secondary-600">
          {user.role === 'customer' ? (
            <span>{user.stats?.ticketsCreated || 0} tickets created</span>
          ) : user.role === 'agent' ? (
            <span>{user.stats?.ticketsResolved || 0} tickets resolved</span>
          ) : (
            <span>Admin user</span>
          )}
        </div>
      )
    },
    {
      key: 'created',
      label: 'Created',
      render: (user: User) => (
        <span className="text-sm text-secondary-500">
          {formatRelativeTime(user.createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (user: User) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" icon={<MoreHorizontal className="h-4 w-4" />} />
          }
          items={[
            {
              label: 'Edit',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEditUser(user)
            },
            {
              label: user.isActive ? 'Deactivate' : 'Activate',
              icon: user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />,
              onClick: () => handleToggleStatus(user)
            },
            {
              label: 'Send Password Reset',
              icon: <Mail className="h-4 w-4" />,
              onClick: () => handleSendPasswordReset(user)
            },
            { type: 'separator' },
            {
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDeleteUser(user._id),
              className: 'text-error-600'
            }
          ]}
        />
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">User Management</h1>
          <p className="text-sm text-secondary-500">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
          >
            Import
          </Button>
          <Button
            onClick={handleCreateUser}
            icon={<Plus className="h-4 w-4" />}
          >
            Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Users"
            value={stats.totalUsers.toString()}
            subtitle={`${stats.activeUsers} active`}
            icon={<Users className="h-6 w-6" />}
            color="primary"
          />
          
          <StatsCard
            title="New This Month"
            value={stats.newUsersThisMonth.toString()}
            subtitle="New registrations"
            icon={<UserPlus className="h-6 w-6" />}
            color="success"
          />
          
          <StatsCard
            title="Agents"
            value={stats.usersByRole.agent.toString()}
            subtitle="Support agents"
            icon={<Shield className="h-6 w-6" />}
            color="warning"
          />
          
          <StatsCard
            title="Customers"
            value={stats.usersByRole.customer.toString()}
            subtitle="Customer accounts"
            icon={<Activity className="h-6 w-6" />}
            color="secondary"
          />
        </StatsGrid>
      )}

      {/* Filters and Search */}
      <Card>
        <Card.Body>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="agent">Agent</option>
                <option value="customer">Customer</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-secondary-600">
                  {selectedUsers.length} selected
                </span>
                <Dropdown
                  trigger={
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  }
                  items={[
                    {
                      label: 'Activate',
                      icon: <UserCheck className="h-4 w-4" />,
                      onClick: () => handleBulkAction('activate')
                    },
                    {
                      label: 'Deactivate',
                      icon: <UserX className="h-4 w-4" />,
                      onClick: () => handleBulkAction('deactivate')
                    },
                    { type: 'separator' },
                    {
                      label: 'Delete',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => handleBulkAction('delete'),
                      className: 'text-error-600'
                    }
                  ]}
                />
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Users Table */}
      <Card>
        <DataTable
          data={users}
          columns={columns}
          loading={loading}
          selectable
          selectedRows={selectedUsers}
          onSelectionChange={setSelectedUsers}
          emptyMessage="No users found"
        />
      </Card>

      {/* Create/Edit User Modal */}
      {showCreateModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowCreateModal(false)
            setEditingUser(null)
          }}
          onSave={(user) => {
            if (editingUser) {
              setUsers(prev => prev.map(u => u._id === user._id ? user : u))
              toast.success('User updated successfully')
            } else {
              setUsers(prev => [user, ...prev])
              toast.success('User created successfully')
            }
            setShowCreateModal(false)
            setEditingUser(null)
          }}
        />
      )}
    </div>
  )
}

// User Modal Component
interface UserModalProps {
  user: User | null
  onClose: () => void
  onSave: (user: User) => void
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role || 'customer',
    isActive: user?.isActive ?? true,
    phone: user?.profile?.phone || '',
    department: user?.profile?.department || '',
    timezone: user?.profile?.timezone || 'America/New_York'
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!formData.email.trim() || !formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)
      
      const userData: User = {
        _id: user?._id || Date.now().toString(),
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role as any,
        isActive: formData.isActive,
        lastLogin: user?.lastLogin || null,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          phone: formData.phone,
          department: formData.department,
          timezone: formData.timezone
        },
        stats: user?.stats || {
          ticketsCreated: 0,
          ticketsResolved: 0,
          avgResponseTime: 0
        }
      }
      
      onSave(userData)
    } catch (error) {
      toast.error('Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={user ? 'Edit User' : 'Create New User'}
      size="lg"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="form-checkbox"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-secondary-700">
            Active user account
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
          >
            {user ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
