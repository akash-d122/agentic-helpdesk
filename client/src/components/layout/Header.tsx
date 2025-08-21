import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Menu, 
  Bell, 
  Search, 
  User, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react'

import { useAuth } from '@hooks/useAuth'
import { getInitials } from '@utils/helpers'
import { useClickOutside } from '@hooks/useClickOutside'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useClickOutside(userMenuRef, () => setUserMenuOpen(false))
  useClickOutside(notificationsRef, () => setNotificationsOpen(false))

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      {/* Mobile menu button */}
      <button
        type="button"
        className="px-4 border-r border-secondary-200 text-secondary-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Search bar */}
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <form className="w-full flex md:ml-0" action="#" method="GET">
            <label htmlFor="search-field" className="sr-only">
              Search
            </label>
            <div className="relative w-full text-secondary-400 focus-within:text-secondary-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-secondary-900 placeholder-secondary-500 focus:outline-none focus:placeholder-secondary-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search tickets, articles..."
                type="search"
                name="search"
              />
            </div>
          </form>
        </div>

        {/* Right side */}
        <div className="ml-4 flex items-center md:ml-6">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              className="bg-white p-1 rounded-full text-secondary-400 hover:text-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-6 w-6" aria-hidden="true" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-error-500 rounded-full"></span>
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-secondary-200">
                  <h3 className="text-sm font-medium text-secondary-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Placeholder notifications */}
                  <div className="px-4 py-3 text-sm text-secondary-500">
                    No new notifications
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="ml-3 relative" ref={userMenuRef}>
            <div>
              <button
                type="button"
                className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {user ? getInitials(user.firstName, user.lastName) : 'U'}
                  </span>
                </div>
                <span className="ml-2 text-sm font-medium text-secondary-700 hidden md:block">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="ml-1 h-4 w-4 text-secondary-400 hidden md:block" />
              </button>
            </div>

            {/* User menu dropdown */}
            {userMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 border-b border-secondary-200">
                  <p className="text-sm font-medium text-secondary-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-secondary-500">{user?.email}</p>
                  <p className="text-xs text-secondary-400 capitalize">{user?.role}</p>
                </div>

                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="mr-3 h-4 w-4" />
                  Your Profile
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Settings
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-100"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
