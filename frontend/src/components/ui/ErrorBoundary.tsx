import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Button from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/** Keeps a render failure inside one section from blanking the whole app. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    // Surface for diagnostics without crashing the tree
    console.error('Unhandled render error:', error)
  }

  private reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger-subtle border border-status-rejected-border text-danger mb-4">
              <AlertTriangle size={22} />
            </span>
            <h1 className="h2 mb-2">Something went wrong</h1>
            <p className="text-sm text-text-muted mb-5">
              An unexpected error occurred. You can try again or return to the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="primary" onClick={this.reset}>
                <RefreshCw size={15} />
                Try again
              </Button>
              <Button variant="default" onClick={() => (window.location.href = '/dashboard')}>
                Go to dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
