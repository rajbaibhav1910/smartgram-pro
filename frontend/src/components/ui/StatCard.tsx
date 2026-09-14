import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'primary' | 'pending' | 'progress' | 'resolved' | 'neutral'
  className?: string
}

const TONE_CONFIG = {
  primary: {
    bg: 'bg-primary-subtle',
    text: 'text-primary-text',
    iconBg: 'bg-primary',
    iconText: 'text-primary-on'
  },
  pending: {
    bg: 'bg-status-pending-bg',
    text: 'text-status-pending-text',
    iconBg: 'bg-status-pending-dot',
    iconText: 'text-white'
  },
  progress: {
    bg: 'bg-status-progress-bg',
    text: 'text-status-progress-text',
    iconBg: 'bg-status-progress-dot',
    iconText: 'text-white'
  },
  resolved: {
    bg: 'bg-status-resolved-bg',
    text: 'text-status-resolved-text',
    iconBg: 'bg-status-resolved-dot',
    iconText: 'text-white'
  },
  neutral: {
    bg: 'bg-surface-subtle',
    text: 'text-ink',
    iconBg: 'bg-border',
    iconText: 'text-text-muted'
  }
}

export default function StatCard({ label, value, icon: Icon, tone = 'primary', className }: StatCardProps) {
  const config = TONE_CONFIG[tone]

  return (
    <div className={cn('bg-surface rounded-lg border border-border p-4', className)}>
      <div className="flex items-start gap-3">
        <span className={cn('flex items-center justify-center w-10 h-10 rounded-lg', config.iconBg, config.iconText)}>
          <Icon size={20} />
        </span>
        <div className="flex-1">
          <div className="text-2xl font-bold text-ink">{value}</div>
          <div className="text-sm text-text-muted">{label}</div>
        </div>
      </div>
    </div>
  )
}