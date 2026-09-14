import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { RouteLoading } from './RouteLoading'

interface SuperAdminRouteProps {
  children: React.ReactNode
}

/** Platform-administration guard: only super_admin passes. Panchayat admins
 *  and citizens are redirected; backend still authorizes every API call. */
export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <RouteLoading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
