import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Megaphone,
  AlertTriangle,
  CalendarDays,
  Users,
  CalendarClock,
  ChevronRight,
  Info,
  PartyPopper,
  Landmark,
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import type { Notice } from '../../types'
import { isExpired } from '../../lib/notices'
import { cn } from '../../lib/utils'

/** Icons per category — one entry per category that exists in the data. */
export const NOTICE_CATEGORY_ICONS: Record<Notice['category'], typeof Megaphone> = {
  'General': Megaphone,
  'Meeting': Users,
  'Alert': AlertTriangle,
  'Scheme': Landmark,
  'Event': PartyPopper,
}

const CATEGORY_CHIP: Record<Notice['category'], string> = {
  'Alert': 'bg-status-rejected-bg text-status-rejected-text border-status-rejected-border',
  'Meeting': 'bg-status-progress-bg text-status-progress-text border-status-progress-border',
  'Scheme': 'bg-primary-subtle text-primary-text border-primary-subtle-border',
  'Event': 'bg-saffron-subtle text-warning border-border',
  'General': 'bg-surface-subtle text-text-muted border-border',
}

interface NoticeCardProps {
  notice: Notice
  /** Alert notices get the priority treatment wherever they appear */
  highlight?: boolean
  className?: string
}

export default function NoticeCard({ notice, highlight, className }: NoticeCardProps) {
  const { t } = useTranslation()
  const Icon = NOTICE_CATEGORY_ICONS[notice.category] ?? Info
  const expired = isExpired(notice)
  const posted = new Date(notice.posted_at)
  const expiry = notice.expiry_date ? new Date(notice.expiry_date) : null

  return (
    <Link
      to={`/notices/${encodeURIComponent(notice.notice_id)}`}
      className={cn(
        'group block bg-surface border rounded-xl p-5',
        'hover:border-border-strong hover:shadow-md transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-primary',
        highlight
          ? 'border-status-rejected-border bg-status-rejected-bg/40'
          : 'border-border',
        expired && 'opacity-75',
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border',
            CATEGORY_CHIP[notice.category] ?? CATEGORY_CHIP['General'],
          )}
        >
          <Icon size={11} />
          {t(`noticeCategory.${notice.category}`)}
        </span>
        {expired && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border bg-surface-subtle text-text-muted border-border">
            <CalendarClock size={11} />
            {t('notices.expired')}
          </span>
        )}
        <time
          dateTime={notice.posted_at}
          className="ml-auto caption shrink-0 flex items-center gap-1"
        >
          <CalendarDays size={12} />
          {isValid(posted) ? format(posted, 'd MMM yyyy') : ''}
        </time>
      </div>

      <h3
        className={cn(
          'font-semibold text-ink leading-snug group-hover:text-primary-text transition-colors',
          highlight ? 'text-base' : 'text-[0.9375rem]',
        )}
      >
        {notice.title}
      </h3>
      <p className="text-sm text-text-muted leading-relaxed mt-1 line-clamp-2">{notice.content}</p>

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border text-[0.75rem] text-text-faint">
        <span className="flex items-center gap-1 min-w-0 truncate">
          <Users size={12} className="shrink-0" />
          {t('notices.postedBy', { name: notice.posted_by })}
        </span>
        {expiry && isValid(expiry) && (
          <span className="shrink-0">
            {expired
              ? t('notices.expiredOn', { date: format(expiry, 'd MMM yyyy') })
              : t('notices.validUntil', { date: format(expiry, 'd MMM yyyy') })}
          </span>
        )}
        <span className="inline-flex items-center gap-0.5 font-medium text-primary group-hover:text-primary-hover shrink-0">
          {t('notices.readNotice')}
          <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
