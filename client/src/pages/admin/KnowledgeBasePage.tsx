import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  BookOpen, 
  Tag, 
  Calendar,
  TrendingUp,
  Users,
  ThumbsUp,
  MoreHorizontal,
  Download,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import DataTable from '@components/ui/DataTable'
import Modal from '@components/ui/Modal'
import Dropdown from '@components/ui/Dropdown'
import RichTextEditor from '@components/ui/RichTextEditor'
import { StatsGrid } from '@components/ui/StatsCard'
import StatsCard from '@components/ui/StatsCard'
import { formatRelativeTime } from '@utils/helpers'

interface KnowledgeArticle {
  _id: string
  title: string
  content: string
  excerpt: string
  category: string
  tags: string[]
  isPublished: boolean
  author: {
    _id: string
    firstName: string
    lastName: string
  }
  viewCount: number
  helpfulCount: number
  createdAt: string
  updatedAt: string
}

interface KnowledgeStats {
  totalArticles: number
  publishedArticles: number
  totalViews: number
  averageRating: number
  topCategories: Array<{
    category: string
    count: number
  }>
  recentActivity: Array<{
    type: string
    article: string
    user: string
    timestamp: string
  }>
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [stats, setStats] = useState<KnowledgeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [selectedArticles, setSelectedArticles] = useState<string[]>([])

  const categories = [
    'Getting Started',
    'Account Management',
    'Technical Support',
    'Billing & Payments',
    'Troubleshooting',
    'API Documentation',
    'Best Practices',
    'FAQ'
  ]

  useEffect(() => {
    loadArticles()
    loadStats()
  }, [searchTerm, selectedCategory, statusFilter])

