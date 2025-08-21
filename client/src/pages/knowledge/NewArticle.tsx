import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { Save, Eye, ArrowLeft, Tag as TagIcon } from 'lucide-react'
import toast from 'react-hot-toast'

import { useCreateArticle, useArticleTags } from '@hooks/useArticles'
import { useAuth } from '@hooks/useAuth'
import { ARTICLE_CATEGORY_LABELS, ARTICLE_DIFFICULTY_LABELS } from '@utils/constants'
import type { Article } from '@types/index'

import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Card from '@components/ui/Card'
import RichTextEditor from '@components/ui/RichTextEditor'
import Badge from '@components/ui/Badge'

interface ArticleFormData {
  title: string
  summary: string
  content: string
  category: string
  tags: string[]
  difficulty: string
  status: 'draft' | 'published'
}

export default function NewArticle() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tagInput, setTagInput] = useState('')
  const [preview, setPreview] = useState(false)

  // API hooks
  const createArticleMutation = useCreateArticle()
  const { data: existingTags = [] } = useArticleTags()

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ArticleFormData>({
    defaultValues: {
      title: '',
      summary: '',
      content: '',
      category: 'general',
      tags: [],
      difficulty: 'beginner',
      status: 'draft',
    },
  })

  const watchedValues = watch()

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
          difficulty: data.difficulty as any,
          language: 'en',
        },
      }

      const result = await createArticleMutation.mutateAsync(articleData)
      
      toast.success(
        data.status === 'published' 
          ? 'Article published successfully!' 
          : 'Article saved as draft!'
      )
      
      navigate(`/articles/${result.id}`)
    } catch (error) {
      toast.error('Failed to save article')
    }
  }

  // Handle tag management
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !watchedValues.tags.includes(trimmedTag)) {
      setValue('tags', [...watchedValues.tags, trimmedTag])
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove: string) => {
    setValue('tags', watchedValues.tags.filter(tag => tag !== tagToRemove))
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
      !watchedValues.tags.includes(tag)
    )
    .slice(0, 5)

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
          <div>
            <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
              Create New Article
            </h1>
            <p className="mt-1 text-sm text-secondary-500">
              Share knowledge with your team and customers.
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
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
                      <div dangerouslySetInnerHTML={{ __html: watchedValues.content }} />
                    </div>
                  </div>
                ) : (
                  <Controller
                    name="content"
                    control={control}
                    rules={{ required: 'Content is required' }}
                    render={({ field }) => (
                      <RichTextEditor
                        content={field.value}
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
                {watchedValues.tags.length > 0 && (
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

            {/* Author Info */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Author</h3>
              </Card.Header>
              <Card.Body>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{user?.email}</p>
                  </div>
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
            onClick={() => navigate('/articles')}
          >
            Cancel
          </Button>

          <div className="flex space-x-3">
            <Button
              type="submit"
              variant="outline"
              loading={isSubmitting}
              onClick={() => setValue('status', 'draft')}
              icon={<Save className="h-4 w-4" />}
            >
              Save Draft
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              onClick={() => setValue('status', 'published')}
            >
              Publish Article
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
