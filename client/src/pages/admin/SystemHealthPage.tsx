import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Server, 
  Database, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Bell,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  MessageSquare
} from 'lucide-react'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import ProgressBar from '@components/ui/ProgressBar'
import { formatRelativeTime } from '@utils/helpers'

interface SystemMetrics {
  server: {
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    cpu: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
    loadAverage: number[]
  }
  database: {
    status: 'connected' | 'disconnected' | 'slow'
    connections: number
    maxConnections: number
    queryTime: number
    slowQueries: number
    size: number
  }
  redis: {
    status: 'connected' | 'disconnected'
    memory: number
    connections: number
    hitRate: number
    evictions: number
  }
  queues: {
    [key: string]: {
      active: number
      waiting: number
      completed: number
      failed: number
      paused: boolean
    }
  }
  ai: {
    status: 'operational' | 'degraded' | 'down'
    providers: {
      [key: string]: {
        status: 'up' | 'down'
        responseTime: number
        errorRate: number
        rateLimitRemaining: number
      }
    }
    processingQueue: number
    avgProcessingTime: number
  }
  api: {
    requestsPerMinute: number
    averageResponseTime: number
    errorRate: number
    activeConnections: number
  }
  websocket: {
    connections: number
    messagesPerSecond: number
    errors: number
  }
}

