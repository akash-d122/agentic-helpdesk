import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { ArrowLeft, Send, Search, BookOpen, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

import { useCreateTicket } from '@hooks/useTickets'
import { useSearchArticles } from '@hooks/useArticles'
import { useAuth } from '@hooks/useAuth'
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from '@utils/constants'
import { debounce } from '@utils/helpers'
import type { Ticket } from '@types/index'

import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import Card from '@components/ui/Card'
import RichTextEditor from '@components/ui/RichTextEditor'
import FileUpload from '@components/ui/FileUpload'
import SearchBar from '@components/ui/SearchBar'

interface TicketFormData {
  subject: string
  description: string
  category: string
  priority: string
  attachments?: File[]
}

export default function NewTicket() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  // API hooks
  const createTicketMutation = useCreateTicket()
  const { data: suggestedArticles = [], isLoading: searchLoading } = useSearchArticles(
    searchQuery,
    { limit: 5 }
  )

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    defaultValues: {
      subject: '',
      description: '',
      category: 'general',
      priority: 'medium',
    },
  })

  const watchedSubject = watch('subject')

  // Debounced search for knowledge base suggestions
  const debouncedSearch = debounce((query: string) => {
    if (query.length > 2) {
      setSearchQuery(query)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, 500)

  // Handle subject change for auto-suggestions
  React.useEffect(() => {
    debouncedSearch(watchedSubject)
  }, [watchedSubject, debouncedSearch])

  // Handle form submission
  const onSubmit = async (data: TicketFormData) => {
    try {
      const ticketData: Partial<Ticket> = {
        subject: data.subject,
        description: data.description,
        category: data.category as any,
        priority: data.priority as any,
        status: 'open',
        attachments: attachments.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }

      const result = await createTicketMutation.mutateAsync(ticketData)
      
      // Upload attachments if any
      if (attachments.length > 0) {
        // This would be handled by the file upload component
        console.log('Uploading attachments:', attachments)
      }
      
      toast.success('Ticket created successfully!')
      navigate(`/tickets/${result.id}`)
    } catch (error) {
      toast.error('Failed to create ticket')
    }
  }

  const handleFileUpload = async (files: File[]) => {
    // Simulate file upload - in real implementation, this would upload to server
    return files.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/tickets')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Tickets
          </Button>
          <div>
            <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
              Create New Ticket
            </h1>
            <p className="mt-1 text-sm text-secondary-500">
              Submit a new support request. Check our knowledge base first for quick solutions.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Ticket Details</h3>
              </Card.Header>
              <Card.Body className="space-y-4">
                <Input
                  label="Subject"
                  required
                  {...register('subject', { required: 'Subject is required' })}
                  error={errors.subject?.message}
                  placeholder="Brief description of your issue..."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Category</label>
                    <select
                      {...register('category')}
                      className="form-select"
                    >
                      {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      {...register('priority')}
                      className="form-select"
                    >
                      {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Controller
                  name="description"
                  control={control}
                  rules={{ required: 'Description is required' }}
                  render={({ field }) => (
                    <RichTextEditor
                      label="Description"
                      required
                      content={field.value}
                      onChange={field.onChange}
                      placeholder="Provide detailed information about your issue..."
                      error={errors.description?.message}
                    />
                  )}
                />
              </Card.Body>
            </Card>

            {/* Attachments */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Attachments</h3>
              </Card.Header>
              <Card.Body>
                <FileUpload
                  onFilesChange={setAttachments}
                  onUpload={handleFileUpload}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
                    'application/pdf': ['.pdf'],
                    'text/*': ['.txt', '.log'],
                    'application/zip': ['.zip'],
                  }}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024} // 10MB
                  description="Upload screenshots, logs, or other relevant files"
                />
              </Card.Body>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Knowledge Base Suggestions */}
            {showSuggestions && suggestedArticles.length > 0 && (
              <Card>
                <Card.Header>
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-warning-500" />
                    <h3 className="text-lg font-medium text-secondary-900">
                      Suggested Solutions
                    </h3>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-sm text-secondary-600 mb-4">
                    We found some articles that might help solve your issue:
                  </p>
                  <div className="space-y-3">
                    {suggestedArticles.map((article) => (
                      <div
                        key={article.id}
                        className="p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer"
                        onClick={() => window.open(`/articles/${article.id}`, '_blank')}
                      >
                        <div className="flex items-start space-x-2">
                          <BookOpen className="h-4 w-4 text-primary-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-medium text-secondary-900 mb-1">
                              {article.title}
                            </h4>
                            {article.summary && (
                              <p className="text-xs text-secondary-500 line-clamp-2">
                                {article.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-secondary-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('/articles', '_blank')}
                      icon={<Search className="h-4 w-4" />}
                      fullWidth
                    >
                      Browse Knowledge Base
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Requester Info */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Requester</h3>
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

            {/* Tips */}
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-secondary-900">Tips for Better Support</h3>
              </Card.Header>
              <Card.Body>
                <ul className="text-sm text-secondary-600 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>Be specific about the issue and steps to reproduce it</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>Include screenshots or error messages when relevant</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>Check our knowledge base for existing solutions</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-primary-500 mt-1">•</span>
                    <span>Set the appropriate priority level for your issue</span>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/tickets')}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
          >
            Submit Ticket
          </Button>
        </div>
      </form>
    </div>
  )
}
