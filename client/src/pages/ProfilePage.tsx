import React from 'react'
import { User, Mail, Calendar, Shield } from 'lucide-react'

import { useAuth } from '@hooks/useAuth'
import { formatDate } from '@utils/helpers'
import Card from '@components/ui/Card'
import Badge from '@components/ui/Badge'

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-secondary-500">Loading profile...</p>
      </div>
    )
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'error',
      agent: 'warning',
      user: 'primary',
    } as const

    return (
      <Badge variant={variants[role as keyof typeof variants] || 'secondary'}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold leading-7 text-secondary-900 sm:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Manage your account information and preferences.
        </p>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <Card.Body className="text-center">
              {/* Avatar */}
              <div className="mx-auto h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-medium text-primary-600">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>

              {/* Name and Role */}
              <h3 className="text-lg font-medium text-secondary-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-sm text-secondary-500 mb-2">{user.email}</p>
              <div className="flex justify-center">
                {getRoleBadge(user.role)}
              </div>

              {/* Status */}
              <div className="mt-4 pt-4 border-t border-secondary-200">
                <div className="flex items-center justify-center text-sm text-secondary-500">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    user.isActive ? 'bg-success-500' : 'bg-error-500'
                  }`} />
                  {user.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Details */}
        <div className="lg:col-span-2">
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium text-secondary-900">
                Account Information
              </h3>
            </Card.Header>
            <Card.Body>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-secondary-500 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    First Name
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">{user.firstName}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-secondary-500 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Last Name
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">{user.lastName}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-secondary-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">{user.email}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-secondary-500 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Role
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900 capitalize">{user.role}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-secondary-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Member Since
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>

                {user.lastLogin && (
                  <div>
                    <dt className="text-sm font-medium text-secondary-500 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Last Login
                    </dt>
                    <dd className="mt-1 text-sm text-secondary-900">
                      {formatDate(user.lastLogin, 'MMM d, yyyy h:mm a')}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-secondary-500">
                    Email Verified
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${
                        user.emailVerified ? 'bg-success-500' : 'bg-warning-500'
                      }`} />
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
                    </div>
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-secondary-500">
                    Account Status
                  </dt>
                  <dd className="mt-1 text-sm text-secondary-900">
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${
                        user.isActive ? 'bg-success-500' : 'bg-error-500'
                      }`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </dd>
                </div>
              </dl>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Statistics (if available) */}
      {user.statistics && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium text-secondary-900">
              Activity Statistics
            </h3>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {user.statistics.tickets && Object.entries(user.statistics.tickets).map(([key, value]) => (
                <div key={key} className="text-center">
                  <dt className="text-sm font-medium text-secondary-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()} Tickets
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-secondary-900">{value}</dd>
                </div>
              ))}

              {user.statistics.articles && Object.entries(user.statistics.articles).map(([key, value]) => (
                <div key={key} className="text-center">
                  <dt className="text-sm font-medium text-secondary-500 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()} Articles
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-secondary-900">{value}</dd>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}
