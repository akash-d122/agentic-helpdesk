import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle,
  Send,
  Eye,
  Edit3,
  Flag,
  ArrowRight,
  Users,
  Calendar,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

import Button from '@components/ui/Button'
import Card from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import Modal from '@components/ui/Modal'
import Avatar from '@components/ui/Avatar'
import { formatDate, formatRelativeTime } from '@utils/helpers'

interface ApprovalStep {
  id: string
  name: string
  description: string
  required: boolean
  approvers: {
    id: string
    name: string
    role: string
    email: string
  }[]
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  approvedBy?: {
    id: string
    name: string
    role: string
  }
  approvedAt?: string
  rejectedBy?: {
    id: string
    name: string
    role: string
  }
  rejectedAt?: string
  comments?: string
  deadline?: string
}

interface ApprovalWorkflowProps {
  suggestionId: string
  responseContent: string
  currentStep: number
  steps: ApprovalStep[]
  onApprove: (stepId: string, comments?: string) => Promise<void>
  onReject: (stepId: string, reason: string) => Promise<void>
  onSkip: (stepId: string, reason: string) => Promise<void>
  onEscalate: (stepId: string, escalateTo: string, reason: string) => Promise<void>
  canApprove: boolean
  canReject: boolean
  canSkip: boolean
  canEscalate: boolean
}

