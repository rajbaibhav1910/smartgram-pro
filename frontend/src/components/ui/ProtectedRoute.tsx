import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../../hooks/use-auth'
import { RouteLoading } from './RouteLoading'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <RouteLoading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
