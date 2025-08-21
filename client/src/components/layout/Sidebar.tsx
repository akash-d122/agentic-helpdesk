import React, { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
  X,
  Home,
  Ticket,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Brain,
  Zap
} from 'lucide-react'

import { useAuth } from '@hooks/useAuth'
import { usePermissions } from '@hooks/usePermissions'
import { cn } from '@utils/helpers'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  current?: boolean
  permission?: keyof ReturnType<typeof usePermissions>
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  const permissions = usePermissions()

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      permission: 'canViewDashboard',
    },
    {
      name: 'Tickets',
      href: '/tickets',
      icon: Ticket,
      permission: 'canViewTickets',
    },
    {
      name: 'Knowledge Base',
      href: '/articles',
      icon: BookOpen,
      permission: 'canViewArticles',
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      permission: 'canViewUsers',
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      permission: 'canViewUserStatistics',
    },
  ]

  const secondaryNavigation = [
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
    {
      name: 'Help',
      href: '/help',
      icon: HelpCircle,
    },
  ]

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true
    return permissions[item.permission]
  })

  // Add current state to navigation items
  const navigationWithCurrent = filteredNavigation.map(item => ({
    ...item,
    current: location.pathname.startsWith(item.href),
  }))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary-600">
        <Link to="/dashboard" className="flex items-center">
          <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-primary-600" />
          </div>
          <span className="ml-2 text-white text-lg font-semibold">
            Smart Helpdesk
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 bg-white space-y-1">
          {navigationWithCurrent.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                item.current
                  ? 'bg-primary-100 border-primary-500 text-primary-700'
                  : 'border-transparent text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900',
                'group flex items-center pl-3 pr-2 py-2 border-l-4 text-sm font-medium'
              )}
              onClick={onClose}
            >
              <item.icon
                className={cn(
                  item.current
                    ? 'text-primary-500'
                    : 'text-secondary-400 group-hover:text-secondary-500',
                  'mr-3 flex-shrink-0 h-6 w-6'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Secondary navigation */}
        <div className="flex-shrink-0 border-t border-secondary-200 p-4">
          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="group flex items-center px-2 py-2 text-sm font-medium text-secondary-600 rounded-md hover:text-secondary-900 hover:bg-secondary-50"
                onClick={onClose}
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-6 w-6 text-secondary-400 group-hover:text-secondary-500"
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="flex-shrink-0 border-t border-secondary-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-secondary-700">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-secondary-500 capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-40 md:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-secondary-600 bg-opacity-75" />
          </Transition.Child>

          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
            <div className="flex-shrink-0 w-14">
              {/* Force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-secondary-200 bg-white">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}
