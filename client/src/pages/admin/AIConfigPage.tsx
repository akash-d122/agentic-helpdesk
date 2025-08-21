import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Settings, 
  Brain, 
  Zap, 
  Shield, 
  Activity, 
  Save, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

import { usePermissions } from '@hooks/usePermissions'
import { apiService } from '@services/api'

import Card from '@components/ui/Card'
import Button from '@components/ui/Button'
import Input from '@components/ui/Input'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import Badge from '@components/ui/Badge'

interface AIConfig {
  enabled: boolean
  autoResolveThreshold: number
  maxProcessingTime: number
  classification: {
    enabled: boolean
    engine: string
    confidenceThreshold: number
    fallbackToRules: boolean
  }
  knowledgeSearch: {
    enabled: boolean
    maxResults: number
    semanticSearchEnabled: boolean
    keywordFallback: boolean
    minSimilarityScore: number
  }
  responseGeneration: {
    enabled: boolean
    engine: string
    maxLength: number
    includeKnowledgeLinks: boolean
    personalizeResponse: boolean
  }
  openai: {
    enabled: boolean
    model: string
    maxTokens: number
    temperature: number
    rateLimitPerMinute: number
  }
  autoResolution: {
    enabled: boolean
    categories: string[]
    maxPriority: string
    requireKnowledgeMatch: boolean
    minConfidenceScore: number
  }
  learning: {
    enabled: boolean
    feedbackWeight: number
    adaptThresholds: boolean
    trackPerformance: boolean
  }
}

interface AIHealth {
  service: string
  status: string
  engines: Record<string, any>
  queues: Record<string, any>
  config: any
}

