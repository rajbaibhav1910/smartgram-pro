import type { ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import Button from './Button'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('bg-surface border border-border rounded-xl shadow-xs', className)}>
      {children}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ size?: number | string; className?: string }>
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-subtle border border-border text-text-faint mb-4">
        <Icon size={22} />
      </span>
      <h3 className="h4 text-ink mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-5">{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center text-center py-14 px-6"
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-danger-subtle border border-status-rejected-border text-danger mb-4">
        <AlertTriangle size={22} />
      </span>
      <h3 className="h4 text-ink mb-1">{t('states.unableTitle')}</h3>
      <p className="text-sm text-text-muted max-w-sm mb-5">
        {message ?? t('states.unableDesc')}
      </p>
      {onRetry && (
        <Button variant="default" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          {t('states.tryAgain')}
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-border/70', className)} />
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}
