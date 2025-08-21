import { useContext } from 'react'
import AuthContext from '@context/AuthContext'

/**
 * Hook to access authentication context
 * This is a convenience hook that provides the same functionality as useAuth from AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default useAuth