  const loadArticles = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockArticles: KnowledgeArticle[] = [
        {
          _id: '1',
          title: 'Getting Started with Smart Helpdesk',
          content: '<p>Welcome to Smart Helpdesk! This guide will help you get started...</p>',
          excerpt: 'Learn the basics of using Smart Helpdesk effectively',
          category: 'Getting Started',
          tags: ['onboarding', 'basics', 'tutorial'],
          isPublished: true,
          author: {
            _id: 'user1',
            firstName: 'John',
            lastName: 'Doe'
          },
          viewCount: 1250,
          helpfulCount: 45,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          title: 'How to Reset Your Password',
          content: '<p>If you forgot your password, follow these steps...</p>',
          excerpt: 'Step-by-step guide to reset your account password',
          category: 'Account Management',
          tags: ['password', 'security', 'account'],
          isPublished: true,
          author: {
            _id: 'user2',
            firstName: 'Jane',
            lastName: 'Smith'
          },
          viewCount: 890,
          helpfulCount: 32,
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          title: 'API Authentication Guide',
          content: '<p>Learn how to authenticate with our API...</p>',
          excerpt: 'Complete guide to API authentication and security',
          category: 'API Documentation',
          tags: ['api', 'authentication', 'security', 'development'],
          isPublished: false,
          author: {
            _id: 'user1',
            firstName: 'John',
            lastName: 'Doe'
          },
          viewCount: 0,
          helpfulCount: 0,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
      
      // Apply filters
      let filteredArticles = mockArticles
      
      if (searchTerm) {
        filteredArticles = filteredArticles.filter(article =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }
      
      if (selectedCategory) {
        filteredArticles = filteredArticles.filter(article =>
          article.category === selectedCategory
        )
      }
      
      if (statusFilter !== 'all') {
        filteredArticles = filteredArticles.filter(article =>
          statusFilter === 'published' ? article.isPublished : !article.isPublished
        )
      }
      
      setArticles(filteredArticles)
    } catch (error) {
      console.error('Failed to load articles:', error)
      toast.error('Failed to load knowledge base articles')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Mock stats - replace with actual API call
      const mockStats: KnowledgeStats = {
        totalArticles: 156,
        publishedArticles: 142,
        totalViews: 45230,
        averageRating: 4.2,
        topCategories: [
          { category: 'Getting Started', count: 25 },
          { category: 'Technical Support', count: 32 },
          { category: 'Account Management', count: 18 },
          { category: 'Troubleshooting', count: 28 }
        ],
        recentActivity: [
          {
            type: 'created',
            article: 'API Authentication Guide',
            user: 'John Doe',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            type: 'updated',
            article: 'Getting Started Guide',
            user: 'Jane Smith',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
      
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleCreateArticle = () => {
    setEditingArticle(null)
    setShowCreateModal(true)
  }

  const handleEditArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    setShowCreateModal(true)
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return
    
    try {
      // API call to delete article
      setArticles(prev => prev.filter(article => article._id !== articleId))
      toast.success('Article deleted successfully')
    } catch (error) {
      toast.error('Failed to delete article')
    }
  }

  const handleTogglePublish = async (article: KnowledgeArticle) => {
    try {
      const updatedArticle = { ...article, isPublished: !article.isPublished }
      setArticles(prev => prev.map(a => a._id === article._id ? updatedArticle : a))
      toast.success(`Article ${updatedArticle.isPublished ? 'published' : 'unpublished'} successfully`)
    } catch (error) {
      toast.error('Failed to update article status')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedArticles.length === 0) {
      toast.error('Please select articles first')
      return
    }

    try {
      switch (action) {
        case 'publish':
          setArticles(prev => prev.map(article =>
            selectedArticles.includes(article._id)
              ? { ...article, isPublished: true }
              : article
          ))
          toast.success(`${selectedArticles.length} articles published`)
          break
        case 'unpublish':
          setArticles(prev => prev.map(article =>
            selectedArticles.includes(article._id)
              ? { ...article, isPublished: false }
              : article
          ))
          toast.success(`${selectedArticles.length} articles unpublished`)
          break
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedArticles.length} articles?`)) return
          setArticles(prev => prev.filter(article => !selectedArticles.includes(article._id)))
          toast.success(`${selectedArticles.length} articles deleted`)
          break
      }
      setSelectedArticles([])
    } catch (error) {
      toast.error('Failed to perform bulk action')
    }
  }

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (article: KnowledgeArticle) => (
        <div>
          <div className="font-medium text-secondary-900">{article.title}</div>
          <div className="text-sm text-secondary-500 mt-1">{article.excerpt}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (article: KnowledgeArticle) => (
        <Badge variant="outline">{article.category}</Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (article: KnowledgeArticle) => (
        <Badge variant={article.isPublished ? 'success' : 'warning'}>
          {article.isPublished ? 'Published' : 'Draft'}
        </Badge>
      )
    },
    {
      key: 'author',
      label: 'Author',
      render: (article: KnowledgeArticle) => (
        <span className="text-sm text-secondary-700">
          {article.author.firstName} {article.author.lastName}
        </span>
      )
    },
    {
      key: 'metrics',
      label: 'Metrics',
      render: (article: KnowledgeArticle) => (
        <div className="text-sm text-secondary-600">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <Eye className="h-3 w-3 mr-1" />
              {article.viewCount}
            </span>
            <span className="flex items-center">
              <ThumbsUp className="h-3 w-3 mr-1" />
              {article.helpfulCount}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'updated',
      label: 'Last Updated',
      render: (article: KnowledgeArticle) => (
        <span className="text-sm text-secondary-500">
          {formatRelativeTime(article.updatedAt)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (article: KnowledgeArticle) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" icon={<MoreHorizontal className="h-4 w-4" />} />
          }
          items={[
            {
              label: 'Edit',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEditArticle(article)
            },
            {
              label: article.isPublished ? 'Unpublish' : 'Publish',
              icon: article.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
              onClick: () => handleTogglePublish(article)
            },
            { type: 'separator' },
            {
              label: 'Delete',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDeleteArticle(article._id),
              className: 'text-error-600'
            }
          ]}
        />
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Knowledge Base</h1>
          <p className="text-sm text-secondary-500">
            Manage help articles and documentation
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
          >
            Import
          </Button>
          <Button
            onClick={handleCreateArticle}
            icon={<Plus className="h-4 w-4" />}
          >
            New Article
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Articles"
            value={stats.totalArticles.toString()}
            subtitle={`${stats.publishedArticles} published`}
            icon={<BookOpen className="h-6 w-6" />}
            color="primary"
          />
          
          <StatsCard
            title="Total Views"
            value={stats.totalViews.toLocaleString()}
            subtitle="All time views"
            icon={<Eye className="h-6 w-6" />}
            color="success"
          />
          
          <StatsCard
            title="Average Rating"
            value={stats.averageRating.toFixed(1)}
            subtitle="Out of 5.0"
            icon={<ThumbsUp className="h-6 w-6" />}
            color="warning"
          />
          
          <StatsCard
            title="Top Category"
            value={stats.topCategories[0]?.category || 'N/A'}
            subtitle={`${stats.topCategories[0]?.count || 0} articles`}
            icon={<TrendingUp className="h-6 w-6" />}
            color="secondary"
          />
        </StatsGrid>
      )}

      {/* Filters and Search */}
      <Card>
        <Card.Body>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            
            {selectedArticles.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-secondary-600">
                  {selectedArticles.length} selected
                </span>
                <Dropdown
                  trigger={
                    <Button variant="outline" size="sm">
                      Bulk Actions
                    </Button>
                  }
                  items={[
                    {
                      label: 'Publish',
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => handleBulkAction('publish')
                    },
                    {
                      label: 'Unpublish',
                      icon: <EyeOff className="h-4 w-4" />,
                      onClick: () => handleBulkAction('unpublish')
                    },
                    { type: 'separator' },
                    {
                      label: 'Delete',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => handleBulkAction('delete'),
                      className: 'text-error-600'
                    }
                  ]}
                />
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Articles Table */}
      <Card>
        <DataTable
          data={articles}
          columns={columns}
          loading={loading}
          selectable
          selectedRows={selectedArticles}
          onSelectionChange={setSelectedArticles}
          emptyMessage="No articles found"
        />
      </Card>

      {/* Create/Edit Article Modal */}
      {showCreateModal && (
        <ArticleModal
          article={editingArticle}
          categories={categories}
          onClose={() => {
            setShowCreateModal(false)
            setEditingArticle(null)
          }}
          onSave={(article) => {
            if (editingArticle) {
              setArticles(prev => prev.map(a => a._id === article._id ? article : a))
              toast.success('Article updated successfully')
            } else {
              setArticles(prev => [article, ...prev])
              toast.success('Article created successfully')
            }
            setShowCreateModal(false)
            setEditingArticle(null)
          }}
        />
      )}
    </div>
  )
}

// Article Modal Component
interface ArticleModalProps {
  article: KnowledgeArticle | null
  categories: string[]
  onClose: () => void
  onSave: (article: KnowledgeArticle) => void
}

function ArticleModal({ article, categories, onClose, onSave }: ArticleModalProps) {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    content: article?.content || '',
    excerpt: article?.excerpt || '',
    category: article?.category || '',
    tags: article?.tags.join(', ') || '',
    isPublished: article?.isPublished || false
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and content are required')
      return
    }

    try {
      setSaving(true)
      
      const articleData: KnowledgeArticle = {
        _id: article?._id || Date.now().toString(),
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt || formData.content.substring(0, 150) + '...',
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isPublished: formData.isPublished,
        author: article?.author || {
          _id: 'current-user',
          firstName: 'Current',
          lastName: 'User'
        },
        viewCount: article?.viewCount || 0,
        helpfulCount: article?.helpfulCount || 0,
        createdAt: article?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      onSave(articleData)
    } catch (error) {
      toast.error('Failed to save article')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={article ? 'Edit Article' : 'Create New Article'}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Enter article title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Excerpt
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Brief description of the article"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="Enter tags separated by commas"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Content *
          </label>
          <RichTextEditor
            value={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            height={400}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublished"
            checked={formData.isPublished}
            onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
            className="form-checkbox"
          />
          <label htmlFor="isPublished" className="ml-2 text-sm text-secondary-700">
            Publish immediately
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
          >
            {article ? 'Update Article' : 'Create Article'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
