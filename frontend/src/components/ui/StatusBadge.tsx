import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'
  className?: string
}

const STATUS_CONFIG = {
  'Pending': {
    className: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
    dot: 'bg-status-pending-dot'
  },
  'In Progress': {
    className: 'bg-status-progress-bg text-status-progress-text border-status-progress-border',
    dot: 'bg-status-progress-dot'
  },
  'Resolved': {
    className: 'bg-status-resolved-bg text-status-resolved-text border-status-resolved-border',
    dot: 'bg-status-resolved-dot'
  },
  'Rejected': {
    className: 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
    dot: 'bg-status-rejected-dot'
  }
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Pending']

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {t(`status.${status}`)}
    </span>
  )
}