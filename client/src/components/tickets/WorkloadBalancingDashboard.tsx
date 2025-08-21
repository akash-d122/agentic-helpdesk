import React, { useState, useMemo } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Settings,
  Filter,
  Download,
  Calendar,
  Target,
  Activity
} from 'lucide-react'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import ProgressBar from '@components/ui/ProgressBar'
import { formatRelativeTime } from '@utils/helpers'

interface WorkloadData {
  agentId: string
  agentName: string
  department: string
  role: string
  currentTickets: number
  maxCapacity: number
  avgResolutionTime: number
  customerSatisfaction: number
  isOnline: boolean
  lastActive: string
  todayAssigned: number
  todayResolved: number
  weeklyTrend: number
  skillUtilization: {
    skill: string
    utilization: number
  }[]
  upcomingDeadlines: number
  overdueTickets: number
}

interface WorkloadBalancingDashboardProps {
  workloadData: WorkloadData[]
  onRebalance: (fromAgentId: string, toAgentId: string, ticketCount: number) => Promise<void>
  onAutoBalance: () => Promise<void>
  onUpdateCapacity: (agentId: string, newCapacity: number) => Promise<void>
}

export default function WorkloadBalancingDashboard({
  workloadData,
  onRebalance,
  onAutoBalance,
  onUpdateCapacity
}: WorkloadBalancingDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('today')
  const [showRebalanceModal, setShowRebalanceModal] = useState(false)
  const [selectedAgents, setSelectedAgents] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [rebalanceCount, setRebalanceCount] = useState(1)
  const [autoBalancing, setAutoBalancing] = useState(false)

  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalAgents = workloadData.length
    const onlineAgents = workloadData.filter(agent => agent.isOnline).length
    const totalTickets = workloadData.reduce((sum, agent) => sum + agent.currentTickets, 0)
    const totalCapacity = workloadData.reduce((sum, agent) => sum + agent.maxCapacity, 0)
    const avgUtilization = totalCapacity > 0 ? (totalTickets / totalCapacity) * 100 : 0
    
    const overloadedAgents = workloadData.filter(agent => 
      (agent.currentTickets / agent.maxCapacity) > 0.9
    ).length
    
    const underutilizedAgents = workloadData.filter(agent => 
      (agent.currentTickets / agent.maxCapacity) < 0.5 && agent.isOnline
    ).length

    const avgSatisfaction = workloadData.reduce((sum, agent) => 
      sum + agent.customerSatisfaction, 0
    ) / totalAgents

    return {
      totalAgents,
      onlineAgents,
      totalTickets,
      avgUtilization,
      overloadedAgents,
      underutilizedAgents,
      avgSatisfaction
    }
  }, [workloadData])

  // Identify rebalancing opportunities
  const rebalanceOpportunities = useMemo(() => {
    const overloaded = workloadData.filter(agent => 
      (agent.currentTickets / agent.maxCapacity) > 0.85 && agent.isOnline
    ).sort((a, b) => (b.currentTickets / b.maxCapacity) - (a.currentTickets / a.maxCapacity))

    const underutilized = workloadData.filter(agent => 
      (agent.currentTickets / agent.maxCapacity) < 0.6 && agent.isOnline
    ).sort((a, b) => (a.currentTickets / a.maxCapacity) - (b.currentTickets / b.maxCapacity))

    return overloaded.slice(0, 3).map(overloadedAgent => {
      const bestTarget = underutilized.find(agent => 
        agent.department === overloadedAgent.department ||
        agent.role === overloadedAgent.role
      ) || underutilized[0]

      if (!bestTarget) return null

      const suggestedTransfer = Math.min(
        Math.floor(overloadedAgent.currentTickets * 0.2),
        bestTarget.maxCapacity - bestTarget.currentTickets
      )

      return {
        from: overloadedAgent,
        to: bestTarget,
        suggestedCount: suggestedTransfer,
        reason: overloadedAgent.department === bestTarget.department 
          ? 'Same department' 
          : 'Available capacity'
      }
    }).filter(Boolean)
  }, [workloadData])

  const handleAutoBalance = async () => {
    try {
      setAutoBalancing(true)
      await onAutoBalance()
    } catch (error) {
      console.error('Auto-balance failed:', error)
    } finally {
      setAutoBalancing(false)
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'error'
    if (utilization >= 75) return 'warning'
    if (utilization >= 50) return 'success'
    return 'secondary'
  }

  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 90) return 'Overloaded'
    if (utilization >= 75) return 'High Load'
    if (utilization >= 50) return 'Optimal'
    if (utilization >= 25) return 'Light Load'
    return 'Underutilized'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Workload Balancing</h2>
          <p className="text-sm text-secondary-500">
            Monitor and optimize agent workload distribution
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-secondary-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <Button
            onClick={handleAutoBalance}
            loading={autoBalancing}
            icon={<Target className="h-4 w-4" />}
          >
            Auto Balance
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Agents"
          value={stats.totalAgents}
          subtitle={`${stats.onlineAgents} online`}
          icon={<Users className="h-6 w-6" />}
          color="primary"
        />
        
        <StatsCard
          title="Active Tickets"
          value={stats.totalTickets}
          subtitle={`${stats.avgUtilization.toFixed(1)}% utilization`}
          icon={<BarChart3 className="h-6 w-6" />}
          color="secondary"
        />
        
        <StatsCard
          title="Overloaded Agents"
          value={stats.overloadedAgents}
          subtitle={stats.overloadedAgents > 0 ? 'Need rebalancing' : 'All balanced'}
          icon={<AlertTriangle className="h-6 w-6" />}
          color={stats.overloadedAgents > 0 ? 'error' : 'success'}
        />
        
        <StatsCard
          title="Avg Satisfaction"
          value={`${stats.avgSatisfaction.toFixed(1)}/5`}
          subtitle="Customer rating"
          icon={<TrendingUp className="h-6 w-6" />}
          color="success"
        />
      </StatsGrid>

      {/* Rebalancing Opportunities */}
      {rebalanceOpportunities.length > 0 && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900">
                Rebalancing Opportunities
              </h3>
              <Badge variant="warning">
                {rebalanceOpportunities.length} opportunity{rebalanceOpportunities.length !== 1 ? 'ies' : 'y'}
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-4">
              {rebalanceOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-warning-50 border border-warning-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <Avatar name={opportunity.from.agentName} size="sm" />
                      <p className="text-xs font-medium mt-1">{opportunity.from.agentName}</p>
                      <Badge variant="error" size="sm">
                        {Math.round((opportunity.from.currentTickets / opportunity.from.maxCapacity) * 100)}%
                      </Badge>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-secondary-400" />
                    
                    <div className="text-center">
                      <Avatar name={opportunity.to.agentName} size="sm" />
                      <p className="text-xs font-medium mt-1">{opportunity.to.agentName}</p>
                      <Badge variant="success" size="sm">
                        {Math.round((opportunity.to.currentTickets / opportunity.to.maxCapacity) * 100)}%
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-secondary-600">
                      <p><strong>Transfer:</strong> {opportunity.suggestedCount} tickets</p>
                      <p><strong>Reason:</strong> {opportunity.reason}</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setSelectedAgents({
                        from: opportunity.from.agentId,
                        to: opportunity.to.agentId
                      })
                      setRebalanceCount(opportunity.suggestedCount)
                      setShowRebalanceModal(true)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Agent Workload Grid */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-medium text-secondary-900">Agent Workload Overview</h3>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {workloadData.map(agent => {
              const utilization = (agent.currentTickets / agent.maxCapacity) * 100
              const utilizationColor = getUtilizationColor(utilization)
              const utilizationStatus = getUtilizationStatus(utilization)
              
              return (
                <div key={agent.agentId} className="border border-secondary-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={agent.agentName}
                        size="md"
                        status={agent.isOnline ? 'online' : 'offline'}
                      />
                      <div>
                        <h4 className="font-medium text-secondary-900">{agent.agentName}</h4>
                        <p className="text-sm text-secondary-600">{agent.role}</p>
                      </div>
                    </div>
                    
                    <Badge variant={utilizationColor as any} size="sm">
                      {utilizationStatus}
                    </Badge>
                  </div>
                  
                  {/* Workload Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-secondary-600">Workload</span>
                      <span className="font-medium">
                        {agent.currentTickets}/{agent.maxCapacity}
                      </span>
                    </div>
                    <ProgressBar
                      value={utilization}
                      max={100}
                      color={utilizationColor}
                      size="sm"
                    />
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-secondary-500">Today Assigned:</span>
                      <p className="font-medium">{agent.todayAssigned}</p>
                    </div>
                    <div>
                      <span className="text-secondary-500">Today Resolved:</span>
                      <p className="font-medium">{agent.todayResolved}</p>
                    </div>
                    <div>
                      <span className="text-secondary-500">Avg Resolution:</span>
                      <p className="font-medium">{Math.round(agent.avgResolutionTime / 60)}min</p>
                    </div>
                    <div>
                      <span className="text-secondary-500">Satisfaction:</span>
                      <p className="font-medium">{agent.customerSatisfaction.toFixed(1)}/5</p>
                    </div>
                  </div>
                  
                  {/* Alerts */}
                  {agent.overdueTickets > 0 && (
                    <div className="mt-3 p-2 bg-error-50 border border-error-200 rounded text-sm">
                      <div className="flex items-center space-x-1 text-error-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{agent.overdueTickets} overdue ticket{agent.overdueTickets !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                  
                  {agent.upcomingDeadlines > 0 && (
                    <div className="mt-2 p-2 bg-warning-50 border border-warning-200 rounded text-sm">
                      <div className="flex items-center space-x-1 text-warning-700">
                        <Clock className="h-3 w-3" />
                        <span>{agent.upcomingDeadlines} deadline{agent.upcomingDeadlines !== 1 ? 's' : ''} today</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Weekly Trend */}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-secondary-500">Weekly Trend:</span>
                    <div className="flex items-center space-x-1">
                      {agent.weeklyTrend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-success-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-error-500" />
                      )}
                      <span className={agent.weeklyTrend > 0 ? 'text-success-600' : 'text-error-600'}>
                        {Math.abs(agent.weeklyTrend)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card.Body>
      </Card>

      {/* Rebalance Modal */}
      {showRebalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">
              Rebalance Workload
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Number of tickets to transfer
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rebalanceCount}
                  onChange={(e) => setRebalanceCount(parseInt(e.target.value))}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div className="bg-secondary-50 p-3 rounded-lg text-sm">
                <p>This will transfer {rebalanceCount} ticket{rebalanceCount !== 1 ? 's' : ''} from the overloaded agent to the available agent.</p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => setShowRebalanceModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await onRebalance(selectedAgents.from, selectedAgents.to, rebalanceCount)
                    setShowRebalanceModal(false)
                  }}
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
