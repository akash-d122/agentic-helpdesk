import React, { useState, useEffect, useRef } from 'react'
import { 
  Activity, 
  User, 
  Clock, 
  MessageSquare, 
  Edit3, 
  Eye, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Zap,
  Bell,
  Users,
  RefreshCw
} from 'lucide-react'

import Badge from '@components/ui/Badge'
import Avatar from '@components/ui/Avatar'
import Button from '@components/ui/Button'
import { formatRelativeTime } from '@utils/helpers'
import { websocketService, TicketStatusUpdate, LiveCollaborationData } from '@services/websocketService'

interface StatusUpdate {
  id: string
  type: 'status_change' | 'assignment' | 'comment' | 'escalation' | 'ai_suggestion' | 'priority_change'
  ticketId: string
  title: string
  description: string
  user: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  timestamp: string
  metadata?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface RealTimeStatusUpdatesProps {
  ticketId?: string
  showGlobalUpdates?: boolean
  maxUpdates?: number
  autoRefresh?: boolean
  onUpdateClick?: (update: StatusUpdate) => void
}

export default function RealTimeStatusUpdates({
  ticketId,
  showGlobalUpdates = false,
  maxUpdates = 50,
  autoRefresh = true,
  onUpdateClick
}: RealTimeStatusUpdatesProps) {
  const [updates, setUpdates] = useState<StatusUpdate[]>([])
  const [liveUsers, setLiveUsers] = useState<LiveCollaborationData['users']>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const updatesRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Initialize WebSocket connection and listeners
  useEffect(() => {
    const handleStatusUpdate = (data: TicketStatusUpdate) => {
      if (!showGlobalUpdates && data.ticketId !== ticketId) return

      const update: StatusUpdate = {
        id: `${data.ticketId}-${Date.now()}`,
        type: 'status_change',
        ticketId: data.ticketId,
        title: `Status changed to ${data.status}`,
        description: `Ticket status updated by ${data.updatedBy.name}`,
        user: {
          id: data.updatedBy.id || 'system',
          name: data.updatedBy.name,
          role: 'agent'
        },
        timestamp: data.timestamp,
        metadata: { changes: data.changes },
        priority: 'medium'
      }

      addUpdate(update)
    }

    const handleAssignment = (data: any) => {
      if (!showGlobalUpdates && data.ticketId !== ticketId) return

      const update: StatusUpdate = {
        id: `${data.ticketId}-assignment-${Date.now()}`,
        type: 'assignment',
        ticketId: data.ticketId,
        title: 'Ticket assigned',
        description: `Assigned to ${data.assignee.name}`,
        user: {
          id: data.assignedBy.id,
          name: data.assignedBy.name,
          role: 'agent'
        },
        timestamp: data.timestamp,
        metadata: { assignee: data.assignee },
        priority: 'high'
      }

      addUpdate(update)
    }

    const handleComment = (data: any) => {
      if (!showGlobalUpdates && data.ticketId !== ticketId) return

      const update: StatusUpdate = {
        id: `${data.ticketId}-comment-${Date.now()}`,
        type: 'comment',
        ticketId: data.ticketId,
        title: 'New comment added',
        description: data.isInternal ? 'Internal note added' : 'Customer response received',
        user: {
          id: data.author.id,
          name: data.author.name,
          role: data.author.role
        },
        timestamp: data.timestamp,
        metadata: { commentId: data.id, isInternal: data.isInternal },
        priority: data.isInternal ? 'low' : 'medium'
      }

      addUpdate(update)
    }

    const handleEscalation = (data: any) => {
      if (!showGlobalUpdates && data.ticketId !== ticketId) return

      const update: StatusUpdate = {
        id: `${data.ticketId}-escalation-${Date.now()}`,
        type: 'escalation',
        ticketId: data.ticketId,
        title: 'Ticket escalated',
        description: `Escalated to ${data.escalatedTo.name}`,
        user: {
          id: data.escalatedBy.id,
          name: data.escalatedBy.name,
          role: 'agent'
        },
        timestamp: data.timestamp,
        metadata: { escalationType: data.type, reason: data.reason },
        priority: 'urgent'
      }

      addUpdate(update)
    }

    const handleAISuggestion = (data: any) => {
      if (!showGlobalUpdates && data.ticketId !== ticketId) return

      const update: StatusUpdate = {
        id: `${data.ticketId}-ai-${Date.now()}`,
        type: 'ai_suggestion',
        ticketId: data.ticketId,
        title: 'AI suggestion ready',
        description: `AI generated ${data.type} suggestion`,
        user: {
          id: 'ai-system',
          name: 'AI Assistant',
          role: 'system'
        },
        timestamp: data.timestamp,
        metadata: { suggestionId: data.suggestionId, confidence: data.confidence },
        priority: data.autoResolve ? 'high' : 'medium'
      }

      addUpdate(update)
    }

    const handleCollaboration = (data: LiveCollaborationData) => {
      if (data.ticketId === ticketId) {
        setLiveUsers(data.users)
      }
    }

    const handleConnectionStatus = () => {
      setIsConnected(websocketService.isSocketConnected())
    }

    // Set up event listeners
    websocketService.on('ticket:status_update', handleStatusUpdate)
    websocketService.on('ticket:assignment', handleAssignment)
    websocketService.on('ticket:comment', handleComment)
    websocketService.on('ticket:escalation', handleEscalation)
    websocketService.on('ai:suggestion_ready', handleAISuggestion)
    websocketService.on('collaboration:user_joined', handleCollaboration)
    websocketService.on('collaboration:user_left', handleCollaboration)
    websocketService.on('connection:status', handleConnectionStatus)

    // Join ticket room if specific ticket
    if (ticketId) {
      websocketService.joinRoom(`ticket:${ticketId}`)
    }

    // Initial connection status
    handleConnectionStatus()

    return () => {
      websocketService.off('ticket:status_update', handleStatusUpdate)
      websocketService.off('ticket:assignment', handleAssignment)
      websocketService.off('ticket:comment', handleComment)
      websocketService.off('ticket:escalation', handleEscalation)
      websocketService.off('ai:suggestion_ready', handleAISuggestion)
      websocketService.off('collaboration:user_joined', handleCollaboration)
      websocketService.off('collaboration:user_left', handleCollaboration)
      websocketService.off('connection:status', handleConnectionStatus)

      if (ticketId) {
        websocketService.leaveRoom(`ticket:${ticketId}`)
      }
    }
  }, [ticketId, showGlobalUpdates])

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (autoScroll && updatesRef.current) {
      updatesRef.current.scrollTop = updatesRef.current.scrollHeight
    }
  }, [updates, autoScroll])

  const addUpdate = (update: StatusUpdate) => {
    if (isPaused) return

    setUpdates(prev => {
      const newUpdates = [update, ...prev].slice(0, maxUpdates)
      return newUpdates
    })
  }

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="h-4 w-4 text-success-500" />
      case 'assignment':
        return <User className="h-4 w-4 text-primary-500" />
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-secondary-500" />
      case 'escalation':
        return <AlertTriangle className="h-4 w-4 text-warning-500" />
      case 'ai_suggestion':
        return <Zap className="h-4 w-4 text-purple-500" />
      case 'priority_change':
        return <ArrowRight className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-secondary-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-error-500 bg-error-50'
      case 'high': return 'border-l-warning-500 bg-warning-50'
      case 'medium': return 'border-l-primary-500 bg-primary-50'
      case 'low': return 'border-l-secondary-500 bg-secondary-50'
      default: return 'border-l-secondary-300'
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop === clientHeight
    setAutoScroll(isAtBottom)
  }

  return (
    <div className="bg-white border border-secondary-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-secondary-700" />
          <h3 className="font-medium text-secondary-900">
            {ticketId ? 'Ticket Activity' : 'Live Updates'}
          </h3>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-success-500' : 'bg-error-500'
            }`} />
            <span className="text-xs text-secondary-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Users */}
          {liveUsers.length > 0 && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4 text-secondary-500" />
              <div className="flex -space-x-1">
                {liveUsers.slice(0, 3).map(user => (
                  <Avatar
                    key={user.id}
                    name={user.name}
                    size="sm"
                    className="border-2 border-white"
                    title={`${user.name} - ${user.action}`}
                  />
                ))}
                {liveUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-secondary-200 border-2 border-white flex items-center justify-center text-xs font-medium text-secondary-600">
                    +{liveUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <Button
            onClick={() => setIsPaused(!isPaused)}
            variant="ghost"
            size="sm"
            icon={isPaused ? <Bell className="h-4 w-4" /> : <Bell className="h-4 w-4 text-primary-500" />}
            title={isPaused ? 'Resume updates' : 'Pause updates'}
          />
          
          <Button
            onClick={() => setUpdates([])}
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            title="Clear updates"
          />
        </div>
      </div>

      {/* Updates List */}
      <div 
        ref={updatesRef}
        className="h-96 overflow-y-auto p-4 space-y-3"
        onScroll={handleScroll}
      >
        {updates.length === 0 ? (
          <div className="text-center py-8 text-secondary-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {isPaused ? 'Updates paused' : 'No recent activity'}
            </p>
          </div>
        ) : (
          updates.map(update => (
            <div
              key={update.id}
              className={`border-l-4 p-3 rounded-r-lg cursor-pointer hover:shadow-sm transition-shadow ${
                getPriorityColor(update.priority)
              }`}
              onClick={() => onUpdateClick?.(update)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getUpdateIcon(update.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-secondary-900">
                      {update.title}
                    </p>
                    <span className="text-xs text-secondary-500">
                      {formatRelativeTime(update.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-secondary-600 mt-1">
                    {update.description}
                  </p>
                  
                  <div className="flex items-center space-x-2 mt-2">
                    <Avatar
                      name={update.user.name}
                      size="xs"
                    />
                    <span className="text-xs text-secondary-500">
                      {update.user.name}
                    </span>
                    
                    {update.type === 'ai_suggestion' && update.metadata?.confidence && (
                      <Badge variant="outline" size="sm">
                        {Math.round(update.metadata.confidence * 100)}% confidence
                      </Badge>
                    )}
                    
                    {showGlobalUpdates && (
                      <Badge variant="outline" size="sm">
                        #{update.ticketId.slice(-6)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Additional metadata */}
                  {update.metadata?.changes && (
                    <div className="mt-2 text-xs text-secondary-500">
                      Changes: {update.metadata.changes.map((change: any) => 
                        `${change.field}: ${change.oldValue} → ${change.newValue}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-secondary-200 bg-secondary-50">
        <div className="text-xs text-secondary-500">
          {updates.length} update{updates.length !== 1 ? 's' : ''}
          {isPaused && ' (paused)'}
        </div>
        
        {!autoScroll && (
          <Button
            onClick={() => {
              setAutoScroll(true)
              if (updatesRef.current) {
                updatesRef.current.scrollTop = updatesRef.current.scrollHeight
              }
            }}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Scroll to bottom
          </Button>
        )}
      </div>
    </div>
  )
}
