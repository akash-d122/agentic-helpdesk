import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Eye,
  MoreHorizontal,
  Clock,
  Database,
  Settings
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

interface AuditLog {
  _id: string
  action: string
  resourceType: string
  resourceId: string
  userId: string
  user: {
    firstName: string
    lastName: string
    email: string
    role: string
  }
  ipAddress: string
  userAgent: string
  details: {
    changes?: Record<string, { from: any; to: any }>
    metadata?: Record<string, any>
  }
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
}

interface AuditStats {
  totalLogs: number
  todayLogs: number
  criticalEvents: number
  uniqueUsers: number
  topActions: Array<{
    action: string
    count: number
  }>
  severityBreakdown: {
    low: number
    medium: number
    high: number
    critical: number
  }
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const actions = [
    'create', 'update', 'delete', 'login', 'logout', 'password_reset',
    'role_change', 'permission_change', 'export', 'import', 'backup', 'restore'
  ]

  const resourceTypes = [
    'User', 'Ticket', 'KnowledgeArticle', 'AISuggestion', 'System', 'Configuration'
  ]

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [searchTerm, actionFilter, resourceFilter, severityFilter, userFilter, dateRange])

  const loadLogs = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockLogs: AuditLog[] = [
        {
          _id: '1',
          action: 'login',
          resourceType: 'User',
          resourceId: 'user123',
          userId: 'user123',
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@company.com',
            role: 'admin'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: {
            metadata: {
              loginMethod: 'password',
              location: 'New York, NY'
            }
          },
          severity: 'low',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          action: 'update',
          resourceType: 'Ticket',
          resourceId: 'ticket456',
          userId: 'agent789',
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@company.com',
            role: 'agent'
          },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          details: {
            changes: {
              status: { from: 'open', to: 'resolved' },
              assignee: { from: null, to: 'agent789' }
            }
          },
          severity: 'medium',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          action: 'role_change',
          resourceType: 'User',
          resourceId: 'user456',
          userId: 'admin123',
          user: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@company.com',
            role: 'admin'
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: {
            changes: {
              role: { from: 'customer', to: 'agent' }
            },
            metadata: {
              reason: 'Promotion to support team'
            }
          },
          severity: 'high',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '4',
          action: 'delete',
          resourceType: 'KnowledgeArticle',
          resourceId: 'article789',
          userId: 'admin123',
          user: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@company.com',
            role: 'admin'
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: {
            metadata: {
              articleTitle: 'Outdated Installation Guide',
              reason: 'Content no longer relevant'
            }
          },
          severity: 'medium',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '5',
          action: 'export',
          resourceType: 'System',
          resourceId: 'system',
          userId: 'admin123',
          user: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@company.com',
            role: 'admin'
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          details: {
            metadata: {
              exportType: 'user_data',
              recordCount: 1247,
              format: 'CSV'
            }
          },
          severity: 'high',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      // Apply filters
      let filteredLogs = mockLogs
      
      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log =>
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.ipAddress.includes(searchTerm)
        )
      }
      
      if (actionFilter) {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter)
      }
      
      if (resourceFilter) {
        filteredLogs = filteredLogs.filter(log => log.resourceType === resourceFilter)
      }
      
      if (severityFilter) {
        filteredLogs = filteredLogs.filter(log => log.severity === severityFilter)
      }
      
      if (userFilter) {
        filteredLogs = filteredLogs.filter(log => 
          log.user.email.toLowerCase().includes(userFilter.toLowerCase())
        )
      }
      
      setLogs(filteredLogs)
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - replace with actual API call
      const mockStats: AuditStats = {
        totalLogs: 15847,
        todayLogs: 234,
        criticalEvents: 3,
        uniqueUsers: 89,
        topActions: [
          { action: 'login', count: 1247 },
          { action: 'update', count: 892 },
          { action: 'create', count: 567 },
          { action: 'delete', count: 123 }
        ],
        severityBreakdown: {
          low: 12456,
          medium: 2890,
          high: 456,
          critical: 45
        }
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleExport = async () => {
    try {
      // API call to export logs
      toast.success('Audit logs exported successfully')
    } catch (error) {
      toast.error('Failed to export audit logs')
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-error-500" />
      case 'high': return <XCircle className="h-4 w-4 text-warning-500" />
      case 'medium': return <Info className="h-4 w-4 text-primary-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-success-500" />
      default: return <Info className="h-4 w-4 text-secondary-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'primary'
      case 'low': return 'success'
      default: return 'secondary'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />
      case 'create':
      case 'update':
      case 'delete':
        return <Database className="h-4 w-4" />
      case 'role_change':
      case 'permission_change':
        return <Shield className="h-4 w-4" />
      case 'export':
      case 'import':
        return <Download className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const columns = [
    {
      key: 'timestamp',
      label: 'Time',
      render: (log: AuditLog) => (
        <div className="text-sm">
          <div className="font-medium text-secondary-900">
            {formatRelativeTime(log.timestamp)}
          </div>
          <div className="text-secondary-500">
            {new Date(log.timestamp).toLocaleString()}
          </div>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (log: AuditLog) => (
        <div className="flex items-center space-x-2">
          {getSeverityIcon(log.severity)}
          <Badge variant={getSeverityColor(log.severity) as any} size="sm">
            {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
          </Badge>
        </div>
      )
    },
    {
      key: 'action',
      label: 'Action',
      render: (log: AuditLog) => (
        <div className="flex items-center space-x-2">
          {getActionIcon(log.action)}
          <span className="font-medium text-secondary-900">
            {log.action.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      )
    },
    {
      key: 'user',
      label: 'User',
      render: (log: AuditLog) => (
        <div className="flex items-center space-x-2">
          <Avatar
            name={`${log.user.firstName} ${log.user.lastName}`}
            size="xs"
          />
          <div>
            <div className="text-sm font-medium text-secondary-900">
              {log.user.firstName} {log.user.lastName}
            </div>
            <div className="text-xs text-secondary-500">{log.user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (log: AuditLog) => (
        <div>
          <div className="text-sm font-medium text-secondary-900">{log.resourceType}</div>
          <div className="text-xs text-secondary-500 font-mono">{log.resourceId}</div>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (log: AuditLog) => (
        <div className="text-sm text-secondary-600">
          <div>{log.ipAddress}</div>
          <div className="text-xs text-secondary-500">
            {log.details.metadata?.location || 'Unknown'}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (log: AuditLog) => (
        <Button
          onClick={() => setSelectedLog(log)}
          variant="ghost"
          size="sm"
          icon={<Eye className="h-4 w-4" />}
        >
          View Details
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Audit Logs</h1>
          <p className="text-sm text-secondary-500">
            Monitor system activity and security events
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleExport}
            variant="outline"
            icon={<Download className="h-4 w-4" />}
          >
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Events"
            value={stats.totalLogs.toLocaleString()}
            subtitle="All time"
            icon={<Activity className="h-6 w-6" />}
            color="primary"
          />
          
          <StatsCard
            title="Today's Events"
            value={stats.todayLogs.toString()}
            subtitle="Last 24 hours"
            icon={<Clock className="h-6 w-6" />}
            color="success"
          />
          
          <StatsCard
            title="Critical Events"
            value={stats.criticalEvents.toString()}
            subtitle="Requiring attention"
            icon={<AlertTriangle className="h-6 w-6" />}
            color="error"
          />
          
          <StatsCard
            title="Active Users"
            value={stats.uniqueUsers.toString()}
            subtitle="Unique users today"
            icon={<User className="h-6 w-6" />}
            color="warning"
          />
        </StatsGrid>
      )}

      {/* Filters */}
      <Card>
        <Card.Body>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Actions</option>
                {actions.map(action => (
                  <option key={action} value={action}>
                    {action.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Resources</option>
                {resourceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Logs Table */}
      <Card>
        <DataTable
          data={logs}
          columns={columns}
          loading={loading}
          emptyMessage="No audit logs found"
        />
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Action
                </label>
                <div className="flex items-center space-x-2">
                  {getActionIcon(selectedLog.action)}
                  <span className="font-medium">
                    {selectedLog.action.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Severity
                </label>
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(selectedLog.severity)}
                  <Badge variant={getSeverityColor(selectedLog.severity) as any}>
                    {selectedLog.severity.charAt(0).toUpperCase() + selectedLog.severity.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* User and Resource Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  User
                </label>
                <div className="flex items-center space-x-2">
                  <Avatar
                    name={`${selectedLog.user.firstName} ${selectedLog.user.lastName}`}
                    size="sm"
                  />
                  <div>
                    <div className="font-medium">
                      {selectedLog.user.firstName} {selectedLog.user.lastName}
                    </div>
                    <div className="text-sm text-secondary-500">{selectedLog.user.email}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Resource
                </label>
                <div>
                  <div className="font-medium">{selectedLog.resourceType}</div>
                  <div className="text-sm text-secondary-500 font-mono">{selectedLog.resourceId}</div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  IP Address
                </label>
                <div className="font-mono text-sm">{selectedLog.ipAddress}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Timestamp
                </label>
                <div className="text-sm">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Changes */}
            {selectedLog.details.changes && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Changes Made
                </label>
                <div className="bg-secondary-50 rounded-lg p-4">
                  {Object.entries(selectedLog.details.changes).map(([field, change]) => (
                    <div key={field} className="mb-2 last:mb-0">
                      <div className="text-sm font-medium text-secondary-700">{field}:</div>
                      <div className="text-sm text-secondary-600 ml-4">
                        <span className="text-error-600">- {JSON.stringify(change.from)}</span>
                        <br />
                        <span className="text-success-600">+ {JSON.stringify(change.to)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {selectedLog.details.metadata && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Additional Information
                </label>
                <div className="bg-secondary-50 rounded-lg p-4">
                  <pre className="text-sm text-secondary-700 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* User Agent */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                User Agent
              </label>
              <div className="text-sm text-secondary-600 font-mono break-all">
                {selectedLog.userAgent}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-secondary-200">
              <Button
                onClick={() => setSelectedLog(null)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
