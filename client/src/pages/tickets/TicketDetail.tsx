import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Bot, 
  CheckCircle, 
  AlertCircle,
  Edit,
  Send,
  Paperclip,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react'

import { useTicket, useTicketSuggestions, useAddTicketComment, useProcessTicket } from '@hooks/useTickets'
import { useAuth } from '@hooks/useAuth'
import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime } from '@utils/helpers'
import { TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS } from '@utils/constants'

import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import { Card, CardHeader, CardContent } from '@components/ui/Card'
import { Textarea } from '@components/ui/Input'
import { Alert } from '@components/ui/Alert'

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const permissions = usePermissions()
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  // API hooks
  const { data: ticket, isLoading, error } = useTicket(id!)
  const { data: suggestions } = useTicketSuggestions(id!)
  const addCommentMutation = useAddTicketComment()
  const processTicketMutation = useProcessTicket()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-error-400" />
        <h3 className="mt-2 text-sm font-medium text-secondary-900">Ticket not found</h3>
        <p className="mt-1 text-sm text-secondary-500">
          The ticket you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="mt-6">
          <Button as={Link} to="/tickets" variant="primary">
            Back to Tickets
          </Button>
        </div>
      </div>
    )
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      await addCommentMutation.mutateAsync({
        ticketId: id!,
        message: newComment,
        isInternal: false
      })
      setNewComment('')
      setIsAddingComment(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleProcessWithAI = async () => {
    try {
      await processTicketMutation.mutateAsync(id!)
    } catch (error) {
      console.error('Failed to process ticket with AI:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'secondary',
      triaged: 'warning',
      waiting_human: 'warning',
      in_progress: 'primary',
      resolved: 'success',
      closed: 'secondary'
    } as const
    return colors[status as keyof typeof colors] || 'secondary'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'secondary',
      medium: 'primary',
      high: 'warning',
      urgent: 'error'
    } as const
    return colors[priority as keyof typeof colors] || 'secondary'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            as={Link}
            to="/tickets"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Tickets
          </Button>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              #{ticket.ticketNumber} - {ticket.subject}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant={getStatusColor(ticket.status)}>
                {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS]}
              </Badge>
              <Badge variant={getPriorityColor(ticket.priority)}>
                {TICKET_PRIORITY_LABELS[ticket.priority as keyof typeof TICKET_PRIORITY_LABELS]}
              </Badge>
              <span className="text-sm text-secondary-500">
                {TICKET_CATEGORY_LABELS[ticket.category as keyof typeof TICKET_CATEGORY_LABELS]}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {permissions.canEditTickets && ticket.status === 'open' && (
              <Button
                onClick={handleProcessWithAI}
                loading={processTicketMutation.isLoading}
                icon={<Bot className="h-4 w-4" />}
                variant="primary"
              >
                Process with AI
              </Button>
            )}
            {permissions.canEditTickets && (
              <Button
                as={Link}
                to={`/tickets/${id}/edit`}
                icon={<Edit className="h-4 w-4" />}
                variant="secondary"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Description</h3>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-primary-500" />
                  <h3 className="text-lg font-medium">AI Suggestions</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestions.map((suggestion: any) => (
                  <AISuggestionCard key={suggestion._id} suggestion={suggestion} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Conversation */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Conversation</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.conversation?.map((message: any, index: number) => (
                  <ConversationMessage key={index} message={message} />
                ))}
                
                {/* Add Comment Form */}
                {(permissions.canEditTickets || ticket.requester._id === user?.id) && (
                  <div className="border-t pt-4">
                    {isAddingComment ? (
                      <div className="space-y-3">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={3}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingComment(false)
                              setNewComment('')
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddComment}
                            loading={addCommentMutation.isLoading}
                            icon={<Send className="h-4 w-4" />}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingComment(true)}
                        icon={<MessageSquare className="h-4 w-4" />}
                      >
                        Add Comment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium">Ticket Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-700">Requester</label>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="h-4 w-4 text-secondary-400" />
                  <span className="text-sm">
                    {ticket.requester.firstName} {ticket.requester.lastName}
                  </span>
                </div>
                <p className="text-xs text-secondary-500 mt-1">{ticket.requester.email}</p>
              </div>

              {ticket.assignedTo && (
                <div>
                  <label className="text-sm font-medium text-secondary-700">Assigned To</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-4 w-4 text-secondary-400" />
                    <span className="text-sm">
                      {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-secondary-700">Created</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-secondary-400" />
                  <span className="text-sm">{formatDate(ticket.createdAt)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700">Last Updated</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4 text-secondary-400" />
                  <span className="text-sm">{formatRelativeTime(ticket.updatedAt)}</span>
                </div>
              </div>

              {ticket.tags && ticket.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-secondary-700">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ticket.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Processing Status */}
          {ticket.aiProcessing && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-primary-500" />
                  <h3 className="text-lg font-medium">AI Processing</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.aiProcessing.autoResolved && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <span>This ticket was automatically resolved by AI</span>
                  </Alert>
                )}
                
                {ticket.aiProcessing.confidence && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Confidence Score</label>
                    <div className="mt-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full" 
                            style={{ width: `${ticket.aiProcessing.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(ticket.aiProcessing.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {ticket.aiProcessing.suggestedCategory && (
                  <div>
                    <label className="text-sm font-medium text-secondary-700">Suggested Category</label>
                    <p className="text-sm mt-1">{ticket.aiProcessing.suggestedCategory}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// AI Suggestion Card Component
function AISuggestionCard({ suggestion }: { suggestion: any }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="border rounded-lg p-4 bg-blue-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Bot className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-900">AI Suggestion</span>
            <Badge variant="primary" size="sm">
              {Math.round((suggestion.confidence?.overall || 0) * 100)}% confidence
            </Badge>
          </div>
          
          {suggestion.suggestedResponse?.content && (
            <div className="prose prose-sm max-w-none mb-3">
              <p className="text-secondary-700">{suggestion.suggestedResponse.content}</p>
            </div>
          )}

          {suggestion.knowledgeMatches && suggestion.knowledgeMatches.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-secondary-700 mb-1">Referenced Articles:</p>
              <div className="space-y-1">
                {suggestion.knowledgeMatches.slice(0, 3).map((match: any, index: number) => (
                  <div key={index} className="text-xs text-blue-600">
                    • {match.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-1 ml-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(!showDetails)}
            icon={<Eye className="h-3 w-3" />}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<ThumbsUp className="h-3 w-3" />}
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<ThumbsDown className="h-3 w-3" />}
          />
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">Classification:</span>
              <p>{suggestion.classification?.category?.category || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">Processing Time:</span>
              <p>{suggestion.processingMetadata?.processingTimeMs || 0}ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Conversation Message Component
function ConversationMessage({ message }: { message: any }) {
  const isAI = message.authorType === 'system' || message.metadata?.aiGenerated
  const isAgent = message.authorType === 'agent'

  return (
    <div className={`flex ${isAI || isAgent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-3xl ${isAI ? 'bg-blue-50 border-blue-200' : isAgent ? 'bg-green-50 border-green-200' : 'bg-secondary-50 border-secondary-200'} border rounded-lg p-4`}>
        <div className="flex items-center space-x-2 mb-2">
          {isAI ? (
            <Bot className="h-4 w-4 text-blue-500" />
          ) : isAgent ? (
            <User className="h-4 w-4 text-green-500" />
          ) : (
            <User className="h-4 w-4 text-secondary-500" />
          )}
          <span className="text-sm font-medium">
            {isAI ? 'AI Assistant' : `${message.author?.firstName || 'User'} ${message.author?.lastName || ''}`}
          </span>
          <span className="text-xs text-secondary-500">
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{message.message}</p>
        </div>
        
        {message.metadata?.citedArticles && message.metadata.citedArticles.length > 0 && (
          <div className="mt-3 pt-3 border-t border-secondary-200">
            <p className="text-xs font-medium text-secondary-700 mb-1">Referenced Articles:</p>
            <div className="space-y-1">
              {message.metadata.citedArticles.map((articleId: string, index: number) => (
                <div key={index} className="text-xs text-blue-600">
                  • Article #{articleId}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
