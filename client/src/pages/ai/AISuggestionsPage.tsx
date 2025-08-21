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
      accessorKey: 'ticketId',
      header: 'Ticket',
      cell: ({ row }) => {
        const ticket = row.original.ticketId
        return (
          <div className="min-w-0">
            <Link
              to={`/tickets/${ticket._id}`}
              className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
            >
              #{ticket._id.slice(-6)} - {ticket.subject}
            </Link>
            <div className="text-xs text-secondary-500 mt-1">
              {formatRelativeTime(ticket.createdAt)}
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
        
        return (
          <div className="flex space-x-2">
            <Button
              as={Link}
              to={`/ai/suggestions/${suggestion._id}`}
              variant="ghost"
              size="sm"
              icon={<Eye className="h-4 w-4" />}
            >
              View
            </Button>
            
            {suggestion.status === 'completed' && !suggestion.humanReview && (
              <Button
                as={Link}
                to={`/ai/suggestions/${suggestion._id}/review`}
                variant="outline"
                size="sm"
                icon={<Brain className="h-4 w-4" />}
              >
                Review
              </Button>
            )}
          </div>
        )
      }
    }
  ], [])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 0 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }))
  }

  const handleRefresh = () => {
    loadSuggestions()
    loadStats()
  }

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
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

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
        loading={loading}
        exportable={true}
        onExport={() => console.log('Export suggestions')}
      />
    </div>
  )
}
