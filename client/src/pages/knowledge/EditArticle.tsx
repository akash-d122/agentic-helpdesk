import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { Save, Eye, ArrowLeft, Tag as TagIcon } from 'lucide-react'
import toast from 'react-hot-toast'

import { useArticle, useUpdateArticle, useArticleTags } from '@hooks/useArticles'
import { useAuth } from '@hooks/useAuth'
import { ARTICLE_CATEGORY_LABELS, ARTICLE_DIFFICULTY_LABELS } from '@utils/constants'
import type { Article } from '@types/index'

import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Card from '@components/ui/Card'
import RichTextEditor from '@components/ui/RichTextEditor'
import Badge from '@components/ui/Badge'
import LoadingSpinner from '@components/ui/LoadingSpinner'

interface ArticleFormData {
  title: string
  summary: string
  content: string
  category: string
  tags: string[]
  difficulty: string
  status: 'draft' | 'published' | 'archived'
}

export default function EditArticle() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)

  // API hooks
  const { data: article, isLoading: articleLoading } = useArticle(id!)
  const updateArticleMutation = useUpdateArticle()
  const { data: existingTags = [] } = useArticleTags()

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ArticleFormData>()

  const watchedValues = watch()

  // Initialize form with article data
  useEffect(() => {
    if (article) {
      reset({
        title: article.title,
        summary: article.summary || '',
        content: article.content,
        category: article.category,
        tags: article.tags,
        difficulty: article.metadata.difficulty || 'beginner',
        status: article.status,
      })
    }
  }, [article, reset])

  if (articleLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 mb-2">Article not found</h3>
        <p className="text-secondary-500 mb-4">
          The article you're trying to edit doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/articles')}>
          Back to Articles
        </Button>
      </div>
    )
  }

  // Handle form submission
  const onSubmit = async (data: ArticleFormData) => {
    try {
      const articleData: Partial<Article> = {
        title: data.title,
        summary: data.summary,
        content: data.content,
        category: data.category as any,
        tags: data.tags,
        status: data.status,
        metadata: {
          ...article.metadata,
          difficulty: data.difficulty as any,
        },
      }

      await updateArticleMutation.mutateAsync({ id: article.id, articleData })
      
      toast.success('Article updated successfully!')
      navigate(`/articles/${article.id}`)
    } catch (error) {
      toast.error('Failed to update article')
    }
  }

  // Handle tag management
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !watchedValues.tags?.includes(trimmedTag)) {
      setValue('tags', [...(watchedValues.tags || []), trimmedTag], { shouldDirty: true })
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', (watchedValues.tags || []).filter(tag => tag !== tagToRemove), { shouldDirty: true })
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  const suggestedTags = existingTags
    .filter(tag => 
      tag.toLowerCase().includes(tagInput.toLowerCase()) && 
      !(watchedValues.tags || []).includes(tag)
    )
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/articles/${article.id}`)}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Article
          </Button>
          <div>
            <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
              Edit Article
            </h1>
            <p className="mt-1 text-sm text-secondary-500">
              Update article content and settings.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPreview(!preview)}
            icon={<Eye className="h-4 w-4" />}
          >
            {preview ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {isDirty && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <p className="text-sm text-warning-700">
            You have unsaved changes. Make sure to save your work before leaving this page.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Summary */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Article Details</h3>
              </Card.Header>
              <Card.Body className="space-y-4">
                <Input
                  label="Title"
                  required
                  {...register('title', { required: 'Title is required' })}
                  error={errors.title?.message}
                  placeholder="Enter article title..."
                />

                <div>
                  <label className="form-label">Summary</label>
                  <textarea
                    {...register('summary')}
                    className="form-textarea"
                    rows={3}
                    placeholder="Brief summary of the article..."
                  />
                  <p className="form-help">
                    A short description that will appear in search results and article lists.
                  </p>
                </div>
              </Card.Body>
            </Card>

            {/* Content Editor */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Content</h3>
              </Card.Header>
              <Card.Body>
                {preview ? (
                  <div className="min-h-[400px] p-4 border border-secondary-200 rounded-lg">
                    <div className="prose max-w-none">
                      <h1>{watchedValues.title || 'Untitled Article'}</h1>
                      {watchedValues.summary && (
                        <p className="text-lg text-secondary-600">{watchedValues.summary}</p>
                      )}
                      <div dangerouslySetInnerHTML={{ __html: watchedValues.content || '' }} />
                    </div>
                  </div>
                ) : (
                  <Controller
                    name="content"
                    control={control}
                    rules={{ required: 'Content is required' }}
                    render={({ field }) => (
                      <RichTextEditor
                        content={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Start writing your article..."
                        error={errors.content?.message}
                      />
                    )}
                  />
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Article Settings */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Settings</h3>
              </Card.Header>
              <Card.Body className="space-y-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    {...register('status')}
                    className="form-select"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    {...register('category')}
                    className="form-select"
                  >
                    {Object.entries(ARTICLE_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Difficulty</label>
                  <select
                    {...register('difficulty')}
                    className="form-select"
                  >
                    {Object.entries(ARTICLE_DIFFICULTY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </Card.Body>
            </Card>

            {/* Tags */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Tags</h3>
              </Card.Header>
              <Card.Body className="space-y-4">
                <div>
                  <Input
                    label="Add Tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Type and press Enter..."
                    leftIcon={<TagIcon className="h-4 w-4 text-secondary-400" />}
                  />
                  <p className="form-help">
                    Press Enter or comma to add tags. Tags help users find your article.
                  </p>
                </div>

                {/* Suggested Tags */}
                {suggestedTags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-secondary-700 mb-2">Suggested:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="text-xs px-2 py-1 bg-secondary-100 text-secondary-700 rounded hover:bg-secondary-200"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Tags */}
                {watchedValues.tags && watchedValues.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-secondary-700 mb-2">Current tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {watchedValues.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Article Info */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Article Info</h3>
              </Card.Header>
              <Card.Body className="space-y-3 text-sm">
                <div>
                  <span className="text-secondary-500">Created:</span>
                  <span className="ml-2 text-secondary-900">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500">Last updated:</span>
                  <span className="ml-2 text-secondary-900">
                    {new Date(article.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500">Views:</span>
                  <span className="ml-2 text-secondary-900">
                    {article.viewCount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-500">Author:</span>
                  <span className="ml-2 text-secondary-900">
                    {article.author.firstName} {article.author.lastName}
                  </span>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/articles/${article.id}`)}
          >
            Cancel
          </Button>

          <div className="flex space-x-3">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
              icon={<Save className="h-4 w-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
