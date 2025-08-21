import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Zap,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Edit3,
  Send,
  Archive,
  Flag,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  Download,
  Upload,
  Keyboard,
  Square,
  CheckSquare,
  Minus
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'

import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime } from '@utils/helpers'
import { apiService } from '@services/api'
import { useAISuggestions, useSubmitAIReview, useBulkAIOperation } from '@hooks/useAI'

import DataTable from '@components/ui/DataTable'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import SearchBar from '@components/ui/SearchBar'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import Card from '@components/ui/Card'
import Modal from '@components/ui/Modal'
import Dropdown from '@components/ui/Dropdown'
import Tooltip from '@components/ui/Tooltip'
import Checkbox from '@components/ui/Checkbox'
import LoadingSpinner from '@components/ui/LoadingSpinner'

interface AISuggestion {
  _id: string
  ticketId: {
    _id: string
    subject: string
    priority: string
    status: string
    createdAt: string
  }
  status: string
  confidence: {
    overall: number
    calibrated: number
    recommendation: string
  }
  autoResolve: boolean
  classification: {
    category: {
      category: string
      confidence: number
    }
    priority: {
      priority: string
      confidence: number
    }
  }
  suggestedResponse: {
    content: string
    type: string
    confidence: number
  }
  humanReview?: {
    reviewedBy: {
      firstName: string
      lastName: string
    }
    reviewedAt: string
    decision: string
    feedback: any
  }
  createdAt: string
  updatedAt: string
}

