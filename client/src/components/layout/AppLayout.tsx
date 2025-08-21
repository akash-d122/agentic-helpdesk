import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'

import Header from './Header'
import Sidebar from './Sidebar'
import { useAuth } from '@hooks/useAuth'

export default function AppLayout() {
  const { isAuthenticated } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Don't render layout for unauthenticated users
  if (!isAuthenticated) {
    return <Outlet />
  }

  return (
    <div className="h-screen flex overflow-hidden bg-secondary-50">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
