import React, { useState, useEffect, useCallback } from 'react'
import { 
  Save, 
  Send, 
  Eye, 
  History, 
  MessageSquare, 
  FileText, 
  User, 
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Undo,
  Redo,
  Bold,
  Italic,
  List,
  Link as LinkIcon
} from 'lucide-react'
import toast from 'react-hot-toast'

import Button from '@components/ui/Button'
import Card from '@components/ui/Card'
import Badge from '@components/ui/Badge'
import Tabs from '@components/ui/Tabs'
import RichTextEditor from '@components/ui/RichTextEditor'
import Modal from '@components/ui/Modal'
import Tooltip from '@components/ui/Tooltip'
import { formatDate, formatRelativeTime } from '@utils/helpers'

interface ResponseVersion {
  id: string
  content: string
  author: {
    id: string
    name: string
    role: string
  }
  timestamp: string
  changes: string[]
  approved: boolean
  approvedBy?: {
    id: string
    name: string
  }
  approvedAt?: string
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
}

interface ResponseEditorProps {
  initialContent: string
  suggestion: any
  templates: Template[]
  onSave: (content: string, metadata?: any) => Promise<void>
  onSubmit: (content: string, metadata?: any) => Promise<void>
  onCancel: () => void
  readOnly?: boolean
  showApprovalWorkflow?: boolean
  requireApproval?: boolean
}

