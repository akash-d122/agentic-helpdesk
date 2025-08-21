import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Eye, 
  Edit3, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAISuggestion, useSubmitAIReview } from '@hooks/useAI'
import { formatDate, formatRelativeTime } from '@utils/helpers'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import Tabs from '@components/ui/Tabs'
import ResponseEditor from '@components/ai/ResponseEditor'
import ApprovalWorkflow from '@components/ai/ApprovalWorkflow'

// Mock data for templates and approval workflow
const mockTemplates = [
  {
    id: '1',
    name: 'Password Reset Confirmation',
    content: 'Hello {{customer_name}},\n\nYour password has been successfully reset for ticket {{ticket_id}}. You can now log in with your new password.\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{{agent_name}}',
    category: 'account',
    variables: ['customer_name', 'ticket_id', 'agent_name']
  },
  {
    id: '2',
    name: 'Technical Issue Resolution',
    content: 'Hello {{customer_name}},\n\nThank you for reporting the technical issue in ticket {{ticket_id}}. We have investigated the problem and implemented a fix.\n\nThe issue has been resolved and you should no longer experience any problems. Please let us know if you continue to have any difficulties.\n\nBest regards,\n{{agent_name}}',
    category: 'technical',
    variables: ['customer_name', 'ticket_id', 'agent_name']
  },
  {
    id: '3',
    name: 'General Inquiry Response',
    content: 'Hello {{customer_name}},\n\nThank you for your inquiry regarding {{ticket_subject}}. We appreciate you taking the time to contact us.\n\nWe have reviewed your request and will provide you with a detailed response shortly. If you have any urgent concerns, please don\'t hesitate to reach out.\n\nBest regards,\n{{agent_name}}',
    category: 'general',
    variables: ['customer_name', 'ticket_subject', 'agent_name']
  }
]

const mockApprovalSteps = [
  {
    id: 'agent-review',
    name: 'Agent Review',
    description: 'Initial review by assigned agent',
    required: true,
    approvers: [
      { id: '1', name: 'John Smith', role: 'Agent', email: 'john@example.com' }
    ],
    status: 'approved' as const,
    approvedBy: { id: '1', name: 'John Smith', role: 'Agent' },
    approvedAt: new Date(Date.now() - 3600000).toISOString(),
    comments: 'Response looks good, approved for senior review'
  },
  {
    id: 'senior-review',
    name: 'Senior Agent Review',
    description: 'Review by senior agent for quality assurance',
    required: true,
    approvers: [
      { id: '2', name: 'Sarah Johnson', role: 'Senior Agent', email: 'sarah@example.com' }
    ],
    status: 'pending' as const,
    deadline: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
  },
  {
    id: 'final-approval',
    name: 'Final Approval',
    description: 'Final approval before sending to customer',
    required: false,
    approvers: [
      { id: '3', name: 'Mike Wilson', role: 'Team Lead', email: 'mike@example.com' }
    ],
    status: 'pending' as const
  }
]

