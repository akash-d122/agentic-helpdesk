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