export default function AISuggestionsPage() {
  const permissions = usePermissions()

  // State management
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    status: '',
    recommendation: '',
    autoResolve: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
  const [showBatchActions, setShowBatchActions] = useState(false)
  const [showQuickReview, setShowQuickReview] = useState(false)
  const [currentSuggestion, setCurrentSuggestion] = useState<AISuggestion | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // API hooks
  const { data: suggestionsData, isLoading, refetch } = useAISuggestions(filters)
  const submitReview = useSubmitAIReview()
  const bulkOperation = useBulkAIOperation()

  const suggestions = suggestionsData?.suggestions || []
  const pagination = suggestionsData?.pagination || {}
  const stats = suggestionsData?.stats || null

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (event.key) {
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            refetch()
          }
          break
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSelectAll()
          }
          break
        case 'Escape':
          setSelectedSuggestions(new Set())
          setShowBatchActions(false)
          setShowQuickReview(false)
          break
        case '?':
          setShowKeyboardShortcuts(true)
          break
        case '1':
          if (selectedSuggestions.size > 0) {
            handleBulkApprove()
          }
          break
        case '2':
          if (selectedSuggestions.size > 0) {
            handleBulkReject()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedSuggestions, refetch])

  // Selection handlers
  const handleSelectSuggestion = useCallback((suggestionId: string, selected: boolean) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(suggestionId)
      } else {
        newSet.delete(suggestionId)
      }
      setShowBatchActions(newSet.size > 0)
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set())
      setShowBatchActions(false)
    } else {
      const allIds = new Set(suggestions.map(s => s._id))
      setSelectedSuggestions(allIds)
      setShowBatchActions(true)
    }
  }, [suggestions, selectedSuggestions.size])

  // Batch operations
  const handleBulkApprove = useCallback(async () => {
    try {
      await bulkOperation.mutateAsync({
        suggestionIds: Array.from(selectedSuggestions),
        operation: 'approve'
      })

      toast.success(`Approved ${selectedSuggestions.size} suggestions`)
      setSelectedSuggestions(new Set())
      setShowBatchActions(false)
      refetch()
    } catch (error) {
      toast.error('Failed to approve suggestions')
    }
  }, [selectedSuggestions, bulkOperation, refetch])

  const handleBulkReject = useCallback(async () => {
    try {
      await bulkOperation.mutateAsync({
        suggestionIds: Array.from(selectedSuggestions),
        operation: 'reject'
      })

      toast.success(`Rejected ${selectedSuggestions.size} suggestions`)
      setSelectedSuggestions(new Set())
      setShowBatchActions(false)
      refetch()
    } catch (error) {
      toast.error('Failed to reject suggestions')
    }
  }, [selectedSuggestions, bulkOperation, refetch])

  const handleBulkEscalate = useCallback(async () => {
    try {
      await bulkOperation.mutateAsync({
        suggestionIds: Array.from(selectedSuggestions),
        operation: 'escalate'
      })

      toast.success(`Escalated ${selectedSuggestions.size} suggestions`)
      setSelectedSuggestions(new Set())
      setShowBatchActions(false)
      refetch()
    } catch (error) {
      toast.error('Failed to escalate suggestions')
    }
  }, [selectedSuggestions, bulkOperation, refetch])

  // Search filters configuration
  const searchFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'processing', label: 'Processing' },
        { value: 'completed', label: 'Completed' },
        { value: 'reviewed', label: 'Reviewed' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' }
      ]
    },
    {
      key: 'recommendation',
      label: 'Recommendation',
      type: 'select' as const,
      options: [
        { value: 'auto_resolve', label: 'Auto Resolve' },
        { value: 'agent_review', label: 'Agent Review' },
        { value: 'human_review', label: 'Human Review' },
        { value: 'escalate', label: 'Escalate' }
      ]
    },
    {
      key: 'autoResolve',
      label: 'Auto Resolve',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Yes' },
        { value: 'false', label: 'No' }
      ]
    }
  ]

  // Table columns
  const columns = useMemo<ColumnDef<AISuggestion>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={(checked) => {
            table.toggleAllPageRowsSelected(!!checked)
            if (checked) {
              const allIds = new Set(suggestions.map(s => s._id))
              setSelectedSuggestions(allIds)
              setShowBatchActions(true)
            } else {
              setSelectedSuggestions(new Set())
              setShowBatchActions(false)
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedSuggestions.has(row.original._id)}
          onChange={(checked) => handleSelectSuggestion(row.original._id, checked)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40
    },
    {
      accessorKey: 'ticketId',
      header: 'Ticket',
      cell: ({ row }) => {
        const ticket = row.original.ticketId
        const suggestion = row.original

        return (
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <Link
                to={`/tickets/${ticket._id}`}
                className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
              >
                #{ticket._id.slice(-6)} - {ticket.subject}
              </Link>
              {suggestion.autoResolve && (
                <Badge variant="success" size="sm">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-secondary-500">
                {formatRelativeTime(ticket.createdAt)}
              </span>
              <Badge variant="outline" size="sm">
                {ticket.priority}
              </Badge>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'confidence',
      header: 'Confidence',
      cell: ({ row }) => {
        const confidence = row.original.confidence
        const score = confidence?.calibrated || confidence?.overall || 0
        const recommendation = confidence?.recommendation
        
        const getConfidenceColor = (score: number) => {
          if (score >= 0.8) return 'text-success-600'
          if (score >= 0.6) return 'text-warning-600'
          return 'text-error-600'
        }
        
        return (
          <div className="text-center">
            <div className={`text-sm font-medium ${getConfidenceColor(score)}`}>
              {(score * 100).toFixed(0)}%
            </div>
            {recommendation && (
              <Badge 
                variant={
                  recommendation === 'auto_resolve' ? 'success' :
                  recommendation === 'agent_review' ? 'primary' :
                  recommendation === 'human_review' ? 'warning' : 'error'
                }
                size="sm"
              >
                {recommendation.replace('_', ' ')}
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'classification',
      header: 'Classification',
      cell: ({ row }) => {
        const classification = row.original.classification
        return (
          <div className="text-sm">
            <div className="font-medium text-secondary-900">
              {classification?.category?.category || 'Unknown'}
            </div>
            <div className="text-secondary-500">
              Priority: {classification?.priority?.priority || 'Unknown'}
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const autoResolve = row.original.autoResolve
        
        const variants = {
          pending: 'secondary',
          processing: 'primary',
          completed: 'success',
          reviewed: 'primary',
          approved: 'success',
          rejected: 'error',
          failed: 'error'
        } as const
        
        return (
          <div className="space-y-1">
            <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {autoResolve && (
              <Badge variant="success" size="sm">
                <Zap className="h-3 w-3 mr-1" />
                Auto
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: 'humanReview',
      header: 'Review',
      cell: ({ row }) => {
        const review = row.original.humanReview
        
        if (!review) {
          return (
            <span className="text-sm text-secondary-500 italic">
              Not reviewed
            </span>
          )
        }
        
        const decisionIcons = {
          approve: <CheckCircle className="h-4 w-4 text-success-500" />,
          reject: <XCircle className="h-4 w-4 text-error-500" />,
          modify: <AlertTriangle className="h-4 w-4 text-warning-500" />,
          escalate: <AlertTriangle className="h-4 w-4 text-error-500" />
        }
        
        return (
          <div className="flex items-center space-x-2">
            {decisionIcons[review.decision as keyof typeof decisionIcons]}
            <div className="text-sm">
              <div className="font-medium text-secondary-900">
                {review.reviewedBy.firstName} {review.reviewedBy.lastName}
              </div>
              <div className="text-secondary-500">
                {formatRelativeTime(review.reviewedAt)}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const suggestion = row.original
        const canReview = suggestion.status === 'completed' && !suggestion.humanReview

        return (
          <div className="flex items-center space-x-1">
            {/* Quick Actions */}
            {canReview && (
              <>
                <Tooltip content="Quick Approve (1)">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickApprove(suggestion)}
                    className="text-success-600 hover:text-success-700 hover:bg-success-50"
                    icon={<CheckCircle className="h-4 w-4" />}
                  />
                </Tooltip>

                <Tooltip content="Quick Reject (2)">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickReject(suggestion)}
                    className="text-error-600 hover:text-error-700 hover:bg-error-50"
                    icon={<XCircle className="h-4 w-4" />}
                  />
                </Tooltip>

                <Tooltip content="Edit Response">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditResponse(suggestion)}
                    className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                    icon={<Edit3 className="h-4 w-4" />}
                  />
                </Tooltip>
              </>
            )}

            {/* View Details */}
            <Tooltip content="View Details">
              <Button
                as={Link}
                to={`/ai/suggestions/${suggestion._id}`}
                variant="ghost"
                size="sm"
                icon={<Eye className="h-4 w-4" />}
              />
            </Tooltip>

            {/* More Actions */}
            <Dropdown
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MoreHorizontal className="h-4 w-4" />}
                />
              }
              items={[
                {
                  label: 'Full Review',
                  icon: <Brain className="h-4 w-4" />,
                  onClick: () => window.open(`/ai/suggestions/${suggestion._id}/review`, '_blank'),
                  disabled: !canReview
                },
                {
                  label: 'View Ticket',
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => window.open(`/tickets/${suggestion.ticketId._id}`, '_blank')
                },
                {
                  label: 'Escalate',
                  icon: <Flag className="h-4 w-4" />,
                  onClick: () => handleEscalate(suggestion),
                  disabled: !canReview
                },
                {
                  label: 'Archive',
                  icon: <Archive className="h-4 w-4" />,
                  onClick: () => handleArchive(suggestion)
                }
              ]}
            />
          </div>
        )
      },
      enableSorting: false,
      size: 200
    }
  ], [])

  // Quick action handlers
  const handleQuickApprove = useCallback(async (suggestion: AISuggestion) => {
    try {
      await submitReview.mutateAsync({
        suggestionId: suggestion._id,
        review: {
          decision: 'approve',
          feedback: {
            classificationAccuracy: 'correct',
            knowledgeRelevance: 'relevant',
            responseQuality: 'good',
            overallSatisfaction: 4
          }
        }
      })

      toast.success('Suggestion approved')
      refetch()
    } catch (error) {
      toast.error('Failed to approve suggestion')
    }
  }, [submitReview, refetch])

  const handleQuickReject = useCallback(async (suggestion: AISuggestion) => {
    try {
      await submitReview.mutateAsync({
        suggestionId: suggestion._id,
        review: {
          decision: 'reject',
          feedback: {
            classificationAccuracy: 'incorrect',
            knowledgeRelevance: 'irrelevant',
            responseQuality: 'poor',
            overallSatisfaction: 2
          }
        }
      })

      toast.success('Suggestion rejected')
      refetch()
    } catch (error) {
      toast.error('Failed to reject suggestion')
    }
  }, [submitReview, refetch])

  const handleEditResponse = useCallback((suggestion: AISuggestion) => {
    setCurrentSuggestion(suggestion)
    setShowQuickReview(true)
  }, [])

  const handleEscalate = useCallback(async (suggestion: AISuggestion) => {
    try {
      await submitReview.mutateAsync({
        suggestionId: suggestion._id,
        review: {
          decision: 'escalate',
          feedback: {
            comments: 'Escalated for senior review'
          }
        }
      })

      toast.success('Suggestion escalated')
      refetch()
    } catch (error) {
      toast.error('Failed to escalate suggestion')
    }
  }, [submitReview, refetch])

  const handleArchive = useCallback(async (suggestion: AISuggestion) => {
    // Implementation for archiving suggestions
    toast.success('Suggestion archived')
  }, [])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 1 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleExport = useCallback(() => {
    // Implementation for exporting suggestions
    toast.success('Export started')
  }, [])

  // Statistics
  const statisticsCards = useMemo(() => {
    if (!stats) return []
    
    return [
      {
        title: 'Total Reviews',
        value: stats.totalReviews || 0,
        icon: <Brain className="h-6 w-6" />,
        color: 'primary' as const
      },
      {
        title: 'Auto Resolved',
        value: stats.autoResolveCount || 0,
        icon: <Zap className="h-6 w-6" />,
        color: 'success' as const
      },
      {
        title: 'Approved',
        value: stats.approvedCount || 0,
        icon: <CheckCircle className="h-6 w-6" />,
        color: 'success' as const
      },
      {
        title: 'Avg Confidence',
        value: stats.avgConfidence ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '0%',
        icon: <AlertTriangle className="h-6 w-6" />,
        color: 'warning' as const
      }
    ]
  }, [stats])

  if (!permissions.canViewAISuggestions) {
    return (
      <div className="text-center py-12">
        <Brain className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">Access Denied</h3>
        <p className="text-secondary-500">
          You don't have permission to view AI suggestions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            AI Suggestions
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Review and manage AI-generated ticket suggestions and auto-resolutions.
          </p>
        </div>
        <div className="mt-4 flex space-x-2 md:mt-0 md:ml-4">
          <Button
            onClick={() => setShowKeyboardShortcuts(true)}
            variant="ghost"
            size="sm"
            icon={<Keyboard className="h-4 w-4" />}
            title="Keyboard Shortcuts (?)"
          />
          <Button
            onClick={handleExport}
            variant="outline"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            icon={<RefreshCw className="h-4 w-4" />}
            loading={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {showBatchActions && (
        <Card className="border-primary-200 bg-primary-50">
          <Card.Body className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-primary-900">
                  {selectedSuggestions.size} suggestion{selectedSuggestions.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleBulkApprove}
                    variant="outline"
                    size="sm"
                    icon={<CheckCircle className="h-4 w-4" />}
                    loading={bulkOperation.isLoading}
                  >
                    Approve All (1)
                  </Button>
                  <Button
                    onClick={handleBulkReject}
                    variant="outline"
                    size="sm"
                    icon={<XCircle className="h-4 w-4" />}
                    loading={bulkOperation.isLoading}
                  >
                    Reject All (2)
                  </Button>
                  <Button
                    onClick={handleBulkEscalate}
                    variant="outline"
                    size="sm"
                    icon={<Flag className="h-4 w-4" />}
                    loading={bulkOperation.isLoading}
                  >
                    Escalate All
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedSuggestions(new Set())
                  setShowBatchActions(false)
                }}
                variant="ghost"
                size="sm"
                icon={<XCircle className="h-4 w-4" />}
              >
                Clear Selection
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Statistics */}
      {statisticsCards.length > 0 && (
        <StatsGrid columns={4}>
          {statisticsCards.map((stat, index) => (
            <StatsCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </StatsGrid>
      )}

      {/* Search and Filters */}
      <SearchBar
        placeholder="Search suggestions..."
        onSearch={handleSearch}
        showFilters={true}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Suggestions Table */}
      <DataTable
        columns={columns}
        data={suggestions}
        loading={isLoading}
        pagination={pagination}
        onPaginationChange={(page, limit) => {
          setFilters(prev => ({ ...prev, page, limit }))
        }}
        exportable={true}
        onExport={handleExport}
        emptyState={{
          title: 'No AI suggestions found',
          description: 'No suggestions match your current filters.',
          action: (
            <Button
              onClick={() => setFilters(prev => ({ ...prev, search: '', status: '', recommendation: '' }))}
              variant="outline"
            >
              Clear Filters
            </Button>
          )
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Navigation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Refresh</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">Ctrl+R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Select All</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">Ctrl+A</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Clear Selection</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-2">Actions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Approve Selected</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">1</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Reject Selected</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">2</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-secondary-100 rounded text-xs">?</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-secondary-200">
            <p className="text-sm text-secondary-600">
              Shortcuts work when not focused on input fields. Use these to quickly process suggestions.
            </p>
          </div>
        </div>
      </Modal>

      {/* Quick Review Modal */}
      {showQuickReview && currentSuggestion && (
        <QuickReviewModal
          suggestion={currentSuggestion}
          isOpen={showQuickReview}
          onClose={() => {
            setShowQuickReview(false)
            setCurrentSuggestion(null)
          }}
          onSubmit={async (review) => {
            try {
              await submitReview.mutateAsync({
                suggestionId: currentSuggestion._id,
                review
              })
              toast.success('Review submitted')
              setShowQuickReview(false)
              setCurrentSuggestion(null)
              refetch()
            } catch (error) {
              toast.error('Failed to submit review')
            }
          }}
        />
      )}
    </div>
  )
}

// Quick Review Modal Component
interface QuickReviewModalProps {
  suggestion: AISuggestion
  isOpen: boolean
  onClose: () => void
  onSubmit: (review: any) => Promise<void>
}

function QuickReviewModal({ suggestion, isOpen, onClose, onSubmit }: QuickReviewModalProps) {
  const [decision, setDecision] = useState<'approve' | 'modify' | 'reject' | 'escalate'>('approve')
  const [modifiedResponse, setModifiedResponse] = useState(suggestion.suggestedResponse?.content || '')
  const [feedback, setFeedback] = useState({
    classificationAccuracy: 'correct' as 'correct' | 'incorrect' | 'partial',
    knowledgeRelevance: 'relevant' as 'relevant' | 'irrelevant' | 'partial',
    responseQuality: 'good' as 'excellent' | 'good' | 'fair' | 'poor',
    overallSatisfaction: 4,
    comments: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit({
        decision,
        feedback,
        modifiedResponse: decision === 'modify' ? modifiedResponse : undefined
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Review"
      size="lg"
    >
      <div className="space-y-6">
        {/* Ticket Context */}
        <div className="bg-secondary-50 p-4 rounded-lg">
          <h4 className="font-medium text-secondary-900 mb-2">Ticket Context</h4>
          <p className="text-sm text-secondary-700">
            <strong>Subject:</strong> {suggestion.ticketId.subject}
          </p>
          <p className="text-sm text-secondary-700 mt-1">
            <strong>Priority:</strong> {suggestion.ticketId.priority} |
            <strong> Status:</strong> {suggestion.ticketId.status}
          </p>
        </div>

        {/* AI Suggestion */}
        <div>
          <h4 className="font-medium text-secondary-900 mb-2">AI Suggested Response</h4>
          <div className="bg-white border border-secondary-200 rounded-lg p-4">
            <p className="text-sm text-secondary-700 whitespace-pre-wrap">
              {suggestion.suggestedResponse?.content}
            </p>
          </div>
          <div className="mt-2 flex items-center space-x-4 text-sm text-secondary-500">
            <span>Confidence: {((suggestion.confidence?.calibrated || 0) * 100).toFixed(0)}%</span>
            <span>Type: {suggestion.suggestedResponse?.type}</span>
          </div>
        </div>

        {/* Decision */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Decision
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: 'approve', label: 'Approve', icon: CheckCircle, color: 'success' },
              { value: 'modify', label: 'Modify', icon: Edit3, color: 'primary' },
              { value: 'reject', label: 'Reject', icon: XCircle, color: 'error' },
              { value: 'escalate', label: 'Escalate', icon: Flag, color: 'warning' }
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDecision(value as any)}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  decision === value
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
        {decision === 'modify' && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Modified Response
            </label>
            <textarea
              value={modifiedResponse}
              onChange={(e) => setModifiedResponse(e.target.value)}
              rows={6}
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Edit the AI response..."
            />
          </div>
        )}

        {/* Feedback */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Classification Accuracy
            </label>
            <select
              value={feedback.classificationAccuracy}
              onChange={(e) => setFeedback(prev => ({ ...prev, classificationAccuracy: e.target.value as any }))}
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="correct">Correct</option>
              <option value="partial">Partially Correct</option>
              <option value="incorrect">Incorrect</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Response Quality
            </label>
            <select
              value={feedback.responseQuality}
              onChange={(e) => setFeedback(prev => ({ ...prev, responseQuality: e.target.value as any }))}
              className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={feedback.comments}
            onChange={(e) => setFeedback(prev => ({ ...prev, comments: e.target.value }))}
            rows={3}
            className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Additional feedback for AI improvement..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
          >
            Submit Review
          </Button>
        </div>
      </div>
    </Modal>
  )
}