export default function AIConfigPage() {
  const permissions = usePermissions()
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [health, setHealth] = useState<AIHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingHealth, setRefreshingHealth] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<AIConfig>()

  // Load configuration and health status
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [configResponse, healthResponse] = await Promise.all([
        apiService.get('/ai/config'),
        apiService.get('/ai/health')
      ])
      
      if (configResponse.status === 'success') {
        setConfig(configResponse.data)
        reset(configResponse.data)
      }
      
      if (healthResponse.status === 'success') {
        setHealth(healthResponse.data)
      }
      
    } catch (error) {
      console.error('Failed to load AI configuration:', error)
      toast.error('Failed to load AI configuration')
    } finally {
      setLoading(false)
    }
  }

  const refreshHealth = async () => {
    try {
      setRefreshingHealth(true)
      
      const response = await apiService.get('/ai/health')
      if (response.status === 'success') {
        setHealth(response.data)
        toast.success('Health status refreshed')
      }
      
    } catch (error) {
      console.error('Failed to refresh health status:', error)
      toast.error('Failed to refresh health status')
    } finally {
      setRefreshingHealth(false)
    }
  }

  const onSubmit = async (data: AIConfig) => {
    try {
      setSaving(true)
      
      const response = await apiService.put('/ai/config', data)
      
      if (response.status === 'success') {
        setConfig(data)
        toast.success('AI configuration updated successfully')
        
        // Refresh health status after config update
        setTimeout(refreshHealth, 1000)
      } else {
        throw new Error(response.message || 'Failed to update configuration')
      }
      
    } catch (error) {
      console.error('Failed to update AI configuration:', error)
      toast.error('Failed to update AI configuration')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'success',
      degraded: 'warning',
      unhealthy: 'error',
      initializing: 'secondary'
    } as const

    const icons = {
      healthy: <CheckCircle className="h-3 w-3" />,
      degraded: <AlertTriangle className="h-3 w-3" />,
      unhealthy: <XCircle className="h-3 w-3" />,
      initializing: <RefreshCw className="h-3 w-3 animate-spin" />
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (!permissions.canManageAI) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto text-secondary-400 mb-4" />
        <h3 className="text-lg font-medium text-secondary-900 mb-2">Access Denied</h3>
        <p className="text-secondary-500">
          You don't have permission to manage AI configuration.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
            AI Configuration
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            Configure AI agent settings, thresholds, and automation rules.
          </p>
        </div>
        <div className="mt-4 flex space-x-2 md:mt-0 md:ml-4">
          <Button
            variant="outline"
            onClick={refreshHealth}
            loading={refreshingHealth}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {health && (
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">Service Health</h3>
            </div>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-secondary-500 mb-1">Overall Status</div>
                {getStatusBadge(health.status)}
              </div>
              
              {health.engines && Object.entries(health.engines).map(([engine, status]: [string, any]) => (
                <div key={engine} className="text-center">
                  <div className="text-sm text-secondary-500 mb-1 capitalize">{engine}</div>
                  {getStatusBadge(status.status || 'unknown')}
                </div>
              ))}
            </div>
            
            {health.queues && (
              <div className="mt-4 pt-4 border-t border-secondary-200">
                <h4 className="text-sm font-medium text-secondary-900 mb-2">Queue Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {Object.entries(health.queues).map(([queue, data]: [string, any]) => (
                    <div key={queue}>
                      <div className="text-secondary-500 capitalize">{queue.replace('-', ' ')}</div>
                      <div className="font-medium">
                        {data.counts ? `${data.counts.waiting + data.counts.active} active` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* General Settings */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">General Settings</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('enabled')}
                className="form-checkbox"
              />
              <label className="text-sm font-medium text-secondary-900">
                Enable AI Processing
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Auto-Resolve Threshold"
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...register('autoResolveThreshold', { 
                  required: 'Auto-resolve threshold is required',
                  min: { value: 0, message: 'Must be between 0 and 1' },
                  max: { value: 1, message: 'Must be between 0 and 1' }
                })}
                error={errors.autoResolveThreshold?.message}
                help="Confidence threshold for automatic ticket resolution (0.0 - 1.0)"
              />

              <Input
                label="Max Processing Time (ms)"
                type="number"
                min="1000"
                max="300000"
                {...register('maxProcessingTime', { 
                  required: 'Max processing time is required',
                  min: { value: 1000, message: 'Must be at least 1000ms' }
                })}
                error={errors.maxProcessingTime?.message}
                help="Maximum time allowed for AI processing"
              />
            </div>
          </Card.Body>
        </Card>

        {/* Classification Settings */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">Classification Engine</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('classification.enabled')}
                className="form-checkbox"
              />
              <label className="text-sm font-medium text-secondary-900">
                Enable Ticket Classification
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Classification Engine</label>
                <select {...register('classification.engine')} className="form-select">
                  <option value="deterministic">Deterministic</option>
                  <option value="llm">LLM-Powered</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <Input
                label="Confidence Threshold"
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...register('classification.confidenceThreshold')}
                help="Minimum confidence for classification"
              />

              <div className="flex items-center space-x-3 pt-6">
                <input
                  type="checkbox"
                  {...register('classification.fallbackToRules')}
                  className="form-checkbox"
                />
                <label className="text-sm text-secondary-700">
                  Fallback to Rules
                </label>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Knowledge Search Settings */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">Knowledge Search</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('knowledgeSearch.enabled')}
                className="form-checkbox"
              />
              <label className="text-sm font-medium text-secondary-900">
                Enable Knowledge Base Search
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Max Results"
                type="number"
                min="1"
                max="50"
                {...register('knowledgeSearch.maxResults')}
                help="Maximum number of search results"
              />

              <Input
                label="Min Similarity Score"
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...register('knowledgeSearch.minSimilarityScore')}
                help="Minimum similarity score for results"
              />

              <div className="space-y-3 pt-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register('knowledgeSearch.semanticSearchEnabled')}
                    className="form-checkbox"
                  />
                  <label className="text-sm text-secondary-700">
                    Semantic Search
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    {...register('knowledgeSearch.keywordFallback')}
                    className="form-checkbox"
                  />
                  <label className="text-sm text-secondary-700">
                    Keyword Fallback
                  </label>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Auto-Resolution Settings */}
        <Card>
          <Card.Header>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary-500" />
              <h3 className="text-lg font-medium text-secondary-900">Auto-Resolution</h3>
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('autoResolution.enabled')}
                className="form-checkbox"
              />
              <label className="text-sm font-medium text-secondary-900">
                Enable Auto-Resolution
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Max Priority for Auto-Resolution</label>
                <select {...register('autoResolution.maxPriority')} className="form-select">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <p className="form-help">Tickets above this priority won't be auto-resolved</p>
              </div>

              <Input
                label="Min Confidence Score"
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...register('autoResolution.minConfidenceScore')}
                help="Minimum confidence required for auto-resolution"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('autoResolution.requireKnowledgeMatch')}
                className="form-checkbox"
              />
              <label className="text-sm text-secondary-700">
                Require Knowledge Base Match
              </label>
            </div>
          </Card.Body>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
          <div className="text-sm text-secondary-500">
            {isDirty && 'You have unsaved changes'}
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset(config)}
              disabled={!isDirty}
            >
              Reset
            </Button>
            <Button
              type="submit"
              loading={saving}
              disabled={!isDirty}
              icon={<Save className="h-4 w-4" />}
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
