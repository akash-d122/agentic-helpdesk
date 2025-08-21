import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-secondary-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-secondary-100">
            <Search className="h-8 w-8 text-secondary-600" />
          </div>

          {/* 404 */}
          <h1 className="mt-6 text-6xl font-bold text-secondary-900">
            404
          </h1>

          {/* Title */}
          <h2 className="mt-4 text-2xl font-bold text-secondary-900">
            Page not found
          </h2>

          {/* Description */}
          <p className="mt-4 text-lg text-secondary-600">
            Sorry, we couldn't find the page you're looking for.
          </p>

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
              to="/"
              className="btn-primary flex items-center justify-center"
            >
              <Home className="h-5 w-5 mr-2" />
              Go Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-secondary-500">
              If you think this is a mistake, please{' '}
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
