import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Home,
  ChevronRight,
  Users,
  CalendarDays,
  CalendarClock,
  Share2,
  Check,
  Printer,
  Link2,
  Info,
  AlertTriangle,
  ArrowLeft,
  Megaphone,
  Hash,
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import { noticesAPI, ApiNotFoundError } from '../services/api'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import { isExpired } from '../lib/notices'
import { NOTICE_CATEGORY_ICONS } from '../components/notices/NoticeCard'
import Button from '../components/ui/Button'
import { Card, ErrorState, Skeleton } from '../components/ui/States'

export default function NoticeDetailPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['notice', id],
    queryFn: () => noticesAPI.get(id!),
    enabled: Boolean(id),
    retry: false,
  })

  const notice = data?.notice
  const notFound = isError && error instanceof ApiNotFoundError
  usePageTitle(notice ? notice.title : t('notices.notFoundTitle'))

  const handleShare = async () => {
    if (!notice) return
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: notice.title, text: t('notices.shareText', { title: notice.title }), url })
        return
      }
      throw new Error('unsupported')
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      copyLink()
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast(t('notices.linkCopied'))
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast(t('notices.shareFailed'), 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl" aria-hidden="true">
        <Skeleton className="h-3.5 w-48 mb-6" />
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Card className="p-6 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="container-page py-16 pb-24 lg:pb-16 max-w-lg text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-subtle border border-border text-text-faint mb-4">
          <Info size={22} />
        </span>
        <h1 className="h2 mb-2">{t('notices.notFoundTitle')}</h1>
        <p className="text-text-muted mb-6">{t('notices.notFoundDesc')}</p>
        <Link to="/notices">
          <Button variant="primary">{t('notices.backToBoard')}</Button>
        </Link>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl">
        <Card>
          <ErrorState message={t('notices.loadError')} onRetry={() => refetch()} />
        </Card>
      </div>
    )
  }

  if (!notice) {
    return (
      <div className="container-page py-16 pb-24 lg:pb-16 max-w-lg text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-subtle border border-border text-text-faint mb-4">
          <Info size={22} />
        </span>
        <h1 className="h2 mb-2">{t('notices.notFoundTitle')}</h1>
        <p className="text-text-muted mb-6">{t('notices.notFoundDesc')}</p>
        <Link to="/notices">
          <Button variant="primary">{t('notices.backToBoard')}</Button>
        </Link>
      </div>
    )
  }

  const CategoryIcon = NOTICE_CATEGORY_ICONS[notice.category] ?? Megaphone
  const expired = isExpired(notice)
  const posted = new Date(notice.posted_at)
  const expiry = notice.expiry_date ? new Date(notice.expiry_date) : null

  return (
    <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl notice-print-area">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5 print:hidden">
        <ol className="flex items-center gap-1.5 text-[0.8rem] text-text-muted flex-wrap">
          <li className="flex items-center gap-1">
            <Home size={12} />
            <Link to="/" className="hover:text-primary transition-colors">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={12} className="text-text-faint" />
          </li>
          <li>
            <Link to="/notices" className="hover:text-primary transition-colors">
              {t('notices.title')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={12} className="text-text-faint" />
          </li>
          <li aria-current="page" className="font-medium text-ink truncate max-w-[16rem] sm:max-w-xs">
            {notice.title}
          </li>
        </ol>
      </nav>

      <article>
        {/* Notice header */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border bg-surface-subtle text-text-muted border-border">
              <CategoryIcon size={11} />
              {t(`noticeCategory.${notice.category}`)}
            </span>
            <div className="flex gap-1 print:hidden">
              <Button variant="default" size="sm" onClick={handleShare} aria-label={t('notices.share')}>
                <Share2 size={14} />
                <span className="hidden sm:inline">{t('notices.share')}</span>
              </Button>
              <Button variant="default" size="sm" onClick={copyLink} aria-label={t('notices.copyLink')}>
                {copied ? <Check size={14} className="text-status-resolved-text" /> : <Link2 size={14} />}
                <span className="hidden sm:inline">{t('notices.copyLink')}</span>
              </Button>
              <Button variant="default" size="sm" onClick={() => window.print()} aria-label={t('notices.print')}>
                <Printer size={14} />
                <span className="hidden sm:inline">{t('notices.print')}</span>
              </Button>
            </div>
          </div>

          <h1 className="h1 mb-3">{notice.title}</h1>

          <dl className="flex items-center gap-x-5 gap-y-1.5 flex-wrap text-[0.8rem] text-text-muted">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={13} className="text-text-faint" />
              <dt className="sr-only">{t('notices.published')}</dt>
              <dd>
                {isValid(posted) ? format(posted, 'd MMMM yyyy') : ''}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-text-faint" />
              <dt className="sr-only">{t('notices.postedByLabel')}</dt>
              <dd>{notice.posted_by}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash size={13} className="text-text-faint" />
              <dt className="sr-only">{t('notices.reference')}</dt>
              <dd className="font-mono">{notice.notice_id}</dd>
            </div>
          </dl>
        </header>

        {/* Expired banner — text + icon, not colour alone */}
        {expired && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3.5 bg-surface-subtle border border-border rounded-lg mb-5 print:hidden"
          >
            <CalendarClock size={16} className="text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink">{t('notices.expiredBannerTitle')}</p>
              {expiry && isValid(expiry) && (
                <p className="text-sm text-text-muted">
                  {t('notices.expiredBannerDesc', { date: format(expiry, 'd MMMM yyyy') })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notice content — document reading experience */}
        <Card className="p-6 md:p-8 mb-5">
          <p className="text-[0.9375rem] leading-[1.8] text-ink whitespace-pre-wrap max-w-[65ch]">
            {notice.content}
          </p>
        </Card>

        {/* Notice metadata */}
        <Card className="p-5 md:p-6 mb-5">
          <h2 className="h4 mb-4">{t('notices.detailsTitle')}</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="caption mb-1">{t('notices.published')}</dt>
              <dd className="text-sm font-medium text-ink">
                {isValid(posted) ? format(posted, 'd MMMM yyyy, h:mm a') : '—'}
              </dd>
            </div>
            <div>
              <dt className="caption mb-1">{t('notices.postedByLabel')}</dt>
              <dd className="text-sm font-medium text-ink">{notice.posted_by}</dd>
            </div>
            <div>
              <dt className="caption mb-1">{t('notices.reference')}</dt>
              <dd className="text-sm font-medium text-ink font-mono">{notice.notice_id}</dd>
            </div>
            <div>
              <dt className="caption mb-1 flex items-center gap-1.5">
                <CalendarClock size={12} />
                {t('notices.validUntilLabel')}
              </dt>
              <dd className="text-sm font-medium text-ink">
                {expiry && isValid(expiry)
                  ? format(expiry, 'd MMMM yyyy')
                  : t('notices.noExpiry')}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Trust note */}
        <p className="flex items-start gap-2 text-[0.8rem] text-text-faint mb-6">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {t('notices.officialNote')}
        </p>
      </article>

      <Link
        to="/notices"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-ink print:hidden"
      >
        <ArrowLeft size={15} />
        {t('notices.backToBoard')}
      </Link>
    </div>
  )
}
