import React, { useState, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  User,
  Activity,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'

import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime } from '@utils/helpers'

import DataTable from '@components/ui/DataTable'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import SearchBar from '@components/ui/SearchBar'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
  }
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Mock data for demonstration
const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    action: 'user.login',
    entityType: 'user',
    entityId: 'user-123',
    userId: 'user-123',
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'admin',
    },
    details: { success: true },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    timestamp: new Date().toISOString(),
    severity: 'low',
  },
  {
    id: '2',
    action: 'ticket.created',
    entityType: 'ticket',
    entityId: 'ticket-456',
    userId: 'user-789',
    user: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      role: 'user',
    },
    details: { subject: 'Login issue', priority: 'high' },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0...',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: 'medium',
  },
  {
    id: '3',
    action: 'user.role_changed',
    entityType: 'user',
    entityId: 'user-456',
    userId: 'admin-123',
    user: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
    },
    details: { oldRole: 'user', newRole: 'agent' },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0...',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    severity: 'high',
  },
]

export default function AuditLogPage() {
  const permissions = usePermissions()
  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    search: '',
    action: '',
    entityType: '',
    severity: '',
    userId: '',
    startDate: '',
    endDate: '',
  })

  // Mock data - in real implementation, this would come from API
  const auditLogs = mockAuditLogs
  const isLoading = false
  const error = null

  // Search filters configuration
  const searchFilters = [
    {
      key: 'action',
      label: 'Action',
      type: 'select' as const,
      options: [
        { value: 'user.login', label: 'User Login' },
        { value: 'user.logout', label: 'User Logout' },
        { value: 'user.created', label: 'User Created' },
        { value: 'user.updated', label: 'User Updated' },
        { value: 'user.deleted', label: 'User Deleted' },
        { value: 'user.role_changed', label: 'Role Changed' },
        { value: 'ticket.created', label: 'Ticket Created' },
        { value: 'ticket.updated', label: 'Ticket Updated' },
        { value: 'ticket.deleted', label: 'Ticket Deleted' },
        { value: 'article.created', label: 'Article Created' },
        { value: 'article.updated', label: 'Article Updated' },
        { value: 'article.published', label: 'Article Published' },
      ],
    },
    {
      key: 'entityType',
      label: 'Entity Type',
      type: 'select' as const,
      options: [
        { value: 'user', label: 'User' },
        { value: 'ticket', label: 'Ticket' },
        { value: 'article', label: 'Article' },
        { value: 'system', label: 'System' },
      ],
    },
    {
      key: 'severity',
      label: 'Severity',
      type: 'select' as const,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ],
    },
    {
      key: 'startDate',
      label: 'Start Date',
      type: 'date' as const,
    },
    {
      key: 'endDate',
      label: 'End Date',
      type: 'date' as const,
    },
  ]

  // Table columns
  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(() => [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => {
        const timestamp = row.getValue('timestamp') as string
        return (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-secondary-400" />
            <div>
              <div className="text-sm font-medium text-secondary-900">
                {formatDate(timestamp, 'MMM d, yyyy')}
              </div>
              <div className="text-xs text-secondary-500">
                {formatDate(timestamp, 'h:mm:ss a')}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-secondary-400" />
            <div>
              <div className="text-sm font-medium text-secondary-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-secondary-500">{user.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        const actionLabels: Record<string, string> = {
          'user.login': 'User Login',
          'user.logout': 'User Logout',
          'user.created': 'User Created',
          'user.updated': 'User Updated',
          'user.deleted': 'User Deleted',
          'user.role_changed': 'Role Changed',
          'ticket.created': 'Ticket Created',
          'ticket.updated': 'Ticket Updated',
          'ticket.deleted': 'Ticket Deleted',
          'article.created': 'Article Created',
          'article.updated': 'Article Updated',
          'article.published': 'Article Published',
        }
        
        return (
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-primary-500" />
            <span className="text-sm text-secondary-900">
              {actionLabels[action] || action}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => {
        const entityType = row.getValue('entityType') as string
        const entityId = row.original.entityId
        
        return (
          <div className="text-sm">
            <div className="font-medium text-secondary-900 capitalize">
              {entityType}
            </div>
            <div className="text-xs text-secondary-500 font-mono">
              {entityId}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => {
        const severity = row.getValue('severity') as string
        const variants = {
          low: 'secondary',
          medium: 'primary',
          high: 'warning',
          critical: 'error',
        } as const
        
        return (
          <Badge variant={variants[severity as keyof typeof variants] || 'secondary'}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => {
        const ipAddress = row.getValue('ipAddress') as string
        return (
          <span className="text-sm font-mono text-secondary-700">
            {ipAddress}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const entry = row.original
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('View details:', entry)}
            icon={<Eye className="h-4 w-4" />}
          >
            Details
          </Button>
        )
      },
    },
  ], [])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 0 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }))
  }

  const handleExport = () => {
    console.log('Export audit logs with filters:', filters)
  }

  // Statistics
  const stats = useMemo(() => {
    const total = auditLogs.length
    const critical = auditLogs.filter(log => log.severity === 'critical').length
    const high = auditLogs.filter(log => log.severity === 'high').length
    const today = auditLogs.filter(log => 
      new Date(log.timestamp).toDateString() === new Date().toDateString()
    ).length

    return [
      {
        title: 'Total Events',
        value: total,
        icon: <Activity className="h-6 w-6" />,
        color: 'primary' as const,
      },
      {
        title: 'Today',
        value: today,
        icon: <Calendar className="h-6 w-6" />,
        color: 'secondary' as const,
      },
      {
        title: 'High Severity',
        value: high,
        icon: <AlertCircle className="h-6 w-6" />,
        color: 'warning' as const,
      },
      {
        title: 'Critical',
        value: critical,
        icon: <Shield className="h-6 w-6" />,
        color: 'error' as const,
      },
    ]
  }, [auditLogs])

  if (!permissions.canViewAuditLogs) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">Access Denied</h3>
        <p className="text-secondary-500">
          You don't have permission to view audit logs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Monitor system activity and track user actions for security and compliance.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
            variant="outline"
          >
            Export Logs
          </Button>
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
        placeholder="Search audit logs..."
        onSearch={handleSearch}
        showFilters={true}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Audit Logs Table */}
      <DataTable
        columns={columns}
        data={auditLogs}
        loading={isLoading}
        error={error}
        exportable={true}
        onExport={handleExport}
      />
    </div>
  )
}