export default function ApprovalWorkflow({
  suggestionId,
  responseContent,
  currentStep,
  steps,
  onApprove,
  onReject,
  onSkip,
  onEscalate,
  canApprove,
  canReject,
  canSkip,
  canEscalate
}: ApprovalWorkflowProps) {
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'skip' | 'escalate'>('approve')
  const [comments, setComments] = useState('')
  const [escalateTo, setEscalateTo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentStepData = steps[currentStep]
  const isCompleted = currentStep >= steps.length
  const isLastStep = currentStep === steps.length - 1

  const handleAction = async () => {
    if (!currentStepData) return

    try {
      setSubmitting(true)
      
      switch (actionType) {
        case 'approve':
          await onApprove(currentStepData.id, comments)
          toast.success('Response approved')
          break
        case 'reject':
          await onReject(currentStepData.id, comments)
          toast.success('Response rejected')
          break
        case 'skip':
          await onSkip(currentStepData.id, comments)
          toast.success('Step skipped')
          break
        case 'escalate':
          await onEscalate(currentStepData.id, escalateTo, comments)
          toast.success('Response escalated')
          break
      }
      
      setShowActionModal(false)
      setComments('')
      setEscalateTo('')
    } catch (error) {
      toast.error(`Failed to ${actionType} response`)
    } finally {
      setSubmitting(false)
    }
  }

  const openActionModal = (action: typeof actionType) => {
    setActionType(action)
    setShowActionModal(true)
  }

  const getStepIcon = (step: ApprovalStep, index: number) => {
    if (index < currentStep) {
      return step.status === 'approved' ? (
        <CheckCircle className="h-5 w-5 text-success-500" />
      ) : step.status === 'rejected' ? (
        <XCircle className="h-5 w-5 text-error-500" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-warning-500" />
      )
    } else if (index === currentStep) {
      return <Clock className="h-5 w-5 text-primary-500" />
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-secondary-300" />
    }
  }

  const getStepStatus = (step: ApprovalStep, index: number) => {
    if (index < currentStep) {
      return step.status === 'approved' ? 'success' : 
             step.status === 'rejected' ? 'error' : 'warning'
    } else if (index === currentStep) {
      return 'primary'
    } else {
      return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">Approval Workflow</h3>
              <p className="text-sm text-secondary-500">
                {isCompleted ? 'Workflow completed' : `Step ${currentStep + 1} of ${steps.length}`}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {isCompleted ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              ) : (
                <Badge variant="primary">
                  <Clock className="h-3 w-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                {/* Step Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step, index)}
                </div>
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-secondary-900">{step.name}</h4>
                    <Badge variant={getStepStatus(step, index) as any} size="sm">
                      {index < currentStep ? step.status : 
                       index === currentStep ? 'current' : 'pending'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-secondary-600 mt-1">{step.description}</p>
                  
                  {/* Approvers */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Users className="h-4 w-4 text-secondary-400" />
                    <div className="flex -space-x-1">
                      {step.approvers.slice(0, 3).map(approver => (
                        <Avatar
                          key={approver.id}
                          name={approver.name}
                          size="sm"
                          className="border-2 border-white"
                        />
                      ))}
                      {step.approvers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-secondary-200 border-2 border-white flex items-center justify-center text-xs font-medium text-secondary-600">
                          +{step.approvers.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-secondary-500">
                      {step.approvers.length} approver{step.approvers.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Status Details */}
                  {step.status !== 'pending' && (
                    <div className="mt-3 p-3 bg-secondary-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm">
                        {step.status === 'approved' && step.approvedBy && (
                          <>
                            <CheckCircle className="h-4 w-4 text-success-500" />
                            <span className="text-success-700">
                              Approved by {step.approvedBy.name}
                            </span>
                            <span className="text-secondary-500">
                              {formatRelativeTime(step.approvedAt!)}
                            </span>
                          </>
                        )}
                        
                        {step.status === 'rejected' && step.rejectedBy && (
                          <>
                            <XCircle className="h-4 w-4 text-error-500" />
                            <span className="text-error-700">
                              Rejected by {step.rejectedBy.name}
                            </span>
                            <span className="text-secondary-500">
                              {formatRelativeTime(step.rejectedAt!)}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {step.comments && (
                        <p className="text-sm text-secondary-600 mt-2">{step.comments}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Deadline Warning */}
                  {step.deadline && index === currentStep && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-warning-600">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {formatDate(step.deadline)}</span>
                    </div>
                  )}
                </div>
                
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 mt-8 w-px h-8 bg-secondary-200" />
                )}
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Current Step Actions */}
      {!isCompleted && currentStepData && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium text-secondary-900">
              Current Step: {currentStepData.name}
            </h3>
          </Card.Header>
          
          <Card.Body>
            <div className="space-y-4">
              {/* Response Preview */}
              <div>
                <h4 className="font-medium text-secondary-900 mb-2">Response to Review</h4>
                <div className="bg-secondary-50 p-4 rounded-lg">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-secondary-700">
                      {responseContent}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {canApprove && (
                  <Button
                    onClick={() => openActionModal('approve')}
                    variant="outline"
                    icon={<CheckCircle className="h-4 w-4" />}
                    className="text-success-600 border-success-200 hover:bg-success-50"
                  >
                    {isLastStep ? 'Approve & Send' : 'Approve'}
                  </Button>
                )}
                
                {canReject && (
                  <Button
                    onClick={() => openActionModal('reject')}
                    variant="outline"
                    icon={<XCircle className="h-4 w-4" />}
                    className="text-error-600 border-error-200 hover:bg-error-50"
                  >
                    Reject
                  </Button>
                )}
                
                {canSkip && !currentStepData.required && (
                  <Button
                    onClick={() => openActionModal('skip')}
                    variant="outline"
                    icon={<ArrowRight className="h-4 w-4" />}
                    className="text-warning-600 border-warning-200 hover:bg-warning-50"
                  >
                    Skip Step
                  </Button>
                )}
                
                {canEscalate && (
                  <Button
                    onClick={() => openActionModal('escalate')}
                    variant="outline"
                    icon={<Flag className="h-4 w-4" />}
                  >
                    Escalate
                  </Button>
                )}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} Response`}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-secondary-50 p-4 rounded-lg">
            <p className="text-sm text-secondary-700">
              You are about to {actionType} this response for step "{currentStepData?.name}".
              {actionType === 'approve' && isLastStep && ' This will send the response to the customer.'}
            </p>
          </div>
          
          {actionType === 'escalate' && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Escalate To
              </label>
              <select
                value={escalateTo}
                onChange={(e) => setEscalateTo(e.target.value)}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select person to escalate to...</option>
                <option value="senior-agent">Senior Agent</option>
                <option value="team-lead">Team Lead</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              {actionType === 'reject' ? 'Rejection Reason' : 'Comments'} 
              {actionType === 'reject' ? ' (Required)' : ' (Optional)'}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              placeholder={
                actionType === 'reject' 
                  ? 'Please explain why you are rejecting this response...'
                  : 'Add any additional comments...'
              }
              required={actionType === 'reject'}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowActionModal(false)}
              variant="outline"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              loading={submitting}
              disabled={
                (actionType === 'reject' && !comments.trim()) ||
                (actionType === 'escalate' && !escalateTo)
              }
              icon={
                actionType === 'approve' ? <CheckCircle className="h-4 w-4" /> :
                actionType === 'reject' ? <XCircle className="h-4 w-4" /> :
                actionType === 'escalate' ? <Flag className="h-4 w-4" /> :
                <ArrowRight className="h-4 w-4" />
              }
            >
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
