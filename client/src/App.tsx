import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

import { useAuth } from '@hooks/useAuth'
import ProtectedRoute from '@components/auth/ProtectedRoute'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import ErrorBoundary from '@components/ui/ErrorBoundary'
import AppLayout from '@components/layout/AppLayout'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@pages/auth/RegisterPage'))
const DashboardPage = lazy(() => import('@pages/DashboardPage'))
const UsersPage = lazy(() => import('@pages/admin/UsersPage'))
const ArticlesPage = lazy(() => import('@pages/ArticlesPage'))
const TicketsPage = lazy(() => import('@pages/TicketsPage'))
const ProfilePage = lazy(() => import('@pages/ProfilePage'))
const AIConfigPage = lazy(() => import('@pages/admin/AIConfigPage'))
const AISuggestionsPage = lazy(() => import('@pages/ai/AISuggestionsPage'))
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'))

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner size="lg" />
  </div>
)

function App() {
  const { user, isLoading } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <PageLoader />
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/dashboard" replace /> : <RegisterPage />
            }
          />

          {/* Protected routes with layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="tickets/*" element={<TicketsPage />} />
            <Route path="articles/*" element={<ArticlesPage />} />

            {/* Admin only routes */}
            <Route
              path="admin/users/*"
              element={
                <ProtectedRoute roles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/ai-config"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AIConfigPage />
                </ProtectedRoute>
              }
            />

            {/* AI routes */}
            <Route
              path="ai/suggestions/*"
              element={
                <ProtectedRoute roles={['admin', 'agent']}>
                  <AISuggestionsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Default redirects */}
          <Route
            path="/"
            element={
              <Navigate
                to={user ? "/dashboard" : "/login"}
                replace
              />
            }
          />

          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