export default function SystemHealthPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    loadMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      
      // Mock data - in real implementation, this would fetch from monitoring API
      const mockMetrics: SystemMetrics = {
        server: {
          status: 'healthy',
          uptime: 86400 * 7, // 7 days
          cpu: 45.2,
          memory: {
            used: 2.1 * 1024 * 1024 * 1024, // 2.1GB
            total: 8 * 1024 * 1024 * 1024, // 8GB
            percentage: 26.25
          },
          disk: {
            used: 120 * 1024 * 1024 * 1024, // 120GB
            total: 500 * 1024 * 1024 * 1024, // 500GB
            percentage: 24
          },
          loadAverage: [1.2, 1.5, 1.8]
        },
        database: {
          status: 'connected',
          connections: 15,
          maxConnections: 100,
          queryTime: 12.5,
          slowQueries: 3,
          size: 2.5 * 1024 * 1024 * 1024 // 2.5GB
        },
        redis: {
          status: 'connected',
          memory: 256 * 1024 * 1024, // 256MB
          connections: 8,
          hitRate: 94.5,
          evictions: 0
        },
        queues: {
          'ai-processing': {
            active: 3,
            waiting: 12,
            completed: 1247,
            failed: 8,
            paused: false
          },
          'email-notifications': {
            active: 1,
            waiting: 5,
            completed: 892,
            failed: 2,
            paused: false
          }
        },
        ai: {
          status: 'operational',
          providers: {
            openai: {
              status: 'up',
              responseTime: 1250,
              errorRate: 0.5,
              rateLimitRemaining: 8500
            },
            local: {
              status: 'up',
              responseTime: 450,
              errorRate: 0.1,
              rateLimitRemaining: 10000
            }
          },
          processingQueue: 15,
          avgProcessingTime: 8.5
        },
        api: {
          requestsPerMinute: 145,
          averageResponseTime: 185,
          errorRate: 0.8,
          activeConnections: 23
        },
        websocket: {
          connections: 47,
          messagesPerSecond: 12.3,
          errors: 1
        }
      }
      
      setMetrics(mockMetrics)
      
      // Generate alerts based on metrics
      const newAlerts = []
      
      if (mockMetrics.server.cpu > 80) {
        newAlerts.push({
          id: 'cpu-high',
          type: 'warning',
          message: 'High CPU usage detected',
          value: `${mockMetrics.server.cpu}%`
        })
      }
      
      if (mockMetrics.database.slowQueries > 5) {
        newAlerts.push({
          id: 'slow-queries',
          type: 'warning',
          message: 'High number of slow database queries',
          value: mockMetrics.database.slowQueries
        })
      }
      
      setAlerts(newAlerts)
      
    } catch (error) {
      console.error('Failed to load system metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'operational':
      case 'up':
        return 'success'
      case 'warning':
      case 'slow':
      case 'degraded':
        return 'warning'
      case 'critical':
      case 'disconnected':
      case 'down':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">System Health</h1>
          <p className="text-sm text-secondary-500">
            Monitor system performance and health metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-secondary-700">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="form-checkbox"
            />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border border-secondary-300 rounded px-2 py-1 text-sm"
              disabled={!autoRefresh}
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
          </div>
          
          <Button
            onClick={loadMetrics}
            variant="outline"
            loading={loading}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
          
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${
                alert.type === 'warning' 
                  ? 'bg-warning-50 border-warning-200 text-warning-800'
                  : 'bg-error-50 border-error-200 text-error-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{alert.message}</span>
                <Badge variant="outline">{alert.value}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Server Status"
          value={metrics?.server.status || 'Unknown'}
          subtitle={`Uptime: ${formatUptime(metrics?.server.uptime || 0)}`}
          icon={<Server className="h-6 w-6" />}
          color={getStatusColor(metrics?.server.status || 'unknown') as any}
        />
        
        <StatsCard
          title="Database"
          value={metrics?.database.status || 'Unknown'}
          subtitle={`${metrics?.database.connections || 0} connections`}
          icon={<Database className="h-6 w-6" />}
          color={getStatusColor(metrics?.database.status || 'unknown') as any}
        />
        
        <StatsCard
          title="AI Services"
          value={metrics?.ai.status || 'Unknown'}
          subtitle={`${metrics?.ai.processingQueue || 0} in queue`}
          icon={<Zap className="h-6 w-6" />}
          color={getStatusColor(metrics?.ai.status || 'unknown') as any}
        />
        
        <StatsCard
          title="API Requests"
          value={`${metrics?.api.requestsPerMinute || 0}/min`}
          subtitle={`${metrics?.api.averageResponseTime || 0}ms avg`}
          icon={<Activity className="h-6 w-6" />}
          color="primary"
        />
      </StatsGrid>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Resources */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-secondary-700" />
              <h3 className="text-lg font-medium text-secondary-900">Server Resources</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-700">CPU Usage</span>
                <span className="text-sm text-secondary-900">{metrics?.server.cpu}%</span>
              </div>
              <ProgressBar
                value={metrics?.server.cpu || 0}
                max={100}
                color={metrics?.server.cpu && metrics.server.cpu > 80 ? 'error' : 'primary'}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-700">Memory Usage</span>
                <span className="text-sm text-secondary-900">
                  {formatBytes(metrics?.server.memory.used || 0)} / {formatBytes(metrics?.server.memory.total || 0)}
                </span>
              </div>
              <ProgressBar
                value={metrics?.server.memory.percentage || 0}
                max={100}
                color={metrics?.server.memory.percentage && metrics.server.memory.percentage > 80 ? 'warning' : 'success'}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-700">Disk Usage</span>
                <span className="text-sm text-secondary-900">
                  {formatBytes(metrics?.server.disk.used || 0)} / {formatBytes(metrics?.server.disk.total || 0)}
                </span>
              </div>
              <ProgressBar
                value={metrics?.server.disk.percentage || 0}
                max={100}
                color={metrics?.server.disk.percentage && metrics.server.disk.percentage > 90 ? 'error' : 'primary'}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.server.loadAverage[0].toFixed(2)}
                </div>
                <div className="text-xs text-secondary-500">1m load</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.server.loadAverage[1].toFixed(2)}
                </div>
                <div className="text-xs text-secondary-500">5m load</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.server.loadAverage[2].toFixed(2)}
                </div>
                <div className="text-xs text-secondary-500">15m load</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Database Metrics */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-secondary-700" />
              <h3 className="text-lg font-medium text-secondary-900">Database</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.database.connections}
                </div>
                <div className="text-sm text-secondary-500">Active Connections</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.database.queryTime}ms
                </div>
                <div className="text-sm text-secondary-500">Avg Query Time</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.database.slowQueries}
                </div>
                <div className="text-sm text-secondary-500">Slow Queries</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {formatBytes(metrics?.database.size || 0)}
                </div>
                <div className="text-sm text-secondary-500">Database Size</div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-secondary-700">Connection Pool</span>
                <span className="text-sm text-secondary-900">
                  {metrics?.database.connections} / {metrics?.database.maxConnections}
                </span>
              </div>
              <ProgressBar
                value={((metrics?.database.connections || 0) / (metrics?.database.maxConnections || 1)) * 100}
                max={100}
                color="primary"
              />
            </div>
          </Card.Body>
        </Card>

        {/* AI Services */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-secondary-700" />
              <h3 className="text-lg font-medium text-secondary-900">AI Services</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.ai.processingQueue}
                </div>
                <div className="text-sm text-secondary-500">Queue Size</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-secondary-900">
                  {metrics?.ai.avgProcessingTime}s
                </div>
                <div className="text-sm text-secondary-500">Avg Processing</div>
              </div>
            </div>
            
            <div className="space-y-3">
              {metrics?.ai.providers && Object.entries(metrics.ai.providers).map(([provider, data]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      data.status === 'up' ? 'bg-success-500' : 'bg-error-500'
                    }`} />
                    <span className="text-sm font-medium text-secondary-700 capitalize">
                      {provider}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-secondary-900">{data.responseTime}ms</div>
                    <div className="text-xs text-secondary-500">{data.errorRate}% errors</div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Queue Status */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-secondary-700" />
              <h3 className="text-lg font-medium text-secondary-900">Queue Status</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            {metrics?.queues && Object.entries(metrics.queues).map(([queueName, queueData]) => (
              <div key={queueName}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-secondary-700 capitalize">
                    {queueName.replace('-', ' ')}
                  </span>
                  {queueData.paused && (
                    <Badge variant="warning" size="sm">Paused</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-sm font-semibold text-primary-600">{queueData.active}</div>
                    <div className="text-xs text-secondary-500">Active</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-warning-600">{queueData.waiting}</div>
                    <div className="text-xs text-secondary-500">Waiting</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-success-600">{queueData.completed}</div>
                    <div className="text-xs text-secondary-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-error-600">{queueData.failed}</div>
                    <div className="text-xs text-secondary-500">Failed</div>
                  </div>
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>

      {/* Real-time Connections */}
      <Card>
        <Card.Header>
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-secondary-700" />
            <h3 className="text-lg font-medium text-secondary-900">Real-time Connections</h3>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {metrics?.api.activeConnections}
              </div>
              <div className="text-sm text-secondary-500">API Connections</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-success-600">
                {metrics?.websocket.connections}
              </div>
              <div className="text-sm text-secondary-500">WebSocket Connections</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary-600">
                {metrics?.websocket.messagesPerSecond.toFixed(1)}
              </div>
              <div className="text-sm text-secondary-500">Messages/sec</div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}
