import { Link } from 'react-router-dom'
import { ShieldAlert, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import Button from '../components/ui/Button'

/** Shown when a logged-in citizen tries to open an admin-only area. */
export default function ForbiddenPage() {
  const { user, logout } = useAuth()

  return (
    <div className="container-page py-20">
      <div className="max-w-md mx-auto text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-danger-subtle border border-status-rejected-border text-danger mb-5">
          <ShieldAlert size={26} />
        </span>
        <p className="font-mono text-sm text-text-faint mb-2">Error 403</p>
        <h1 className="h1 mb-2">Access restricted</h1>
        <p className="text-text-muted mb-8">
          This area is reserved for panchayat administrators.
          {user && (
            <>
              {' '}You're signed in as <span className="font-medium text-ink">{user.username}</span>.
            </>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/dashboard">
            <Button variant="primary">
              <LayoutDashboard size={15} />
              Go to your dashboard
            </Button>
          </Link>
          {user && (
            <Button variant="default" onClick={() => logout()}>
              Sign out
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
