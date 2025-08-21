import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, Home } from 'lucide-react'

import { useAuth } from '@hooks/useAuth'

export default function UnauthorizedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-error-100">
            <Shield className="h-8 w-8 text-error-600" />
          </div>

          {/* Title */}
          <h1 className="mt-6 text-3xl font-bold text-secondary-900">
            Access Denied
          </h1>

          {/* Description */}
          <p className="mt-4 text-lg text-secondary-600">
            You don't have permission to access this page.
          </p>

          {user && (
            <div className="mt-4 p-4 bg-secondary-100 rounded-lg">
              <p className="text-sm text-secondary-700">
                You are signed in as <strong>{user.firstName} {user.lastName}</strong> with{' '}
                <span className="font-medium capitalize">{user.role}</span> role.
              </p>
              <p className="text-sm text-secondary-600 mt-1">
                Contact your administrator if you believe you should have access to this page.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoBack}
              className="btn-outline flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Go Back
            </button>

            <Link
              to="/dashboard"
              className="btn-primary flex items-center justify-center"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-secondary-500">
              Need help? Contact support at{' '}
              <a
                href="mailto:support@smarthelpdesk.com"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                support@smarthelpdesk.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
