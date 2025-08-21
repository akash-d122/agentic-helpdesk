import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  ThumbsUp, 
  ThumbsDown, 
  Eye, 
  Calendar, 
  User, 
  Tag as TagIcon,
  Clock,
  BookOpen,
  MoreHorizontal,
  Archive,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { useArticle, useRateArticle, useDeleteArticle, useArchiveArticle } from '@hooks/useArticles'
import { usePermissions } from '@hooks/usePermissions'
import { formatDate, formatRelativeTime, copyToClipboard } from '@utils/helpers'
import { ARTICLE_CATEGORY_LABELS, ARTICLE_DIFFICULTY_LABELS } from '@utils/constants'

import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import Card from '@components/ui/Card'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import { ConfirmModal } from '@components/ui/Modal'

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const permissions = usePermissions()
  const [showActions, setShowActions] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // API hooks
  const { data: article, isLoading, error } = useArticle(id!)
  const rateArticleMutation = useRateArticle()
  const deleteArticleMutation = useDeleteArticle()
  const archiveArticleMutation = useArchiveArticle()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">Article not found</h3>
        <p className="text-secondary-500 mb-4">
          The article you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/articles')}>
          Back to Articles
        </Button>
      </div>
    )
  }

  const handleRate = (helpful: boolean) => {
    rateArticleMutation.mutate({ id: article.id, helpful })
    toast.success('Thank you for your feedback!')
  }

  const handleShare = async () => {
    const url = window.location.href
    const success = await copyToClipboard(url)
    if (success) {
      toast.success('Article link copied to clipboard!')
    } else {
      toast.error('Failed to copy link')
    }
  }

  const handleDelete = () => {
    deleteArticleMutation.mutate(article.id, {
      onSuccess: () => {
        toast.success('Article deleted successfully')
        navigate('/articles')
      },
    })
  }

  const handleArchive = () => {
    archiveArticleMutation.mutate(article.id, {
      onSuccess: () => {
        toast.success('Article archived successfully')
      },
    })
  }

  const getStatusBadge = () => {
    const variants = {
      draft: 'secondary',
      published: 'success',
      archived: 'warning',
    } as const

    return (
      <Badge variant={variants[article.status] || 'secondary'}>
        {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
      </Badge>
    )
  }

  const getDifficultyBadge = () => {
    const variants = {
      beginner: 'success',
      intermediate: 'warning',
      advanced: 'error',
    } as const

    return (
      <Badge variant={variants[article.metadata.difficulty] || 'secondary'}>
        {ARTICLE_DIFFICULTY_LABELS[article.metadata.difficulty] || article.metadata.difficulty}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/articles')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Articles
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleShare}
            icon={<Share2 className="h-4 w-4" />}
          >
            Share
          </Button>

          {permissions.canEditArticles && (
            <Button
              as={Link}
              to={`/articles/${article.id}/edit`}
              variant="outline"
              icon={<Edit className="h-4 w-4" />}
            >
              Edit
            </Button>
          )}

          {(permissions.canEditArticles || permissions.canDeleteArticles) && (
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setShowActions(!showActions)}
                icon={<MoreHorizontal className="h-4 w-4" />}
              />

              {showActions && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {permissions.canEditArticles && article.status === 'published' && (
                      <button
                        onClick={() => {
                          handleArchive()
                          setShowActions(false)
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
                          setShowDeleteModal(true)
                          setShowActions(false)
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <Card.Body className="space-y-6">
              {/* Article Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                      {article.title}
                    </h1>
                    {article.summary && (
                      <p className="text-lg text-secondary-600 leading-relaxed">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  {getStatusBadge()}
                </div>

                {/* Article Meta */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-500 border-b border-secondary-200 pb-4">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>By {article.author.firstName} {article.author.lastName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {article.publishedAt 
                        ? `Published ${formatDate(article.publishedAt)}` 
                        : `Created ${formatDate(article.createdAt)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{article.viewCount.toLocaleString()} views</span>
                  </div>
                  {article.metadata.estimatedReadTime && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{article.metadata.estimatedReadTime} min read</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Article Content */}
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>

              {/* Helpfulness Rating */}
              <div className="border-t border-secondary-200 pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">
                    Was this article helpful?
                  </h3>
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => handleRate(true)}
                      icon={<ThumbsUp className="h-4 w-4" />}
                      disabled={rateArticleMutation.isLoading}
                    >
                      Yes ({article.helpfulCount})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRate(false)}
                      icon={<ThumbsDown className="h-4 w-4" />}
                      disabled={rateArticleMutation.isLoading}
                    >
                      No ({article.notHelpfulCount})
                    </Button>
                  </div>
                  <p className="text-sm text-secondary-500 mt-2">
                    {Math.round(article.helpfulnessRatio * 100)}% found this helpful
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Article Info */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">Article Info</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-500">Category</label>
                <p className="text-sm text-secondary-900">
                  {ARTICLE_CATEGORY_LABELS[article.category] || article.category}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-500">Difficulty</label>
                <div className="mt-1">
                  {getDifficultyBadge()}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-500">Last Updated</label>
                <p className="text-sm text-secondary-900">
                  {formatRelativeTime(article.updatedAt)}
                </p>
              </div>

              {article.lastModifiedBy && (
                <div>
                  <label className="text-sm font-medium text-secondary-500">Last Modified By</label>
                  <p className="text-sm text-secondary-900">{article.lastModifiedBy}</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Tags */}
          {article.tags.length > 0 && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Tags</h3>
              </Card.Header>
              <Card.Body>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Related Articles */}
          {article.relatedArticles && article.relatedArticles.length > 0 && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Related Articles</h3>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  {article.relatedArticles.slice(0, 5).map((relatedArticle) => (
                    <Link
                      key={relatedArticle.id}
                      to={`/articles/${relatedArticle.id}`}
                      className="block p-3 rounded-lg border border-secondary-200 hover:bg-secondary-50 transition-colors"
                    >
                      <h4 className="text-sm font-medium text-secondary-900 mb-1">
                        {relatedArticle.title}
                      </h4>
                      <div className="flex items-center text-xs text-secondary-500">
                        <Eye className="h-3 w-3 mr-1" />
                        {relatedArticle.viewCount} views
                      </div>
                    </Link>
                  ))}
                </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        confirmText="Delete"
        variant="error"
      />
    </div>
  )
}