export default function ResponseManagementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: suggestion, isLoading, error, refetch } = useAISuggestion(id!)
  const submitReview = useSubmitAIReview()
  
  const [activeTab, setActiveTab] = useState('editor')
  const [currentApprovalStep, setCurrentApprovalStep] = useState(1)
  const [approvalSteps, setApprovalSteps] = useState(mockApprovalSteps)
  const [responseContent, setResponseContent] = useState('')
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)

  useEffect(() => {
    if (suggestion?.suggestedResponse?.content) {
      setResponseContent(suggestion.suggestedResponse.content)
    }
  }, [suggestion])

  const handleSaveResponse = async (content: string, metadata?: any) => {
    // Save draft response
    setResponseContent(content)
    // In a real implementation, this would save to the backend
    console.log('Saving response:', { content, metadata })
  }

  const handleSubmitResponse = async (content: string, metadata?: any) => {
    if (requireApproval) {
      setShowApprovalWorkflow(true)
      setResponseContent(content)
    } else {
      // Submit directly
      try {
        await submitReview.mutateAsync({
          suggestionId: id!,
          review: {
            decision: 'approve',
            modifiedResponse: content,
            feedback: {
              responseQuality: 'good',
              overallSatisfaction: 4
            }
          }
        })
        
        toast.success('Response sent successfully')
        navigate('/ai/suggestions')
      } catch (error) {
        toast.error('Failed to send response')
      }
    }
  }

  const handleApprovalAction = async (stepId: string, action: string, comments?: string) => {
    const stepIndex = approvalSteps.findIndex(step => step.id === stepId)
    if (stepIndex === -1) return

    const updatedSteps = [...approvalSteps]
    const step = updatedSteps[stepIndex]

    switch (action) {
      case 'approve':
        step.status = 'approved'
        step.approvedBy = { id: 'current-user', name: 'Current User', role: 'Agent' }
        step.approvedAt = new Date().toISOString()
        step.comments = comments
        
        // Move to next step
        if (stepIndex < approvalSteps.length - 1) {
          setCurrentApprovalStep(stepIndex + 1)
        } else {
          // Final approval - send response
          await submitReview.mutateAsync({
            suggestionId: id!,
            review: {
              decision: 'approve',
              modifiedResponse: responseContent,
              feedback: {
                responseQuality: 'good',
                overallSatisfaction: 5
              }
            }
          })
          
          toast.success('Response approved and sent')
          navigate('/ai/suggestions')
          return
        }
        break
        
      case 'reject':
        step.status = 'rejected'
        step.rejectedBy = { id: 'current-user', name: 'Current User', role: 'Agent' }
        step.rejectedAt = new Date().toISOString()
        step.comments = comments
        
        toast.error('Response rejected - workflow stopped')
        setShowApprovalWorkflow(false)
        break
        
      case 'skip':
        step.status = 'skipped'
        step.comments = comments
        
        // Move to next step
        if (stepIndex < approvalSteps.length - 1) {
          setCurrentApprovalStep(stepIndex + 1)
        }
        break
    }

    setApprovalSteps(updatedSteps)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !suggestion) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-error-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">
          Suggestion Not Found
        </h3>
        <p className="text-secondary-500 mb-4">
          The AI suggestion you're looking for doesn't exist or has been removed.
        </p>
        <Button as={Link} to="/ai/suggestions" variant="outline">
          Back to Suggestions
        </Button>
      </div>
    )
  }

  const tabs = [
    { id: 'editor', label: 'Response Editor', icon: <Edit3 className="h-4 w-4" /> },
    { id: 'approval', label: 'Approval Workflow', icon: <CheckCircle className="h-4 w-4" /> },
    { id: 'context', label: 'Ticket Context', icon: <FileText className="h-4 w-4" /> }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            as={Link}
            to="/ai/suggestions"
            variant="ghost"
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">
              Response Management
            </h1>
            <p className="text-sm text-secondary-500">
              Ticket #{suggestion.ticketId._id?.slice(-6)} • {formatRelativeTime(suggestion.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={
            suggestion.confidence?.recommendation === 'auto_resolve' ? 'success' :
            suggestion.confidence?.recommendation === 'agent_review' ? 'primary' :
            suggestion.confidence?.recommendation === 'human_review' ? 'warning' : 'error'
          }>
            {suggestion.confidence?.recommendation?.replace('_', ' ') || 'Unknown'}
          </Badge>
          
          <Badge variant="outline">
            {((suggestion.confidence?.calibrated || 0) * 100).toFixed(0)}% confidence
          </Badge>
        </div>
      </div>

      {/* Settings Bar */}
      <Card>
        <Card.Body className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-secondary-500" />
                <span className="text-sm font-medium text-secondary-700">Workflow Settings:</span>
              </div>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={(e) => setRequireApproval(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="text-sm text-secondary-700">Require Approval</span>
              </label>
            </div>
            
            <div className="text-sm text-secondary-500">
              {requireApproval ? `${approvalSteps.length} approval steps configured` : 'Direct send enabled'}
            </div>
          </div>
        </Card.Body>
      </Card>

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
          {activeTab === 'editor' && (
            <ResponseEditor
              initialContent={suggestion.suggestedResponse?.content || ''}
              suggestion={suggestion}
              templates={mockTemplates}
              onSave={handleSaveResponse}
              onSubmit={handleSubmitResponse}
              onCancel={() => navigate('/ai/suggestions')}
              requireApproval={requireApproval}
              showApprovalWorkflow={showApprovalWorkflow}
            />
          )}
          
          {activeTab === 'approval' && (
            <ApprovalWorkflow
              suggestionId={id!}
              responseContent={responseContent}
              currentStep={currentApprovalStep}
              steps={approvalSteps}
              onApprove={(stepId, comments) => handleApprovalAction(stepId, 'approve', comments)}
              onReject={(stepId, reason) => handleApprovalAction(stepId, 'reject', reason)}
              onSkip={(stepId, reason) => handleApprovalAction(stepId, 'skip', reason)}
              onEscalate={(stepId, escalateTo, reason) => handleApprovalAction(stepId, 'escalate', reason)}
              canApprove={true}
              canReject={true}
              canSkip={true}
              canEscalate={true}
            />
          )}
          
          {activeTab === 'context' && (
            <TicketContext suggestion={suggestion} />
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

// Ticket Context Component
function TicketContext({ suggestion }: { suggestion: any }) {
  return (
    <div className="space-y-6">
      {/* Ticket Information */}
      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Ticket Information</h4>
        <div className="bg-secondary-50 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-secondary-700">Subject:</span>
              <p className="text-sm text-secondary-900 mt-1">{suggestion.ticketId.subject}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-secondary-700">Priority:</span>
              <div className="mt-1">
                <Badge variant="outline">{suggestion.ticketId.priority}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-secondary-700">Status:</span>
              <div className="mt-1">
                <Badge variant="outline">{suggestion.ticketId.status}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-secondary-700">Created:</span>
              <p className="text-sm text-secondary-900 mt-1">
                {formatDate(suggestion.ticketId.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Classification */}
      <div>
        <h4 className="font-medium text-secondary-900 mb-3">AI Classification</h4>
        <div className="bg-secondary-50 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-secondary-700">Category:</span>
              <p className="text-sm text-secondary-900 mt-1">
                {suggestion.classification?.category?.category || 'Unknown'}
              </p>
            </div>
            <div>
              <span className="text-sm font-medium text-secondary-700">Confidence:</span>
              <p className="text-sm text-secondary-900 mt-1">
                {((suggestion.classification?.category?.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Knowledge Matches */}
      {suggestion.knowledgeMatches && suggestion.knowledgeMatches.length > 0 && (
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">
            Knowledge Base Matches ({suggestion.knowledgeMatches.length})
          </h4>
          <div className="space-y-3">
            {suggestion.knowledgeMatches.slice(0, 3).map((match: any, index: number) => (
              <div key={index} className="border border-secondary-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <h5 className="font-medium text-secondary-900">{match.title}</h5>
                  <Badge variant="outline" size="sm">
                    {(match.score * 100).toFixed(0)}% match
                  </Badge>
                </div>
                {match.summary && (
                  <p className="text-sm text-secondary-600 mt-2">{match.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
