import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Brain, 
  CheckCircle, 
  XCircle, 
  Edit3, 
  Flag, 
  Clock, 
  User, 
  FileText, 
  MessageSquare,
  Zap,
  AlertTriangle,
  TrendingUp,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useAISuggestion, useSubmitAIReview } from '@hooks/useAI'
import { formatDate, formatRelativeTime } from '@utils/helpers'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import RichTextEditor from '@components/ui/RichTextEditor'
import Tabs from '@components/ui/Tabs'

export default function AISuggestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: suggestion, isLoading, error } = useAISuggestion(id!)
  const submitReview = useSubmitAIReview()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewData, setReviewData] = useState({
    decision: 'approve' as 'approve' | 'modify' | 'reject' | 'escalate',
    modifiedResponse: '',
    feedback: {
      classificationAccuracy: 'correct' as 'correct' | 'incorrect' | 'partial',
      knowledgeRelevance: 'relevant' as 'relevant' | 'irrelevant' | 'partial',
      responseQuality: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
      overallSatisfaction: 4,
      comments: '',
      improvements: [] as string[]
    }
  })

  useEffect(() => {
    if (suggestion?.suggestedResponse?.content) {
      setReviewData(prev => ({
        ...prev,
        modifiedResponse: suggestion.suggestedResponse.content
      }))
    }
  }, [suggestion])

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync({
        suggestionId: id!,
        review: reviewData
      })
      
      toast.success('Review submitted successfully')
      navigate('/ai/suggestions')
    } catch (error) {
      toast.error('Failed to submit review')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
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

  const canReview = suggestion.status === 'completed' && !suggestion.humanReview
  const confidence = suggestion.confidence?.calibrated || suggestion.confidence?.overall || 0

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye className="h-4 w-4" /> },
    { id: 'classification', label: 'Classification', icon: <Brain className="h-4 w-4" /> },
    { id: 'knowledge', label: 'Knowledge Matches', icon: <FileText className="h-4 w-4" /> },
    { id: 'response', label: 'Generated Response', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'confidence', label: 'Confidence Analysis', icon: <TrendingUp className="h-4 w-4" /> }
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
              AI Suggestion Review
            </h1>
            <p className="text-sm text-secondary-500">
              Ticket #{suggestion.ticketId._id?.slice(-6)} • {formatRelativeTime(suggestion.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {suggestion.autoResolve && (
            <Badge variant="success">
              <Zap className="h-3 w-3 mr-1" />
              Auto-Resolve Candidate
            </Badge>
          )}
          <Badge variant={
            suggestion.status === 'completed' ? 'success' :
            suggestion.status === 'processing' ? 'primary' :
            suggestion.status === 'failed' ? 'error' : 'secondary'
          }>
            {suggestion.status}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-primary-600">
              {(confidence * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-secondary-500">Confidence Score</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-secondary-900">
              {suggestion.classification?.category?.category || 'Unknown'}
            </div>
            <div className="text-sm text-secondary-500">Category</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-secondary-900">
              {suggestion.classification?.priority?.priority || 'Unknown'}
            </div>
            <div className="text-sm text-secondary-500">Priority</div>
          </Card.Body>
        </Card>
        
        <Card>
          <Card.Body className="text-center">
            <div className="text-2xl font-bold text-secondary-900">
              {suggestion.knowledgeMatches?.length || 0}
            </div>
            <div className="text-sm text-secondary-500">Knowledge Matches</div>
          </Card.Body>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Ticket Context */}
        <div className="lg:col-span-1">
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">Ticket Context</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-700">Subject</label>
                <p className="text-sm text-secondary-900 mt-1">
                  {suggestion.ticketId.subject}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-secondary-700">Status</label>
                <div className="mt-1">
                  <Badge variant="outline">{suggestion.ticketId.status}</Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-secondary-700">Created</label>
                <p className="text-sm text-secondary-900 mt-1">
                  {formatDate(suggestion.ticketId.createdAt)}
                </p>
              </div>
              
              <div className="pt-4 border-t border-secondary-200">
                <Button
                  as={Link}
                  to={`/tickets/${suggestion.ticketId._id}`}
                  variant="outline"
                  size="sm"
                  icon={<ExternalLink className="h-4 w-4" />}
                  className="w-full"
                >
                  View Full Ticket
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Review Actions */}
          {canReview && (
            <Card className="mt-6">
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Review Actions</h3>
              </Card.Header>
              <Card.Body className="space-y-3">
                <Button
                  onClick={() => {
                    setReviewData(prev => ({ ...prev, decision: 'approve' }))
                    setShowReviewForm(true)
                  }}
                  variant="outline"
                  icon={<CheckCircle className="h-4 w-4" />}
                  className="w-full text-success-600 border-success-200 hover:bg-success-50"
                >
                  Approve
                </Button>
                
                <Button
                  onClick={() => {
                    setReviewData(prev => ({ ...prev, decision: 'modify' }))
                    setShowReviewForm(true)
                  }}
                  variant="outline"
                  icon={<Edit3 className="h-4 w-4" />}
                  className="w-full"
                >
                  Modify & Approve
                </Button>
                
                <Button
                  onClick={() => {
                    setReviewData(prev => ({ ...prev, decision: 'reject' }))
                    setShowReviewForm(true)
                  }}
                  variant="outline"
                  icon={<XCircle className="h-4 w-4" />}
                  className="w-full text-error-600 border-error-200 hover:bg-error-50"
                >
                  Reject
                </Button>
                
                <Button
                  onClick={() => {
                    setReviewData(prev => ({ ...prev, decision: 'escalate' }))
                    setShowReviewForm(true)
                  }}
                  variant="outline"
                  icon={<Flag className="h-4 w-4" />}
                  className="w-full text-warning-600 border-warning-200 hover:bg-warning-50"
                >
                  Escalate
                </Button>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Right Column - Detailed Analysis */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header>
              <Tabs
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </Card.Header>
            <Card.Body>
              {activeTab === 'overview' && (
                <OverviewTab suggestion={suggestion} />
              )}
              {activeTab === 'classification' && (
                <ClassificationTab suggestion={suggestion} />
              )}
              {activeTab === 'knowledge' && (
                <KnowledgeTab suggestion={suggestion} />
              )}
              {activeTab === 'response' && (
                <ResponseTab 
                  suggestion={suggestion} 
                  onCopy={copyToClipboard}
                />
              )}
              {activeTab === 'confidence' && (
                <ConfidenceTab suggestion={suggestion} />
              )}
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewFormModal
          suggestion={suggestion}
          reviewData={reviewData}
          onReviewDataChange={setReviewData}
          onSubmit={handleSubmitReview}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={submitReview.isLoading}
        />
      )}
    </div>
  )
}

