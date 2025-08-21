import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Send, 
  Paperclip, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Search,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Upload,
  FileText,
  Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Badge from '@components/ui/Badge'
import RichTextEditor from '@components/ui/RichTextEditor'
import FileUpload from '@components/ui/FileUpload'
import { useAuth } from '@contexts/AuthContext'

interface SuggestedArticle {
  _id: string
  title: string
  excerpt: string
  category: string
  relevanceScore: number
}

interface TicketFormData {
  subject: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  tags: string[]
  attachments: File[]
}

export default function CreateTicketPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [formData, setFormData] = useState<TicketFormData>({
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
    tags: [],
    attachments: []
  })
  
  const [suggestedArticles, setSuggestedArticles] = useState<SuggestedArticle[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchingKnowledge, setSearchingKnowledge] = useState(false)

  const categories = [
    { value: 'technical', label: 'Technical Support', icon: '🔧' },
    { value: 'billing', label: 'Billing & Payments', icon: '💳' },
    { value: 'account', label: 'Account Management', icon: '👤' },
    { value: 'general', label: 'General Inquiry', icon: '💬' },
    { value: 'feature', label: 'Feature Request', icon: '💡' },
    { value: 'bug', label: 'Bug Report', icon: '🐛' }
  ]

  const priorities = [
    { value: 'low', label: 'Low', description: 'General questions, minor issues', color: 'success' },
    { value: 'medium', label: 'Medium', description: 'Standard support requests', color: 'primary' },
    { value: 'high', label: 'High', description: 'Issues affecting productivity', color: 'warning' },
    { value: 'urgent', label: 'Urgent', description: 'Critical issues requiring immediate attention', color: 'error' }
  ]

  // Search for relevant knowledge articles when subject or description changes
  useEffect(() => {
    const searchTerm = formData.subject + ' ' + formData.description
    if (searchTerm.trim().length > 10) {
      searchKnowledgeBase(searchTerm.trim())
    } else {
      setSuggestedArticles([])
      setShowSuggestions(false)
    }
  }, [formData.subject, formData.description])

  const searchKnowledgeBase = async (query: string) => {
    try {
      setSearchingKnowledge(true)
      
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockArticles: SuggestedArticle[] = [
        {
          _id: '1',
          title: 'How to Reset Your Password',
          excerpt: 'Step-by-step guide to reset your account password safely and securely.',
          category: 'Account Management',
          relevanceScore: 0.85
        },
        {
          _id: '2',
          title: 'Troubleshooting Login Issues',
          excerpt: 'Common solutions for login problems including browser cache and cookie issues.',
          category: 'Technical Support',
          relevanceScore: 0.72
        },
        {
          _id: '3',
          title: 'Understanding Your Bill',
          excerpt: 'Detailed explanation of billing cycles, charges, and payment methods.',
          category: 'Billing & Payments',
          relevanceScore: 0.68
        }
      ]
      
      // Filter based on query relevance (mock logic)
      const relevantArticles = mockArticles.filter(article => 
        article.relevanceScore > 0.6 &&
        (article.title.toLowerCase().includes(query.toLowerCase()) ||
         article.excerpt.toLowerCase().includes(query.toLowerCase()))
      )
      
      setSuggestedArticles(relevantArticles)
      setShowSuggestions(relevantArticles.length > 0)
    } catch (error) {
      console.error('Failed to search knowledge base:', error)
    } finally {
      setSearchingKnowledge(false)
    }
  }

  const handleSubjectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subject: value }))
  }

  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({ ...prev, description: value }))
  }

  const handleFileUpload = (files: File[]) => {
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }))
  }

  const handleRemoveFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const validateForm = () => {
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject for your ticket')
      return false
    }
    
    if (!formData.description.trim()) {
      toast.error('Please describe your issue')
      return false
    }
    
    if (!formData.category) {
      toast.error('Please select a category')
      return false
    }
    
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    try {
      setSubmitting(true)
      
      // Create FormData for file uploads
      const submitData = new FormData()
      submitData.append('subject', formData.subject)
      submitData.append('description', formData.description)
      submitData.append('priority', formData.priority)
      submitData.append('category', formData.category)
      submitData.append('tags', JSON.stringify(formData.tags))
      
      formData.attachments.forEach((file, index) => {
        submitData.append(`attachments`, file)
      })
      
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const ticketId = 'TKT-' + Date.now()
      
      toast.success('Ticket created successfully!')
      navigate(`/tickets/${ticketId}`)
      
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Create Support Ticket</h1>
        <p className="text-sm text-secondary-500 mt-1">
          Describe your issue and we'll help you resolve it quickly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">What can we help you with?</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                  maxLength={200}
                />
                <div className="text-xs text-secondary-500 mt-1">
                  {formData.subject.length}/200 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Description *
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="Please provide detailed information about your issue..."
                  height={200}
                  toolbar={['bold', 'italic', 'link', 'bulletList', 'orderedList']}
                />
                {searchingKnowledge && (
                  <div className="flex items-center text-sm text-primary-600 mt-2">
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Searching for helpful articles...
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Category and Priority */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">Categorize Your Request</h3>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Category *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(category => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        formData.category === category.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 hover:border-secondary-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium">{category.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Priority
                </label>
                <div className="space-y-2">
                  {priorities.map(priority => (
                    <label
                      key={priority.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.priority === priority.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-secondary-300 hover:border-secondary-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority.value}
                        checked={formData.priority === priority.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="form-radio text-primary-600"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-secondary-900">{priority.label}</span>
                          <Badge variant={priority.color as any} size="sm">
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-secondary-600">{priority.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Attachments */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">Attachments</h3>
              <p className="text-sm text-secondary-500">
                Add screenshots, documents, or other files to help us understand your issue
              </p>
            </Card.Header>
            <Card.Body>
              <FileUpload
                onUpload={handleFileUpload}
                accept="image/*,.pdf,.doc,.docx,.txt"
                maxSize={10 * 1024 * 1024} // 10MB
                multiple
              />
              
              {formData.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-secondary-700">Uploaded Files:</h4>
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-secondary-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file)}
                        <span className="text-sm text-secondary-700">{file.name}</span>
                        <span className="text-xs text-secondary-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        onClick={() => handleRemoveFile(index)}
                        variant="ghost"
                        size="sm"
                        icon={<X className="h-4 w-4" />}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => navigate('/tickets')}
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
              Create Ticket
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Articles */}
          {showSuggestions && suggestedArticles.length > 0 && (
            <Card>
              <Card.Header>
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-warning-500" />
                  <h3 className="font-medium text-secondary-900">Helpful Articles</h3>
                </div>
                <p className="text-sm text-secondary-500">
                  These articles might help resolve your issue
                </p>
              </Card.Header>
              <Card.Body className="space-y-3">
                {suggestedArticles.map(article => (
                  <div
                    key={article._id}
                    className="p-3 border border-secondary-200 rounded-lg hover:border-primary-300 cursor-pointer transition-colors"
                    onClick={() => window.open(`/knowledge/${article._id}`, '_blank')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-secondary-900 text-sm mb-1">
                          {article.title}
                        </h4>
                        <p className="text-xs text-secondary-600 mb-2">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" size="sm">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-success-600">
                            {Math.round(article.relevanceScore * 100)}% match
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-secondary-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  icon={<BookOpen className="h-4 w-4" />}
                  onClick={() => window.open('/knowledge', '_blank')}
                >
                  Browse All Articles
                </Button>
              </Card.Body>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <Card.Header>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-success-500" />
                <h3 className="font-medium text-secondary-900">Tips for Better Support</h3>
              </div>
            </Card.Header>
            <Card.Body>
              <ul className="space-y-2 text-sm text-secondary-600">
                <li className="flex items-start space-x-2">
                  <span className="text-success-500 mt-0.5">•</span>
                  <span>Be specific about the issue you're experiencing</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success-500 mt-0.5">•</span>
                  <span>Include steps to reproduce the problem</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success-500 mt-0.5">•</span>
                  <span>Attach screenshots or error messages</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-success-500 mt-0.5">•</span>
                  <span>Mention your browser and operating system</span>
                </li>
              </ul>
            </Card.Body>
          </Card>

          {/* Contact Info */}
          <Card>
            <Card.Header>
              <h3 className="font-medium text-secondary-900">Need Immediate Help?</h3>
            </Card.Header>
            <Card.Body className="space-y-3">
              <div className="text-sm text-secondary-600">
                <p className="mb-2">For urgent issues, you can also contact us directly:</p>
                <div className="space-y-1">
                  <p><strong>Phone:</strong> 1-800-SUPPORT</p>
                  <p><strong>Email:</strong> support@company.com</p>
                  <p><strong>Hours:</strong> Mon-Fri 9AM-6PM EST</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  )
}
