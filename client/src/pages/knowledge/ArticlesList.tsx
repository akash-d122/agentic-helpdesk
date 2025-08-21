import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Archive, 
  Trash2,
  MoreHorizontal,
  BookOpen,
  Calendar,
  User,
  Tag,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { type ColumnDef } from '@tanstack/react-table'

import { useArticles, useBulkArticleOperation, useDeleteArticle, usePublishArticle, useArchiveArticle } from '@hooks/useArticles'
import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime } from '@utils/helpers'
import { ARTICLE_CATEGORY_LABELS, ARTICLE_STATUS_LABELS } from '@utils/constants'
import type { Article } from '@types/index'

import DataTable from '@components/ui/DataTable'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import SearchBar from '@components/ui/SearchBar'
import { ConfirmModal } from '@components/ui/Modal'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'

export default function ArticlesList() {
  const permissions = usePermissions()
  const [filters, setFilters] = useState({
    page: 0,
    pageSize: 10,
    search: '',
    status: '',
    category: '',
    author: '',
  })
  const [selectedArticles, setSelectedArticles] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null)

  // API hooks
  const { data: articlesData, isLoading, error } = useArticles(filters)
  const deleteArticleMutation = useDeleteArticle()
  const publishArticleMutation = usePublishArticle()
  const archiveArticleMutation = useArchiveArticle()
  const bulkOperationMutation = useBulkArticleOperation()

  const articles = articlesData?.articles || []
  const pagination = articlesData?.pagination

  // Search filters configuration
  const searchFilters = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      type: 'select' as const,
      options: Object.entries(ARTICLE_CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      key: 'author',
      label: 'Author',
      type: 'text' as const,
      placeholder: 'Filter by author...',
    },
  ]

  // Table columns
  const columns = useMemo<ColumnDef<Article>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => {
        const article = row.original
        return (
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <BookOpen className="h-4 w-4 text-primary-500" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={`/articles/${article.id}`}
                className="text-sm font-medium text-secondary-900 hover:text-primary-600 truncate block"
              >
                {article.title}
              </Link>
              {article.summary && (
                <p className="text-xs text-secondary-500 mt-1 line-clamp-2">
                  {article.summary}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variants = {
          draft: 'secondary',
          published: 'success',
          archived: 'warning',
        } as const
        
        return (
          <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
            {ARTICLE_STATUS_LABELS[status as keyof typeof ARTICLE_STATUS_LABELS] || status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('category') as string
        return (
          <Badge variant="primary">
            {ARTICLE_CATEGORY_LABELS[category as keyof typeof ARTICLE_CATEGORY_LABELS] || category}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'author',
      header: 'Author',
      cell: ({ row }) => {
        const author = row.original.author
        return (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-secondary-400" />
            <span className="text-sm text-secondary-900">
              {author.firstName} {author.lastName}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'viewCount',
      header: 'Views',
      cell: ({ row }) => {
        const viewCount = row.getValue('viewCount') as number
        return (
          <div className="flex items-center space-x-1">
            <Eye className="h-4 w-4 text-secondary-400" />
            <span className="text-sm text-secondary-900">{viewCount.toLocaleString()}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'helpfulnessRatio',
      header: 'Helpful',
      cell: ({ row }) => {
        const ratio = row.getValue('helpfulnessRatio') as number
        const percentage = Math.round(ratio * 100)
        return (
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-4 w-4 text-success-500" />
            <span className="text-sm text-secondary-900">{percentage}%</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => {
        const updatedAt = row.getValue('updatedAt') as string
        return (
          <div className="text-sm text-secondary-500">
            {formatRelativeTime(updatedAt)}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const article = row.original
        return (
          <ArticleActions
            article={article}
            onDelete={() => handleDeleteClick(article.id)}
            onPublish={() => publishArticleMutation.mutate(article.id)}
            onArchive={() => archiveArticleMutation.mutate(article.id)}
          />
        )
      },
    },
  ], [publishArticleMutation, archiveArticleMutation])

  // Event handlers
  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, search: query, page: 0 }))
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 0 }))
  }

  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setFilters(prev => ({
      ...prev,
      page: newPagination.pageIndex,
      pageSize: newPagination.pageSize,
    }))
  }

  const handleSelectionChange = (selection: Record<string, boolean>) => {
    const selectedIds = Object.keys(selection).filter(id => selection[id])
    setSelectedArticles(selectedIds)
  }

  const handleDeleteClick = (articleId: string) => {
    setArticleToDelete(articleId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = () => {
    if (articleToDelete) {
      deleteArticleMutation.mutate(articleToDelete)
      setArticleToDelete(null)
    }
  }

  const handleBulkOperation = (operation: 'publish' | 'archive' | 'delete') => {
    if (selectedArticles.length > 0) {
      bulkOperationMutation.mutate({
        articleIds: selectedArticles,
        operation,
      })
      setSelectedArticles([])
    }
  }

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Export articles with filters:', filters)
  }

  // Statistics
  const stats = useMemo(() => {
    const published = articles.filter(a => a.status === 'published').length
    const draft = articles.filter(a => a.status === 'draft').length
    const archived = articles.filter(a => a.status === 'archived').length
    const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0)

    return [
      {
        title: 'Total Articles',
        value: articles.length,
        icon: <BookOpen className="h-6 w-6" />,
        color: 'primary' as const,
      },
      {
        title: 'Published',
        value: published,
        icon: <CheckCircle className="h-6 w-6" />,
        color: 'success' as const,
      },
      {
        title: 'Draft',
        value: draft,
        icon: <Clock className="h-6 w-6" />,
        color: 'warning' as const,
      },
      {
        title: 'Total Views',
        value: totalViews.toLocaleString(),
        icon: <Eye className="h-6 w-6" />,
        color: 'secondary' as const,
      },
    ]
  }, [articles])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            Knowledge Base
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Manage and organize helpful articles for your team and customers.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {permissions.canCreateArticles && (
            <Button
              as={Link}
              to="/articles/new"
              icon={<Plus className="h-4 w-4" />}
            >
              New Article
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <StatsGrid columns={4}>
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </StatsGrid>

      {/* Search and Filters */}
      <SearchBar
        placeholder="Search articles..."
        onSearch={handleSearch}
        showFilters={true}
        filters={searchFilters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      {selectedArticles.length > 0 && permissions.canEditArticles && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-primary-700">
              {selectedArticles.length} article(s) selected
            </p>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkOperation('publish')}
              >
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkOperation('archive')}
              >
                Archive
              </Button>
              {permissions.canDeleteArticles && (
                <Button
                  size="sm"
                  variant="error"
                  onClick={() => handleBulkOperation('delete')}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles Table */}
      <DataTable
        columns={columns}
        data={articles}
        loading={isLoading}
        error={error}
        selectable={permissions.canEditArticles}
        exportable={true}
        pagination={pagination ? {
          pageIndex: filters.page,
          pageSize: filters.pageSize,
          pageCount: pagination.totalPages,
          total: pagination.totalItems,
        } : undefined}
        onPaginationChange={handlePaginationChange}
        onSelectionChange={handleSelectionChange}
        onExport={handleExport}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete"
        variant="error"
      />
    </div>
  )
}

// Article Actions Component
interface ArticleActionsProps {
  article: Article
  onDelete: () => void
  onPublish: () => void
  onArchive: () => void
}

function ArticleActions({ article, onDelete, onPublish, onArchive }: ArticleActionsProps) {
  const permissions = usePermissions()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        icon={<MoreHorizontal className="h-4 w-4" />}
      />

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <Link
              to={`/articles/${article.id}`}
              className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              onClick={() => setShowMenu(false)}
            >
              <Eye className="mr-3 h-4 w-4" />
              View
            </Link>
            
            {permissions.canEditArticles && (
              <Link
                to={`/articles/${article.id}/edit`}
                className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                onClick={() => setShowMenu(false)}
              >
                <Edit className="mr-3 h-4 w-4" />
                Edit
              </Link>
            )}

            {permissions.canPublishArticles && article.status === 'draft' && (
              <button
                onClick={() => {
                  onPublish()
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              >
                <CheckCircle className="mr-3 h-4 w-4" />
                Publish
              </button>
            )}

            {permissions.canEditArticles && article.status === 'published' && (
              <button
                onClick={() => {
                  onArchive()
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
              >
                <Archive className="mr-3 h-4 w-4" />
                Archive
              </button>
            )}

            {permissions.canDeleteArticles && (
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-error-700 hover:bg-error-50"
              >
                <Trash2 className="mr-3 h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