export default function ResponseEditor({
  initialContent,
  suggestion,
  templates,
  onSave,
  onSubmit,
  onCancel,
  readOnly = false,
  showApprovalWorkflow = true,
  requireApproval = false
}: ResponseEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [originalContent] = useState(initialContent)
  const [activeTab, setActiveTab] = useState('editor')
  const [versions, setVersions] = useState<ResponseVersion[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [readabilityScore, setReadabilityScore] = useState(0)

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(content !== originalContent)
    
    // Calculate word count
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
    
    // Simple readability score (Flesch Reading Ease approximation)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const avgWordsPerSentence = words.length / Math.max(sentences, 1)
    const avgSyllablesPerWord = words.reduce((acc, word) => {
      return acc + estimateSyllables(word)
    }, 0) / Math.max(words.length, 1)
    
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    setReadabilityScore(Math.max(0, Math.min(100, score)))
  }, [content, originalContent])

  const estimateSyllables = (word: string): number => {
    word = word.toLowerCase()
    if (word.length <= 3) return 1
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    word = word.replace(/^y/, '')
    const matches = word.match(/[aeiouy]{1,2}/g)
    return matches ? matches.length : 1
  }

  const handleSave = useCallback(async () => {
    try {
      setSaving(true)
      await onSave(content, {
        wordCount,
        readabilityScore,
        timestamp: new Date().toISOString()
      })
      
      // Add to version history
      const newVersion: ResponseVersion = {
        id: Date.now().toString(),
        content,
        author: {
          id: 'current-user',
          name: 'Current User',
          role: 'agent'
        },
        timestamp: new Date().toISOString(),
        changes: getChanges(originalContent, content),
        approved: false
      }
      
      setVersions(prev => [newVersion, ...prev])
      setHasUnsavedChanges(false)
      toast.success('Response saved')
    } catch (error) {
      toast.error('Failed to save response')
    } finally {
      setSaving(false)
    }
  }, [content, onSave, originalContent, wordCount, readabilityScore])

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true)
      await onSubmit(content, {
        wordCount,
        readabilityScore,
        timestamp: new Date().toISOString(),
        requiresApproval: requireApproval
      })
      
      toast.success(requireApproval ? 'Response submitted for approval' : 'Response sent')
    } catch (error) {
      toast.error('Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }, [content, onSubmit, wordCount, readabilityScore, requireApproval])

  const handleTemplateSelect = useCallback((template: Template) => {
    let templateContent = template.content
    
    // Replace variables with ticket data
    template.variables.forEach(variable => {
      const value = getVariableValue(variable, suggestion)
      templateContent = templateContent.replace(new RegExp(`{{${variable}}}`, 'g'), value)
    })
    
    setContent(templateContent)
    setSelectedTemplate(template)
    setShowTemplateModal(false)
    toast.success(`Template "${template.name}" applied`)
  }, [suggestion])

  const getVariableValue = (variable: string, suggestion: any): string => {
    const mapping: Record<string, string> = {
      'customer_name': suggestion?.ticketId?.requester?.firstName || 'Customer',
      'ticket_id': suggestion?.ticketId?._id?.slice(-6) || 'N/A',
      'ticket_subject': suggestion?.ticketId?.subject || 'N/A',
      'agent_name': 'Agent',
      'company_name': 'Smart Helpdesk'
    }
    
    return mapping[variable] || `{{${variable}}}`
  }

  const getChanges = (original: string, current: string): string[] => {
    // Simple diff implementation
    const changes: string[] = []
    
    if (original.length !== current.length) {
      changes.push(`Length changed from ${original.length} to ${current.length} characters`)
    }
    
    const originalWords = original.split(/\s+/)
    const currentWords = current.split(/\s+/)
    
    if (originalWords.length !== currentWords.length) {
      changes.push(`Word count changed from ${originalWords.length} to ${currentWords.length}`)
    }
    
    return changes
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    toast.success('Response copied to clipboard')
  }

  const getReadabilityLevel = (score: number): { level: string; color: string } => {
    if (score >= 90) return { level: 'Very Easy', color: 'success' }
    if (score >= 80) return { level: 'Easy', color: 'success' }
    if (score >= 70) return { level: 'Fairly Easy', color: 'primary' }
    if (score >= 60) return { level: 'Standard', color: 'primary' }
    if (score >= 50) return { level: 'Fairly Difficult', color: 'warning' }
    if (score >= 30) return { level: 'Difficult', color: 'warning' }
    return { level: 'Very Difficult', color: 'error' }
  }

  const tabs = [
    { id: 'editor', label: 'Editor', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'templates', label: 'Templates', icon: <FileText className="h-4 w-4" /> },
    { id: 'preview', label: 'Preview', icon: <Eye className="h-4 w-4" /> },
    { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-secondary-900">Response Editor</h3>
          <p className="text-sm text-secondary-500">
            Edit and refine the AI-generated response before sending
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <Badge variant="warning" size="sm">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          <Tooltip content="Copy to clipboard">
            <Button
              onClick={copyToClipboard}
              variant="ghost"
              size="sm"
              icon={<Copy className="h-4 w-4" />}
            />
          </Tooltip>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center space-x-6 text-sm text-secondary-600 bg-secondary-50 px-4 py-2 rounded-lg">
        <div className="flex items-center space-x-1">
          <span>Words:</span>
          <span className="font-medium">{wordCount}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>Characters:</span>
          <span className="font-medium">{content.length}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span>Readability:</span>
          <Badge 
            variant={getReadabilityLevel(readabilityScore).color as any} 
            size="sm"
          >
            {getReadabilityLevel(readabilityScore).level}
          </Badge>
        </div>
        {selectedTemplate && (
          <div className="flex items-center space-x-1">
            <span>Template:</span>
            <Badge variant="outline" size="sm">{selectedTemplate.name}</Badge>
          </div>
        )}
      </div>

      {/* Main Editor */}
      <Card>
        <Card.Header>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Card.Header>
        <Card.Body>
          {activeTab === 'editor' && (
            <div className="space-y-4">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Edit the response content..."
                height={400}
                readOnly={readOnly}
                toolbar={[
                  'bold', 'italic', 'underline', '|',
                  'bulletList', 'orderedList', '|',
                  'link', 'blockquote', '|',
                  'undo', 'redo'
                ]}
              />
              
              {suggestion?.knowledgeMatches && suggestion.knowledgeMatches.length > 0 && (
                <div className="border-t border-secondary-200 pt-4">
                  <h4 className="text-sm font-medium text-secondary-900 mb-2">
                    Referenced Knowledge Articles
                  </h4>
                  <div className="space-y-2">
                    {suggestion.knowledgeMatches.slice(0, 3).map((match: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-secondary-700">{match.title}</span>
                        <Badge variant="outline" size="sm">
                          {(match.score * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'templates' && (
            <TemplateSelector
              templates={templates}
              onSelect={handleTemplateSelect}
              selectedTemplate={selectedTemplate}
            />
          )}
          
          {activeTab === 'preview' && (
            <ResponsePreview content={content} />
          )}
          
          {activeTab === 'history' && (
            <VersionHistory versions={versions} onRestore={setContent} />
          )}
        </Card.Body>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onCancel}
          variant="outline"
        >
          Cancel
        </Button>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleSave}
            variant="outline"
            loading={saving}
            disabled={!hasUnsavedChanges || readOnly}
            icon={<Save className="h-4 w-4" />}
          >
            Save Draft
          </Button>
          
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={readOnly}
            icon={<Send className="h-4 w-4" />}
          >
            {requireApproval ? 'Submit for Approval' : 'Send Response'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Template Selector Component
interface TemplateSelectorProps {
  templates: Template[]
  onSelect: (template: Template) => void
  selectedTemplate: Template | null
}

function TemplateSelector({ templates, onSelect, selectedTemplate }: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-secondary-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-secondary-300 rounded-lg px-3 py-2 text-sm"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Template List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedTemplate?.id === template.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200 hover:border-secondary-300'
            }`}
            onClick={() => onSelect(template)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-secondary-900">{template.name}</h4>
              <Badge variant="outline" size="sm">{template.category}</Badge>
            </div>

            <p className="text-sm text-secondary-600 mb-3 line-clamp-2">
              {template.content.substring(0, 150)}...
            </p>

            {template.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.variables.map(variable => (
                  <Badge key={variable} variant="secondary" size="sm">
                    {variable}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-secondary-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Response Preview Component
interface ResponsePreviewProps {
  content: string
}

function ResponsePreview({ content }: ResponsePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-secondary-50 p-4 rounded-lg">
        <h4 className="font-medium text-secondary-900 mb-2">Email Preview</h4>
        <div className="bg-white border border-secondary-200 rounded-lg p-4">
          <div className="border-b border-secondary-200 pb-3 mb-3">
            <div className="text-sm text-secondary-600">
              <div className="flex justify-between">
                <span><strong>From:</strong> support@smarthelpdesk.com</span>
                <span><strong>Date:</strong> {formatDate(new Date())}</span>
              </div>
              <div className="mt-1">
                <strong>Subject:</strong> Re: Your Support Request
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <div
              className="whitespace-pre-wrap text-secondary-700"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          <div className="border-t border-secondary-200 pt-3 mt-4 text-sm text-secondary-500">
            <p>Best regards,<br />Smart Helpdesk Support Team</p>
          </div>
        </div>
      </div>

      <div className="bg-secondary-50 p-4 rounded-lg">
        <h4 className="font-medium text-secondary-900 mb-2">In-App Preview</h4>
        <div className="bg-white border border-secondary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-secondary-900">Support Agent</span>
                <span className="text-xs text-secondary-500">{formatRelativeTime(new Date())}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap text-secondary-700"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Version History Component
interface VersionHistoryProps {
  versions: ResponseVersion[]
  onRestore: (content: string) => void
}

function VersionHistory({ versions, onRestore }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<ResponseVersion | null>(null)
  const [showDiff, setShowDiff] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-secondary-900">Version History</h4>
        {selectedVersion && (
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowDiff(!showDiff)}
              variant="outline"
              size="sm"
            >
              {showDiff ? 'Hide' : 'Show'} Changes
            </Button>
            <Button
              onClick={() => onRestore(selectedVersion.content)}
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Restore
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {versions.map((version, index) => (
          <div
            key={version.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedVersion?.id === version.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200 hover:border-secondary-300'
            }`}
            onClick={() => setSelectedVersion(version)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-secondary-900">
                  Version {versions.length - index}
                </span>
                {version.approved && (
                  <Badge variant="success" size="sm">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                )}
              </div>
              <span className="text-xs text-secondary-500">
                {formatRelativeTime(version.timestamp)}
              </span>
            </div>

            <div className="text-sm text-secondary-600 mb-2">
              <span>By {version.author.name}</span>
              {version.approvedBy && (
                <span> • Approved by {version.approvedBy.name}</span>
              )}
            </div>

            {version.changes.length > 0 && (
              <div className="text-xs text-secondary-500">
                <span className="font-medium">Changes:</span>
                <ul className="list-disc list-inside mt-1">
                  {version.changes.map((change, changeIndex) => (
                    <li key={changeIndex}>{change}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {versions.length === 0 && (
          <div className="text-center py-8 text-secondary-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No version history available</p>
          </div>
        )}
      </div>

      {/* Diff View */}
      {showDiff && selectedVersion && versions.length > 1 && (
        <div className="border-t border-secondary-200 pt-4">
          <h5 className="font-medium text-secondary-900 mb-3">Changes in this version</h5>
          <div className="bg-secondary-50 p-4 rounded-lg">
            <div className="text-sm text-secondary-600">
              {/* Simple diff display - in a real implementation, you'd use a proper diff library */}
              <div className="space-y-2">
                {selectedVersion.changes.map((change, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-success-600">+</span>
                    <span>{change}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
