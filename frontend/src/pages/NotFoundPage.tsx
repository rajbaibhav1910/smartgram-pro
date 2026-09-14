import { Link, useLocation } from 'react-router-dom'
import { Compass, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  const location = useLocation()
  const { user } = useAuth()
  const homeTo = user ? (user.role === 'villager' ? '/dashboard' : '/admin') : '/'

  return (
    <div className="container-page py-20">
      <div className="max-w-md mx-auto text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-subtle border border-primary-subtle-border text-primary-text mb-5">
          <Compass size={26} />
        </span>
        <p className="font-mono text-sm text-text-faint mb-2">Error 404</p>
        <h1 className="h1 mb-2">Page not found</h1>
        <p className="text-text-muted mb-8">
          There's no page at <span className="font-mono text-ink break-all">{location.pathname}</span>.
          It may have been moved, or the address may be incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to={homeTo}>
            <Button variant="primary">
              <LayoutDashboard size={15} />
              {user ? 'Go to dashboard' : 'Back to home'}
            </Button>
          </Link>
          <Link to="/">
            <Button variant="default">
              <ArrowLeft size={15} />
              SmartGram home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
