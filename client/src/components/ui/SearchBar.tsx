import React, { useState, useEffect, useRef } from 'react'
import { Search, X, Filter, Clock, TrendingUp } from 'lucide-react'

import { cn, debounce } from '@utils/helpers'
import { useClickOutside } from '@hooks/useClickOutside'
import Button from './Button'
import LoadingSpinner from './LoadingSpinner'

interface SearchResult {
  id: string
  title: string
  description?: string
  type: 'article' | 'ticket' | 'user' | 'other'
  url?: string
  metadata?: Record<string, any>
}

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  onResultSelect?: (result: SearchResult) => void
  results?: SearchResult[]
  loading?: boolean
  showFilters?: boolean
  filters?: SearchFilter[]
  onFiltersChange?: (filters: Record<string, any>) => void
  recentSearches?: string[]
  popularSearches?: string[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
  autoFocus?: boolean
}

interface SearchFilter {
  key: string
  label: string
  type: 'select' | 'text' | 'date' | 'boolean'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export default function SearchBar({
  placeholder = 'Search...',
  onSearch,
  onResultSelect,
  results = [],
  loading = false,
  showFilters = false,
  filters = [],
  onFiltersChange,
  recentSearches = [],
  popularSearches = [],
  className,
  size = 'md',
  autoFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useClickOutside(searchRef, () => {
    setIsOpen(false)
    setShowFilterPanel(false)
  })

  // Debounced search
  const debouncedSearch = debounce((searchQuery: string) => {
    onSearch?.(searchQuery)
  }, 300)

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query)
    }
  }, [query, debouncedSearch])

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(value.length > 0 || recentSearches.length > 0 || popularSearches.length > 0)
  }

  const handleInputFocus = () => {
    setIsOpen(query.length > 0 || recentSearches.length > 0 || popularSearches.length > 0)
  }

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result)
    setQuery(result.title)
    setIsOpen(false)
  }

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm)
    onSearch?.(searchTerm)
    setIsOpen(false)
  }

  const clearSearch = () => {
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleFilterChange = (filterKey: string, value: any) => {
    const newFilters = { ...activeFilters, [filterKey]: value }
    if (!value) {
      delete newFilters[filterKey]
    }
    setActiveFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const getResultIcon = (type: string) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case 'article':
        return <div className={cn(iconClass, "bg-primary-100 text-primary-600 rounded p-1")}>📄</div>
      case 'ticket':
        return <div className={cn(iconClass, "bg-warning-100 text-warning-600 rounded p-1")}>🎫</div>
      case 'user':
        return <div className={cn(iconClass, "bg-success-100 text-success-600 rounded p-1")}>👤</div>
      default:
        return <div className={cn(iconClass, "bg-secondary-100 text-secondary-600 rounded p-1")}>📋</div>
    }
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const inputSizeClasses = {
    sm: 'h-8 pl-8 pr-8',
    md: 'h-10 pl-10 pr-10',
    lg: 'h-12 pl-12 pr-12',
  }

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0

  return (
    <div className={cn('relative', className)} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className={cn(
          'absolute inset-y-0 left-0 flex items-center pointer-events-none',
          size === 'sm' ? 'pl-2' : size === 'lg' ? 'pl-4' : 'pl-3'
        )}>
          <Search className={cn('text-secondary-400', iconSizeClasses[size])} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          className={cn(
            'form-input w-full',
            inputSizeClasses[size],
            sizeClasses[size],
            isOpen && 'rounded-b-none'
          )}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
        />

        <div className={cn(
          'absolute inset-y-0 right-0 flex items-center',
          size === 'sm' ? 'pr-2' : size === 'lg' ? 'pr-4' : 'pr-3'
        )}>
          {loading && <LoadingSpinner size="sm" className="mr-2" />}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              icon={<Filter className={cn(iconSizeClasses[size], hasActiveFilters && 'text-primary-600')} />}
              className={cn(
                'mr-1',
                hasActiveFilters && 'bg-primary-50'
              )}
            />
          )}
          
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              icon={<X className={iconSizeClasses[size]} />}
            />
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-secondary-200 border-t-0 rounded-b-lg shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    className="form-select w-full"
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  >
                    <option value="">All</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={filter.type}
                    className="form-input w-full"
                    placeholder={filter.placeholder}
                    value={activeFilters[filter.key] || ''}
                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-secondary-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveFilters({})
                  onFiltersChange?.({})
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && !showFilterPanel && (
        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-secondary-200 border-t-0 rounded-b-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Search Results */}
          {query && results.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-secondary-500 px-2 py-1 mb-1">
                Search Results
              </div>
              {results.map((result) => (
                <button
                  key={result.id}
                  className="w-full text-left px-2 py-2 hover:bg-secondary-50 rounded flex items-start space-x-3"
                  onClick={() => handleResultClick(result)}
                >
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      {result.title}
                    </p>
                    {result.description && (
                      <p className="text-xs text-secondary-500 truncate">
                        {result.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query && results.length === 0 && !loading && (
            <div className="p-4 text-center text-secondary-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center text-xs font-medium text-secondary-500 px-2 py-1 mb-1">
                <Clock className="h-3 w-3 mr-1" />
                Recent Searches
              </div>
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  className="w-full text-left px-2 py-1 hover:bg-secondary-50 rounded text-sm text-secondary-700"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!query && popularSearches.length > 0 && (
            <div className="p-2 border-t border-secondary-100">
              <div className="flex items-center text-xs font-medium text-secondary-500 px-2 py-1 mb-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Popular Searches
              </div>
              {popularSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  className="w-full text-left px-2 py-1 hover:bg-secondary-50 rounded text-sm text-secondary-700"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  {search}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
