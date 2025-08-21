import React, { useState, useEffect, useMemo } from 'react'
import { 
  Users, 
  User, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUp, 
  ArrowDown,
  BarChart3,
  Target,
  Zap,
  Brain,
  Star,
  Award,
  Activity,
  Calendar,
  MessageSquare,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

import Button from '@components/ui/Button'
import Card from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import Tooltip from '@components/ui/Tooltip'
import Modal from '@components/ui/Modal'
import { formatRelativeTime } from '@utils/helpers'

interface Agent {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  department: string
  skills: string[]
  specializations: string[]
  currentWorkload: number
  maxWorkload: number
  averageResolutionTime: number
  customerSatisfaction: number
  ticketsResolved: number
  isOnline: boolean
  lastActive: string
  timezone: string
  workingHours: {
    start: string
    end: string
    days: string[]
  }
  performance: {
    responseTime: number
    resolutionRate: number
    escalationRate: number
    customerRating: number
  }
}

interface TicketAssignmentPanelProps {
  ticket: any
  agents: Agent[]
  onAssign: (agentId: string, reason?: string) => Promise<void>
  onEscalate: (escalationType: string, targetId: string, reason: string) => Promise<void>
  onReassign: (fromAgentId: string, toAgentId: string, reason: string) => Promise<void>
  currentAssignee?: Agent
  aiSuggestions?: {
    recommendedAgents: string[]
    reasoning: string[]
    confidence: number
  }
}

export default function TicketAssignmentPanel({
  ticket,
  agents,
  onAssign,
  onEscalate,
  onReassign,
  currentAssignee,
  aiSuggestions
}: TicketAssignmentPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [assignmentReason, setAssignmentReason] = useState('')
  const [escalationType, setEscalationType] = useState<'senior' | 'specialist' | 'manager'>('senior')
  const [escalationReason, setEscalationReason] = useState('')
  const [filterCriteria, setFilterCriteria] = useState({
    department: 'all',
    availability: 'all',
    skills: '',
    sortBy: 'workload'
  })
  const [submitting, setSubmitting] = useState(false)

  // Calculate agent scores for intelligent assignment
  const agentScores = useMemo(() => {
    return agents.map(agent => {
      let score = 0
      let reasons: string[] = []

      // Workload factor (lower workload = higher score)
      const workloadRatio = agent.currentWorkload / agent.maxWorkload
      const workloadScore = Math.max(0, 1 - workloadRatio) * 30
      score += workloadScore
      if (workloadRatio < 0.7) {
        reasons.push(`Low workload (${Math.round(workloadRatio * 100)}%)`)
      }

      // Skills matching
      const ticketCategory = ticket.category?.toLowerCase() || ''
      const ticketTags = ticket.tags?.map((tag: string) => tag.toLowerCase()) || []
      const agentSkills = agent.skills.map(skill => skill.toLowerCase())
      
      const skillMatches = agentSkills.filter(skill => 
        ticketCategory.includes(skill) || 
        ticketTags.some(tag => tag.includes(skill))
      ).length
      
      const skillScore = skillMatches * 15
      score += skillScore
      if (skillMatches > 0) {
        reasons.push(`${skillMatches} skill match${skillMatches > 1 ? 'es' : ''}`)
      }

      // Performance factors
      const performanceScore = (
        agent.performance.resolutionRate * 10 +
        agent.performance.customerRating * 5 +
        (1 - agent.performance.escalationRate) * 10
      )
      score += performanceScore

      // Availability bonus
      if (agent.isOnline) {
        score += 10
        reasons.push('Currently online')
      }

      // Response time factor (faster = better)
      const responseTimeScore = Math.max(0, (3600 - agent.performance.responseTime) / 3600) * 10
      score += responseTimeScore

      // Priority handling experience
      if (ticket.priority === 'urgent' && agent.specializations.includes('urgent_handling')) {
        score += 15
        reasons.push('Urgent ticket specialist')
      }

      return {
        agent,
        score: Math.round(score),
        reasons,
        workloadRatio,
        skillMatches
      }
    }).sort((a, b) => b.score - a.score)
  }, [agents, ticket])

  // Filter and sort agents
  const filteredAgents = useMemo(() => {
    let filtered = agentScores

    // Department filter
    if (filterCriteria.department !== 'all') {
      filtered = filtered.filter(item => item.agent.department === filterCriteria.department)
    }

    // Availability filter
    if (filterCriteria.availability === 'online') {
      filtered = filtered.filter(item => item.agent.isOnline)
    } else if (filterCriteria.availability === 'available') {
      filtered = filtered.filter(item => item.workloadRatio < 0.8)
    }

    // Skills filter
    if (filterCriteria.skills) {
      const searchSkills = filterCriteria.skills.toLowerCase()
      filtered = filtered.filter(item => 
        item.agent.skills.some(skill => skill.toLowerCase().includes(searchSkills)) ||
        item.agent.specializations.some(spec => spec.toLowerCase().includes(searchSkills))
      )
    }

    // Sort
    switch (filterCriteria.sortBy) {
      case 'score':
        // Already sorted by score
        break
      case 'workload':
        filtered.sort((a, b) => a.workloadRatio - b.workloadRatio)
        break
      case 'performance':
        filtered.sort((a, b) => b.agent.performance.customerRating - a.agent.performance.customerRating)
        break
      case 'response_time':
        filtered.sort((a, b) => a.agent.performance.responseTime - b.agent.performance.responseTime)
        break
    }

    return filtered
  }, [agentScores, filterCriteria])

  const handleAssign = async () => {
    if (!selectedAgent) return

    try {
      setSubmitting(true)
      await onAssign(selectedAgent.id, assignmentReason)
      toast.success(`Ticket assigned to ${selectedAgent.firstName} ${selectedAgent.lastName}`)
      setShowAssignModal(false)
      setSelectedAgent(null)
      setAssignmentReason('')
    } catch (error) {
      toast.error('Failed to assign ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEscalate = async () => {
    try {
      setSubmitting(true)
      await onEscalate(escalationType, selectedAgent?.id || '', escalationReason)
      toast.success('Ticket escalated successfully')
      setShowEscalateModal(false)
      setEscalationReason('')
    } catch (error) {
      toast.error('Failed to escalate ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const getWorkloadColor = (ratio: number) => {
    if (ratio >= 0.9) return 'error'
    if (ratio >= 0.7) return 'warning'
    return 'success'
  }

  const getPerformanceIcon = (rating: number) => {
    if (rating >= 4.5) return <Star className="h-4 w-4 text-yellow-500" />
    if (rating >= 4.0) return <Award className="h-4 w-4 text-blue-500" />
    if (rating >= 3.5) return <Target className="h-4 w-4 text-green-500" />
    return <Activity className="h-4 w-4 text-secondary-500" />
  }

  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      {currentAssignee && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-secondary-900">Current Assignment</h3>
              <Button
                onClick={() => setShowEscalateModal(true)}
                variant="outline"
                size="sm"
                icon={<ArrowUp className="h-4 w-4" />}
              >
                Escalate
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="flex items-center space-x-4">
              <Avatar
                name={`${currentAssignee.firstName} ${currentAssignee.lastName}`}
                size="lg"
                status={currentAssignee.isOnline ? 'online' : 'offline'}
              />
              <div className="flex-1">
                <h4 className="font-medium text-secondary-900">
                  {currentAssignee.firstName} {currentAssignee.lastName}
                </h4>
                <p className="text-sm text-secondary-600">{currentAssignee.role}</p>
                <div className="flex items-center space-x-4 mt-2 text-sm text-secondary-500">
                  <span>Workload: {currentAssignee.currentWorkload}/{currentAssignee.maxWorkload}</span>
                  <span>Rating: {currentAssignee.performance.customerRating.toFixed(1)}</span>
                  <span>Last active: {formatRelativeTime(currentAssignee.lastActive)}</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">AI Recommendations</h3>
              <Badge variant="primary" size="sm">
                {(aiSuggestions.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              <div className="text-sm text-secondary-600">
                <strong>Reasoning:</strong>
                <ul className="list-disc list-inside mt-1">
                  {aiSuggestions.reasoning.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.recommendedAgents.slice(0, 3).map(agentId => {
                  const agent = agents.find(a => a.id === agentId)
                  if (!agent) return null
                  
                  return (
                    <Button
                      key={agentId}
                      onClick={() => {
                        setSelectedAgent(agent)
                        setShowAssignModal(true)
                      }}
                      variant="outline"
                      size="sm"
                      className="text-primary-600 border-primary-200 hover:bg-primary-50"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {agent.firstName} {agent.lastName}
                    </Button>
                  )
                })}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-secondary-900">Available Agents</h3>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Department
              </label>
              <select
                value={filterCriteria.department}
                onChange={(e) => setFilterCriteria(prev => ({ ...prev, department: e.target.value }))}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Departments</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="general">General Support</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Availability
              </label>
              <select
                value={filterCriteria.availability}
                onChange={(e) => setFilterCriteria(prev => ({ ...prev, availability: e.target.value }))}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Agents</option>
                <option value="online">Online Only</option>
                <option value="available">Available (Low Workload)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Skills
              </label>
              <input
                type="text"
                placeholder="Search skills..."
                value={filterCriteria.skills}
                onChange={(e) => setFilterCriteria(prev => ({ ...prev, skills: e.target.value }))}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Sort By
              </label>
              <select
                value={filterCriteria.sortBy}
                onChange={(e) => setFilterCriteria(prev => ({ ...prev, sortBy: e.target.value }))}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="score">AI Score</option>
                <option value="workload">Workload</option>
                <option value="performance">Performance</option>
                <option value="response_time">Response Time</option>
              </select>
            </div>
          </div>

          {/* Agent List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAgents.map(({ agent, score, reasons, workloadRatio, skillMatches }) => (
              <div
                key={agent.id}
                className="border border-secondary-200 rounded-lg p-4 hover:border-secondary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Avatar
                      name={`${agent.firstName} ${agent.lastName}`}
                      size="md"
                      status={agent.isOnline ? 'online' : 'offline'}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-secondary-900">
                          {agent.firstName} {agent.lastName}
                        </h4>
                        {getPerformanceIcon(agent.performance.customerRating)}
                        {filterCriteria.sortBy === 'score' && (
                          <Badge variant="primary" size="sm">
                            Score: {score}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-secondary-600">{agent.role} • {agent.department}</p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-secondary-500">
                        <div className="flex items-center space-x-1">
                          <BarChart3 className="h-3 w-3" />
                          <span>Workload: {agent.currentWorkload}/{agent.maxWorkload}</span>
                          <Badge variant={getWorkloadColor(workloadRatio) as any} size="sm">
                            {Math.round(workloadRatio * 100)}%
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Avg: {Math.round(agent.performance.responseTime / 60)}min</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>{agent.performance.customerRating.toFixed(1)}/5</span>
                        </div>
                      </div>
                      
                      {/* Skills */}
                      {agent.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.skills.slice(0, 4).map(skill => (
                            <Badge key={skill} variant="secondary" size="sm">
                              {skill}
                            </Badge>
                          ))}
                          {agent.skills.length > 4 && (
                            <Badge variant="secondary" size="sm">
                              +{agent.skills.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* AI Reasoning */}
                      {reasons.length > 0 && (
                        <div className="mt-2 text-xs text-primary-600">
                          <strong>Why recommended:</strong> {reasons.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setSelectedAgent(agent)
                      setShowAssignModal(true)
                    }}
                    variant="outline"
                    size="sm"
                    disabled={agent.id === currentAssignee?.id}
                  >
                    {agent.id === currentAssignee?.id ? 'Assigned' : 'Assign'}
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredAgents.length === 0 && (
              <div className="text-center py-8 text-secondary-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents match your current filters</p>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Ticket"
        size="md"
      >
        {selectedAgent && (
          <div className="space-y-4">
            <div className="bg-secondary-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar
                  name={`${selectedAgent.firstName} ${selectedAgent.lastName}`}
                  size="md"
                  status={selectedAgent.isOnline ? 'online' : 'offline'}
                />
                <div>
                  <h4 className="font-medium text-secondary-900">
                    {selectedAgent.firstName} {selectedAgent.lastName}
                  </h4>
                  <p className="text-sm text-secondary-600">{selectedAgent.role}</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Assignment Reason (Optional)
              </label>
              <textarea
                value={assignmentReason}
                onChange={(e) => setAssignmentReason(e.target.value)}
                rows={3}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Why are you assigning this ticket to this agent?"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowAssignModal(false)}
                variant="outline"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                loading={submitting}
                icon={<CheckCircle className="h-4 w-4" />}
              >
                Assign Ticket
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Escalation Modal */}
      <Modal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="Escalate Ticket"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Escalation Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'senior', label: 'Senior Agent', icon: ArrowUp },
                { value: 'specialist', label: 'Specialist', icon: Target },
                { value: 'manager', label: 'Manager', icon: Users }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEscalationType(value as any)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    escalationType === value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Escalation Reason (Required)
            </label>
            <textarea
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              rows={4}
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Please explain why this ticket needs to be escalated..."
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowEscalateModal(false)}
              variant="outline"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              loading={submitting}
              disabled={!escalationReason.trim()}
              icon={<ArrowUp className="h-4 w-4" />}
            >
              Escalate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
