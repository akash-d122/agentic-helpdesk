import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              {/* Icon */}
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-error-100">
                <AlertTriangle className="h-8 w-8 text-error-600" />
              </div>

              {/* Title */}
              <h1 className="mt-6 text-3xl font-bold text-secondary-900">
                Something went wrong
              </h1>

              {/* Description */}
              <p className="mt-4 text-lg text-secondary-600">
                We're sorry, but something unexpected happened.
              </p>

              {/* Error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-6 p-4 bg-error-50 rounded-lg text-left">
                  <h3 className="text-sm font-medium text-error-800 mb-2">
                    Error Details:
                  </h3>
                  <pre className="text-xs text-error-700 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-error-600 mt-2 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleReload}
                  className="btn-outline flex items-center justify-center"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="btn-primary flex items-center justify-center"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Go Home
                </button>
              </div>

              {/* Help Text */}
              <div className="mt-8 text-center">
                <p className="text-sm text-secondary-500">
                  If this problem persists, please{' '}
                  <a
                    href="mailto:support@smarthelpdesk.com"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
