import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import AppLayout from '../../layouts/AppLayout'
import { RouteLoading } from './RouteLoading'

/** Wraps admin-only routes. Citizens are sent to /forbidden (rendered inside
 *  the citizen shell); anonymous visitors go to login. Authorization is also
 *  enforced by the backend — this is UX, not the security boundary. */
export default function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <RouteLoading />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'panchayat_admin' && user.role !== 'super_admin') {
    return <Navigate to="/forbidden" replace />
  }

  return <AppLayout />
}
