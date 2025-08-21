import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import { cn } from '@utils/helpers'
import Card from './Card'

interface StatsCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  icon?: React.ReactNode
  description?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  className?: string
  onClick?: () => void
}

const colorClasses = {
  primary: {
    icon: 'bg-primary-100 text-primary-600',
    change: {
      increase: 'text-primary-600',
      decrease: 'text-primary-600',
      neutral: 'text-primary-600',
    },
  },
  success: {
    icon: 'bg-success-100 text-success-600',
    change: {
      increase: 'text-success-600',
      decrease: 'text-success-600',
      neutral: 'text-success-600',
    },
  },
  warning: {
    icon: 'bg-warning-100 text-warning-600',
    change: {
      increase: 'text-warning-600',
      decrease: 'text-warning-600',
      neutral: 'text-warning-600',
    },
  },
  error: {
    icon: 'bg-error-100 text-error-600',
    change: {
      increase: 'text-error-600',
      decrease: 'text-error-600',
      neutral: 'text-error-600',
    },
  },
  secondary: {
    icon: 'bg-secondary-100 text-secondary-600',
    change: {
      increase: 'text-secondary-600',
      decrease: 'text-secondary-600',
      neutral: 'text-secondary-600',
    },
  },
}

const sizeClasses = {
  sm: {
    icon: 'h-8 w-8',
    iconContainer: 'h-10 w-10',
    title: 'text-sm',
    value: 'text-lg',
    change: 'text-xs',
    description: 'text-xs',
  },
  md: {
    icon: 'h-6 w-6',
    iconContainer: 'h-12 w-12',
    title: 'text-sm',
    value: 'text-2xl',
    change: 'text-sm',
    description: 'text-sm',
  },
  lg: {
    icon: 'h-8 w-8',
    iconContainer: 'h-16 w-16',
    title: 'text-base',
    value: 'text-3xl',
    change: 'text-base',
    description: 'text-base',
  },
}

export default function StatsCard({
  title,
  value,
  change,
  icon,
  description,
  color = 'primary',
  size = 'md',
  loading = false,
  className,
  onClick,
}: StatsCardProps) {
  const colorConfig = colorClasses[color]
  const sizeConfig = sizeClasses[size]

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    const iconClass = cn('h-4 w-4', sizeConfig.change)
    
    switch (type) {
      case 'increase':
        return <TrendingUp className={iconClass} />
      case 'decrease':
        return <TrendingDown className={iconClass} />
      case 'neutral':
        return <Minus className={iconClass} />
      default:
        return null
    }
  }

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-success-600'
      case 'decrease':
        return 'text-error-600'
      case 'neutral':
        return 'text-secondary-500'
      default:
        return 'text-secondary-500'
    }
  }

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <Card.Body className="flex items-center">
          <div className="flex-shrink-0">
            <div className={cn('rounded-lg', sizeConfig.iconContainer, 'bg-secondary-200')} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
            <div className="h-6 bg-secondary-200 rounded w-1/2"></div>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        className,
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      onClick={onClick}
    >
      <Card.Body className="flex items-center">
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0">
            <div className={cn(
              'rounded-lg flex items-center justify-center',
              sizeConfig.iconContainer,
              colorConfig.icon
            )}>
              <div className={sizeConfig.icon}>
                {icon}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className={cn('w-0 flex-1', icon && 'ml-5')}>
          <dl>
            <dt className={cn(
              'font-medium text-secondary-500 truncate',
              sizeConfig.title
            )}>
              {title}
            </dt>
            <dd className={cn(
              'font-semibold text-secondary-900',
              sizeConfig.value
            )}>
              {formatValue(value)}
            </dd>
          </dl>

          {/* Change indicator */}
          {change && (
            <div className={cn(
              'flex items-center mt-1',
              sizeConfig.change
            )}>
              <div className={cn(
                'flex items-center',
                getChangeColor(change.type)
              )}>
                {getChangeIcon(change.type)}
                <span className="ml-1 font-medium">
                  {Math.abs(change.value)}%
                </span>
              </div>
              {change.period && (
                <span className="ml-2 text-secondary-500">
                  vs {change.period}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p className={cn(
              'text-secondary-500 mt-1',
              sizeConfig.description
            )}>
              {description}
            </p>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}

// Grid component for multiple stats cards
interface StatsGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function StatsGrid({ 
  children, 
  columns = 4, 
  className 
}: StatsGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn(
      'grid gap-4',
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  )
}

// Compact stats card for smaller spaces
export function CompactStatsCard({
  title,
  value,
  change,
  className,
}: {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease' | 'neutral'
  }
  className?: string
}) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    return val
  }

  const getChangeColor = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase':
        return 'text-success-600'
      case 'decrease':
        return 'text-error-600'
      case 'neutral':
        return 'text-secondary-500'
      default:
        return 'text-secondary-500'
    }
  }

  return (
    <div className={cn('text-center', className)}>
      <dt className="text-sm font-medium text-secondary-500">
        {title}
      </dt>
      <dd className="mt-1 text-2xl font-semibold text-secondary-900">
        {formatValue(value)}
      </dd>
      {change && (
        <div className={cn(
          'mt-1 text-sm font-medium',
          getChangeColor(change.type)
        )}>
          {change.type === 'increase' ? '+' : change.type === 'decrease' ? '-' : ''}
          {Math.abs(change.value)}%
        </div>
      )}
    </div>
  )
}
