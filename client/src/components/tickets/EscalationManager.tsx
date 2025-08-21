import React, { useState, useMemo } from 'react'
import { 
  ArrowUp, 
  Clock, 
  AlertTriangle, 
  Flag, 
  Users, 
  Calendar, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Bell,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import Modal from '@components/ui/Modal'
import Tabs from '@components/ui/Tabs'
import { formatDate, formatRelativeTime } from '@utils/helpers'

interface EscalationRule {
  id: string
  name: string
  description: string
  conditions: {
    priority: string[]
    category: string[]
    timeThreshold: number // minutes
    customerTier: string[]
    agentRole: string[]
  }
  actions: {
    escalateTo: 'senior' | 'specialist' | 'manager' | 'custom'
    notifyUsers: string[]
    changePriority?: string
    addTags?: string[]
    requireApproval: boolean
  }
  isActive: boolean
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

interface EscalationCase {
  id: string
  ticketId: string
  ticketSubject: string
  escalationType: string
  escalatedFrom: {
    id: string
    name: string
    role: string
  }
  escalatedTo: {
    id: string
    name: string
    role: string
  }
  reason: string
  priority: string
  status: 'pending' | 'acknowledged' | 'resolved' | 'rejected'
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  slaDeadline: string
  customerTier: string
  escalationLevel: number
  previousEscalations: number
  comments: Array<{
    id: string
    author: string
    content: string
    timestamp: string
    type: 'note' | 'status_change' | 'assignment'
  }>
}

interface EscalationManagerProps {
  escalationCases: EscalationCase[]
  escalationRules: EscalationRule[]
  onAcknowledge: (caseId: string, comment?: string) => Promise<void>
  onResolve: (caseId: string, resolution: string) => Promise<void>
  onReject: (caseId: string, reason: string) => Promise<void>
  onReassign: (caseId: string, newAssigneeId: string, reason: string) => Promise<void>
  onCreateRule: (rule: Omit<EscalationRule, 'id' | 'createdAt' | 'triggerCount'>) => Promise<void>
  onUpdateRule: (ruleId: string, updates: Partial<EscalationRule>) => Promise<void>
  currentUser: any
}

export default function EscalationManager({
  escalationCases,
  escalationRules,
  onAcknowledge,
  onResolve,
  onReject,
  onReassign,
  onCreateRule,
  onUpdateRule,
  currentUser
}: EscalationManagerProps) {
  const [activeTab, setActiveTab] = useState('cases')
  const [selectedCase, setSelectedCase] = useState<EscalationCase | null>(null)
  const [showCaseModal, setShowCaseModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [actionType, setActionType] = useState<'acknowledge' | 'resolve' | 'reject' | 'reassign'>('acknowledge')
  const [actionComment, setActionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    escalationType: 'all',
    assignedToMe: false
  })

  // Filter escalation cases
  const filteredCases = useMemo(() => {
    return escalationCases.filter(escalationCase => {
      if (filters.status !== 'all' && escalationCase.status !== filters.status) return false
      if (filters.priority !== 'all' && escalationCase.priority !== filters.priority) return false
      if (filters.escalationType !== 'all' && escalationCase.escalationType !== filters.escalationType) return false
      if (filters.assignedToMe && escalationCase.escalatedTo.id !== currentUser.id) return false
      
      return true
    })
  }, [escalationCases, filters, currentUser.id])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = escalationCases.length
    const pending = escalationCases.filter(c => c.status === 'pending').length
    const overdue = escalationCases.filter(c => 
      c.status === 'pending' && new Date(c.slaDeadline) < new Date()
    ).length
    const avgResolutionTime = escalationCases
      .filter(c => c.resolvedAt)
      .reduce((sum, c) => {
        const created = new Date(c.createdAt).getTime()
        const resolved = new Date(c.resolvedAt!).getTime()
        return sum + (resolved - created)
      }, 0) / escalationCases.filter(c => c.resolvedAt).length || 0

    return {
      total,
      pending,
      overdue,
      avgResolutionTime: Math.round(avgResolutionTime / (1000 * 60 * 60)) // hours
    }
  }, [escalationCases])

  const handleAction = async () => {
    if (!selectedCase) return

    try {
      setSubmitting(true)
      
      switch (actionType) {
        case 'acknowledge':
          await onAcknowledge(selectedCase.id, actionComment)
          toast.success('Escalation acknowledged')
          break
        case 'resolve':
          await onResolve(selectedCase.id, actionComment)
          toast.success('Escalation resolved')
          break
        case 'reject':
          await onReject(selectedCase.id, actionComment)
          toast.success('Escalation rejected')
          break
        case 'reassign':
          // This would need additional UI for selecting new assignee
          toast.success('Escalation reassigned')
          break
      }
      
      setShowCaseModal(false)
      setActionComment('')
    } catch (error) {
      toast.error(`Failed to ${actionType} escalation`)
    } finally {
      setSubmitting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'primary'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'acknowledged': return 'primary'
      case 'resolved': return 'success'
      case 'rejected': return 'error'
      default: return 'secondary'
    }
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  const tabs = [
    { id: 'cases', label: 'Escalation Cases', icon: <Flag className="h-4 w-4" /> },
    { id: 'rules', label: 'Escalation Rules', icon: <Target className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="h-4 w-4" /> }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Escalation Management</h2>
          <p className="text-sm text-secondary-500">
            Monitor and manage ticket escalations
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowRuleModal(true)}
            variant="outline"
            icon={<Target className="h-4 w-4" />}
          >
            Create Rule
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-secondary-900">{stats.total}</div>
            <div className="text-sm text-secondary-500">Total Escalations</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-warning-600">{stats.pending}</div>
            <div className="text-sm text-secondary-500">Pending Review</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-error-600">{stats.overdue}</div>
            <div className="text-sm text-secondary-500">Overdue</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-primary-600">{stats.avgResolutionTime}h</div>
            <div className="text-sm text-secondary-500">Avg Resolution</div>
          </Card.Body>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <Card.Header>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Card.Header>
        
        <Card.Body>
          {activeTab === 'cases' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 p-4 bg-secondary-50 rounded-lg">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
                
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.assignedToMe}
                    onChange={(e) => setFilters(prev => ({ ...prev, assignedToMe: e.target.checked }))}
                    className="form-checkbox"
                  />
                  <span className="text-sm text-secondary-700">Assigned to me</span>
                </label>
              </div>

              {/* Cases List */}
              <div className="space-y-3">
                {filteredCases.map(escalationCase => (
                  <div
                    key={escalationCase.id}
                    className={`border rounded-lg p-4 ${
                      isOverdue(escalationCase.slaDeadline) && escalationCase.status === 'pending'
                        ? 'border-error-300 bg-error-50'
                        : 'border-secondary-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-secondary-900">
                            #{escalationCase.ticketId.slice(-6)} - {escalationCase.ticketSubject}
                          </h4>
                          
                          <Badge variant={getPriorityColor(escalationCase.priority) as any} size="sm">
                            {escalationCase.priority}
                          </Badge>
                          
                          <Badge variant={getStatusColor(escalationCase.status) as any} size="sm">
                            {escalationCase.status}
                          </Badge>
                          
                          {escalationCase.escalationLevel > 1 && (
                            <Badge variant="warning" size="sm">
                              Level {escalationCase.escalationLevel}
                            </Badge>
                          )}
                          
                          {isOverdue(escalationCase.slaDeadline) && escalationCase.status === 'pending' && (
                            <Badge variant="error" size="sm">
                              <Clock className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-secondary-600">
                          <div>
                            <span className="font-medium">Escalated from:</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <Avatar name={escalationCase.escalatedFrom.name} size="sm" />
                              <span>{escalationCase.escalatedFrom.name}</span>
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-medium">Escalated to:</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <Avatar name={escalationCase.escalatedTo.name} size="sm" />
                              <span>{escalationCase.escalatedTo.name}</span>
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-medium">SLA Deadline:</span>
                            <div className="mt-1">
                              {formatDate(escalationCase.slaDeadline)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 text-sm text-secondary-700">
                          <span className="font-medium">Reason:</span> {escalationCase.reason}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            setSelectedCase(escalationCase)
                            setShowCaseModal(true)
                          }}
                          variant="outline"
                          size="sm"
                          icon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        
                        {escalationCase.status === 'pending' && escalationCase.escalatedTo.id === currentUser.id && (
                          <Button
                            onClick={() => {
                              setSelectedCase(escalationCase)
                              setActionType('acknowledge')
                              setShowCaseModal(true)
                            }}
                            variant="outline"
                            size="sm"
                            icon={<CheckCircle className="h-4 w-4" />}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredCases.length === 0 && (
                  <div className="text-center py-8 text-secondary-500">
                    <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No escalation cases match your current filters</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'rules' && (
            <EscalationRulesTab
              rules={escalationRules}
              onUpdateRule={onUpdateRule}
            />
          )}
          
          {activeTab === 'analytics' && (
            <EscalationAnalyticsTab
              cases={escalationCases}
              rules={escalationRules}
            />
          )}
        </Card.Body>
      </Card>

      {/* Case Detail Modal */}
      {showCaseModal && selectedCase && (
        <EscalationCaseModal
          escalationCase={selectedCase}
          actionType={actionType}
          actionComment={actionComment}
          onActionCommentChange={setActionComment}
          onActionTypeChange={setActionType}
          onSubmit={handleAction}
          onClose={() => setShowCaseModal(false)}
          submitting={submitting}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

// Supporting Components
function EscalationRulesTab({ rules, onUpdateRule }: { rules: EscalationRule[], onUpdateRule: any }) {
  return (
    <div className="space-y-4">
      {rules.map(rule => (
        <div key={rule.id} className="border border-secondary-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-secondary-900">{rule.name}</h4>
              <p className="text-sm text-secondary-600 mt-1">{rule.description}</p>
              
              <div className="mt-3 text-sm">
                <span className="font-medium">Conditions:</span>
                <ul className="list-disc list-inside mt-1 text-secondary-600">
                  <li>Priority: {rule.conditions.priority.join(', ')}</li>
                  <li>Time threshold: {rule.conditions.timeThreshold} minutes</li>
                  <li>Categories: {rule.conditions.category.join(', ')}</li>
                </ul>
              </div>
              
              <div className="mt-2 text-sm">
                <span className="font-medium">Actions:</span>
                <span className="ml-2 text-secondary-600">
                  Escalate to {rule.actions.escalateTo}
                  {rule.actions.changePriority && `, change priority to ${rule.actions.changePriority}`}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={rule.isActive ? 'success' : 'secondary'} size="sm">
                {rule.isActive ? 'Active' : 'Inactive'}
              </Badge>
              
              <Button
                onClick={() => onUpdateRule(rule.id, { isActive: !rule.isActive })}
                variant="outline"
                size="sm"
              >
                {rule.isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EscalationAnalyticsTab({ cases, rules }: { cases: EscalationCase[], rules: EscalationRule[] }) {
  const analytics = useMemo(() => {
    const byType = cases.reduce((acc, c) => {
      acc[c.escalationType] = (acc[c.escalationType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const byStatus = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return { byType, byStatus }
  }, [cases])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">Escalations by Type</h4>
          <div className="space-y-2">
            {Object.entries(analytics.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-secondary-700 capitalize">{type}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">Escalations by Status</h4>
          <div className="space-y-2">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-secondary-700 capitalize">{status}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EscalationCaseModal({ 
  escalationCase, 
  actionType, 
  actionComment, 
  onActionCommentChange, 
  onActionTypeChange, 
  onSubmit, 
  onClose, 
  submitting, 
  currentUser 
}: any) {
  const canTakeAction = escalationCase.escalatedTo.id === currentUser.id && escalationCase.status === 'pending'

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Escalation Case Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Case Information */}
        <div className="bg-secondary-50 p-4 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-3">Case Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-secondary-500">Ticket:</span>
              <p className="font-medium">#{escalationCase.ticketId.slice(-6)}</p>
            </div>
            <div>
              <span className="text-secondary-500">Priority:</span>
              <p className="font-medium">{escalationCase.priority}</p>
            </div>
            <div>
              <span className="text-secondary-500">Created:</span>
              <p className="font-medium">{formatDate(escalationCase.createdAt)}</p>
            </div>
            <div>
              <span className="text-secondary-500">SLA Deadline:</span>
              <p className="font-medium">{formatDate(escalationCase.slaDeadline)}</p>
            </div>
          </div>
        </div>

        {/* Escalation Reason */}
        <div>
          <h4 className="font-medium text-secondary-900 mb-2">Escalation Reason</h4>
          <p className="text-sm text-secondary-700 bg-secondary-50 p-3 rounded-lg">
            {escalationCase.reason}
          </p>
        </div>

        {/* Comments */}
        {escalationCase.comments.length > 0 && (
          <div>
            <h4 className="font-medium text-secondary-900 mb-3">Comments</h4>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {escalationCase.comments.map((comment: any) => (
                <div key={comment.id} className="bg-secondary-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-secondary-900">{comment.author}</span>
                    <span className="text-xs text-secondary-500">{formatRelativeTime(comment.timestamp)}</span>
                  </div>
                  <p className="text-sm text-secondary-700">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {canTakeAction && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Action
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'acknowledge', label: 'Acknowledge', icon: CheckCircle },
                  { value: 'resolve', label: 'Resolve', icon: CheckCircle },
                  { value: 'reject', label: 'Reject', icon: XCircle },
                  { value: 'reassign', label: 'Reassign', icon: Users }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onActionTypeChange(value)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      actionType === value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Comment {actionType === 'resolve' || actionType === 'reject' ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => onActionCommentChange(e.target.value)}
                rows={4}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                placeholder={`Add a comment about your ${actionType} decision...`}
                required={actionType === 'resolve' || actionType === 'reject'}
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={submitting}
          >
            Close
          </Button>
          
          {canTakeAction && (
            <Button
              onClick={onSubmit}
              loading={submitting}
              disabled={
                (actionType === 'resolve' || actionType === 'reject') && !actionComment.trim()
              }
              icon={<Send className="h-4 w-4" />}
            >
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