// Tab Components
function OverviewTab({ suggestion }: { suggestion: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Processing Summary</h4>
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-secondary-500">Processing Time:</span>
              <span className="ml-2 font-medium">
                {suggestion.processingTime ? `${suggestion.processingTime}ms` : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-secondary-500">AI Provider:</span>
              <span className="ml-2 font-medium">{suggestion.aiProvider}</span>
            </div>
            <div>
              <span className="text-secondary-500">Trace ID:</span>
              <span className="ml-2 font-mono text-xs">{suggestion.traceId}</span>
            </div>
            <div>
              <span className="text-secondary-500">Auto-Resolve:</span>
              <span className="ml-2">
                {suggestion.autoResolve ? (
                  <Badge variant="success" size="sm">Yes</Badge>
                ) : (
                  <Badge variant="secondary" size="sm">No</Badge>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Recommendation</h4>
        <div className="flex items-center space-x-3">
          <Badge variant={
            suggestion.confidence?.recommendation === 'auto_resolve' ? 'success' :
            suggestion.confidence?.recommendation === 'agent_review' ? 'primary' :
            suggestion.confidence?.recommendation === 'human_review' ? 'warning' : 'error'
          }>
            {suggestion.confidence?.recommendation?.replace('_', ' ') || 'Unknown'}
          </Badge>
          <span className="text-sm text-secondary-500">
            Based on {((suggestion.confidence?.calibrated || 0) * 100).toFixed(0)}% confidence
          </span>
        </div>
      </div>

      {suggestion.errors && suggestion.errors.length > 0 && (
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">Processing Errors</h4>
          <div className="space-y-2">
            {suggestion.errors.map((error: any, index: number) => (
              <div key={index} className="bg-error-50 border border-error-200 p-3 rounded-lg">
                <div className="text-sm font-medium text-error-800">{error.step}</div>
                <div className="text-sm text-error-600 mt-1">{error.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClassificationTab({ suggestion }: { suggestion: any }) {
  const classification = suggestion.classification

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Category Classification</h4>
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-secondary-900">
              {classification?.category?.category || 'Unknown'}
            </span>
            <Badge variant="outline">
              {((classification?.category?.confidence || 0) * 100).toFixed(0)}% confidence
            </Badge>
          </div>
          {classification?.category?.matches && (
            <div className="text-sm text-secondary-600">
              <span className="font-medium">Matches:</span> {classification.category.matches.join(', ')}
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Priority Assessment</h4>
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-secondary-900">
              {classification?.priority?.priority || 'Unknown'}
            </span>
            <Badge variant="outline">
              {((classification?.priority?.confidence || 0) * 100).toFixed(0)}% confidence
            </Badge>
          </div>
          {classification?.priority?.reasoning && (
            <div className="text-sm text-secondary-600 mt-2">
              <span className="font-medium">Reasoning:</span>
              <ul className="list-disc list-inside mt-1">
                {classification.priority.reasoning.map((reason: string, index: number) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Routing Suggestions</h4>
        <div className="bg-secondary-50 p-4 rounded-lg">
          {classification?.routing?.suggestedAgents?.length > 0 ? (
            <div className="space-y-2">
              <div>
                <span className="font-medium text-secondary-700">Suggested Agents:</span>
                <div className="mt-1">
                  {classification.routing.suggestedAgents.map((agent: string, index: number) => (
                    <Badge key={index} variant="outline" className="mr-2">
                      {agent}
                    </Badge>
                  ))}
                </div>
              </div>
              {classification.routing.department && (
                <div>
                  <span className="font-medium text-secondary-700">Department:</span>
                  <span className="ml-2">{classification.routing.department}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-sm text-secondary-500">No specific routing suggestions</span>
          )}
        </div>
      </div>
    </div>
  )
}

function KnowledgeTab({ suggestion }: { suggestion: any }) {
  const matches = suggestion.knowledgeMatches || []

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-secondary-900">
        Knowledge Base Matches ({matches.length})
      </h4>

      {matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((match: any, index: number) => (
            <div key={index} className="border border-secondary-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-secondary-900">{match.title}</h5>
                <Badge variant="outline">
                  {(match.score * 100).toFixed(0)}% match
                </Badge>
              </div>

              {match.summary && (
                <p className="text-sm text-secondary-600 mb-3">{match.summary}</p>
              )}

              <div className="flex items-center space-x-4 text-xs text-secondary-500">
                <span>Category: {match.category}</span>
                <span>Views: {match.viewCount || 0}</span>
                <span>Helpful: {((match.helpfulnessRatio || 0) * 100).toFixed(0)}%</span>
              </div>

              {match.tags && match.tags.length > 0 && (
                <div className="mt-2">
                  {match.tags.map((tag: string, tagIndex: number) => (
                    <Badge key={tagIndex} variant="secondary" size="sm" className="mr-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-secondary-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No knowledge base matches found</p>
        </div>
      )}
    </div>
  )
}

function ResponseTab({ suggestion, onCopy }: { suggestion: any; onCopy: (text: string) => void }) {
  const response = suggestion.suggestedResponse

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-secondary-900">Generated Response</h4>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{response?.type || 'Unknown'}</Badge>
            <Button
              onClick={() => onCopy(response?.content || '')}
              variant="ghost"
              size="sm"
              icon={<Copy className="h-4 w-4" />}
            >
              Copy
            </Button>
          </div>
        </div>

        <div className="bg-white border border-secondary-200 rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-secondary-700">
              {response?.content || 'No response generated'}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center space-x-4 text-sm text-secondary-500">
          <span>Confidence: {((response?.confidence || 0) * 100).toFixed(0)}%</span>
          {response?.metadata?.generationTime && (
            <span>Generation Time: {response.metadata.generationTime}ms</span>
          )}
          {response?.metadata?.template && (
            <span>Template: {response.metadata.template}</span>
          )}
        </div>
      </div>

      {response?.metadata?.knowledgeUsed && (
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">Knowledge Sources Used</h4>
          <div className="bg-secondary-50 p-4 rounded-lg">
            <span className="text-sm text-secondary-600">
              {response.metadata.knowledgeUsed} knowledge base articles were referenced
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfidenceTab({ suggestion }: { suggestion: any }) {
  const confidence = suggestion.confidence

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Overall Confidence</h4>
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-secondary-900">
              {((confidence?.calibrated || confidence?.overall || 0) * 100).toFixed(1)}%
            </span>
            <Badge variant={
              (confidence?.calibrated || 0) >= 0.8 ? 'success' :
              (confidence?.calibrated || 0) >= 0.6 ? 'warning' : 'error'
            }>
              {(confidence?.calibrated || 0) >= 0.8 ? 'High' :
               (confidence?.calibrated || 0) >= 0.6 ? 'Medium' : 'Low'} Confidence
            </Badge>
          </div>
          <div className="text-sm text-secondary-600">
            Calibrated score based on historical performance
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Component Breakdown</h4>
        <div className="space-y-3">
          {confidence?.components && Object.entries(confidence.components).map(([component, score]: [string, any]) => (
            <div key={component} className="flex items-center justify-between">
              <span className="text-sm text-secondary-700 capitalize">
                {component.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-secondary-200 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full"
                    style={{ width: `${(score || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-secondary-900 w-12 text-right">
                  {((score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-secondary-900 mb-3">Quality Factors</h4>
        <div className="space-y-3">
          {confidence?.factors && Object.entries(confidence.factors).map(([factor, score]: [string, any]) => (
            <div key={factor} className="flex items-center justify-between">
              <span className="text-sm text-secondary-700 capitalize">
                {factor.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-secondary-200 rounded-full h-2">
                  <div
                    className="bg-secondary-500 h-2 rounded-full"
                    style={{ width: `${(score || 0) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-secondary-900 w-12 text-right">
                  {((score || 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Review Form Modal Component
interface ReviewFormModalProps {
  suggestion: any
  reviewData: any
  onReviewDataChange: (data: any) => void
  onSubmit: () => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

function ReviewFormModal({
  suggestion,
  reviewData,
  onReviewDataChange,
  onSubmit,
  onCancel,
  isSubmitting
}: ReviewFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-secondary-900 mb-4">
            Submit Review
          </h3>

          {/* Decision Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'approve', label: 'Approve', icon: CheckCircle, color: 'success' },
                { value: 'modify', label: 'Modify', icon: Edit3, color: 'primary' },
                { value: 'reject', label: 'Reject', icon: XCircle, color: 'error' },
                { value: 'escalate', label: 'Escalate', icon: Flag, color: 'warning' }
              ].map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onReviewDataChange({ ...reviewData, decision: value })}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    reviewData.decision === value
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modified Response */}
          {reviewData.decision === 'modify' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Modified Response
              </label>
              <RichTextEditor
                value={reviewData.modifiedResponse}
                onChange={(value) => onReviewDataChange({
                  ...reviewData,
                  modifiedResponse: value
                })}
                placeholder="Edit the AI response..."
                height={200}
              />
            </div>
          )}

          {/* Feedback Form */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium text-secondary-900">Feedback</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Classification Accuracy
                </label>
                <select
                  value={reviewData.feedback.classificationAccuracy}
                  onChange={(e) => onReviewDataChange({
                    ...reviewData,
                    feedback: { ...reviewData.feedback, classificationAccuracy: e.target.value }
                  })}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="correct">Correct</option>
                  <option value="partial">Partially Correct</option>
                  <option value="incorrect">Incorrect</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Response Quality
                </label>
                <select
                  value={reviewData.feedback.responseQuality}
                  onChange={(e) => onReviewDataChange({
                    ...reviewData,
                    feedback: { ...reviewData.feedback, responseQuality: e.target.value }
                  })}
                  className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Overall Satisfaction (1-5)
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={reviewData.feedback.overallSatisfaction}
                onChange={(e) => onReviewDataChange({
                  ...reviewData,
                  feedback: { ...reviewData.feedback, overallSatisfaction: parseInt(e.target.value) }
                })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-secondary-500 mt-1">
                <span>Poor</span>
                <span className="font-medium">{reviewData.feedback.overallSatisfaction}</span>
                <span>Excellent</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Comments
              </label>
              <textarea
                value={reviewData.feedback.comments}
                onChange={(e) => onReviewDataChange({
                  ...reviewData,
                  feedback: { ...reviewData.feedback, comments: e.target.value }
                })}
                rows={3}
                className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Additional feedback for AI improvement..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              loading={isSubmitting}
              icon={<Send className="h-4 w-4" />}
            >
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
