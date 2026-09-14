import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Home,
  ChevronRight,
  Landmark,
  Star,
  Users,
  Share2,
  Check,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { schemesAPI } from '../services/api'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import { CATEGORY_ICONS } from '../components/schemes/SchemeCard'
import Button from '../components/ui/Button'
import { Card, ErrorState, Skeleton } from '../components/ui/States'

export default function SchemeDetailPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const [shared, setShared] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['schemes'],
    queryFn: schemesAPI.list,
    staleTime: 60_000,
  })

  const scheme = useMemo(
    () => data?.schemes.find((s) => s.id === id),
    [data, id],
  )

  // The list API has no per-id 404 — an unknown id simply matches nothing
  usePageTitle(scheme ? scheme.name : t('schemes.notFoundTitle'))

  const handleShare = async () => {
    if (!scheme) return
    const url = window.location.href
    const shareData = {
      title: scheme.name,
      text: t('schemes.shareText', { name: scheme.name }),
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
      throw new Error('unsupported')
    } catch (err) {
      // User-cancelled share or unsupported API — fall back to copying the link
      if (err instanceof Error && err.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(url)
        setShared(true)
        toast(t('schemes.linkCopied'))
        window.setTimeout(() => setShared(false), 2000)
      } catch {
        toast(t('schemes.shareFailed'), 'error')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl" aria-hidden="true">
        <Skeleton className="h-3.5 w-48 mb-6" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <Card className="p-6 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl">
        <Card>
          <ErrorState message={t('schemes.loadError')} onRetry={() => refetch()} />
        </Card>
      </div>
    )
  }

  if (!scheme) {
    return (
      <div className="container-page py-16 pb-24 lg:pb-16 max-w-lg text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-subtle border border-border text-text-faint mb-4">
          <Info size={22} />
        </span>
        <h1 className="h2 mb-2">{t('schemes.notFoundTitle')}</h1>
        <p className="text-text-muted mb-6">{t('schemes.notFoundDesc')}</p>
        <Link to="/schemes">
          <Button variant="primary">{t('schemes.browseAll')}</Button>
        </Link>
      </div>
    )
  }

  const CategoryIcon = CATEGORY_ICONS[scheme.category] ?? Landmark

  return (
    <div className="container-page py-8 pb-24 lg:pb-12 max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
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
            <Link to="/schemes" className="hover:text-primary transition-colors">
              {t('schemes.title')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={12} className="text-text-faint" />
          </li>
          <li aria-current="page" className="font-medium text-ink truncate max-w-[16rem] sm:max-w-xs">
            {scheme.name}
          </li>
        </ol>
      </nav>

      {/* Scheme header */}
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border bg-primary-subtle text-primary-text border-primary-subtle-border">
                <CategoryIcon size={11} />
                {scheme.category}
              </span>
            </div>
            <h1 className="h1 mb-2">{scheme.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-text-muted">
              <Landmark size={14} className="text-text-faint shrink-0" />
              {scheme.department}
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleShare}
            aria-label={t('schemes.share')}
            className="shrink-0"
          >
            {shared ? <Check size={15} className="text-status-resolved-text" /> : <Share2 size={15} />}
            <span className="hidden sm:inline">{t('schemes.share')}</span>
          </Button>
        </div>
      </header>

      {/* At a glance */}
      <Card className="p-5 md:p-6 mb-5">
        <h2 className="h4 mb-4">{t('schemes.atGlance')}</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <dt className="caption mb-1 flex items-center gap-1.5">
              <Star size={12} className="text-saffron" fill="currentColor" />
              {t('schemes.benefit')}
            </dt>
            <dd className="text-[0.9375rem] font-semibold text-ink">{scheme.benefit}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="caption mb-1 flex items-center gap-1.5">
              <Users size={12} className="text-text-faint" />
              {t('schemes.whoCanApply')}
            </dt>
            <dd className="text-sm font-medium text-ink">{scheme.eligibility}</dd>
          </div>
          <div>
            <dt className="caption mb-1">{t('schemes.department')}</dt>
            <dd className="text-sm font-medium text-ink">{scheme.department}</dd>
          </div>
          <div>
            <dt className="caption mb-1">{t('schemes.filterCategory')}</dt>
            <dd className="text-sm font-medium text-ink">{scheme.category}</dd>
          </div>
        </dl>
      </Card>

      {/* About */}
      <Card className="p-5 md:p-6 mb-5">
        <h2 className="h4 mb-3">{t('schemes.aboutTitle')}</h2>
        <p className="text-sm text-text-muted leading-relaxed">{scheme.description}</p>
      </Card>

      {/* How to apply — honest guidance only; no fabricated steps or document lists */}
      <Card className="p-5 md:p-6 mb-5">
        <h2 className="h4 mb-3">{t('schemes.howToApply')}</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-on text-[0.72rem] font-semibold shrink-0" aria-hidden="true">
              1
            </span>
            <p className="text-text-muted">
              <span className="font-medium text-ink">{t('schemes.applyStep1Title')}</span> — {t('schemes.applyStep1Desc')}
            </p>
          </li>
          <li className="flex gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-on text-[0.72rem] font-semibold shrink-0" aria-hidden="true">
              2
            </span>
            <p className="text-text-muted">
              <span className="font-medium text-ink">{t('schemes.applyStep2Title')}</span> — {t('schemes.applyStep2Desc')}
            </p>
          </li>
        </ol>
        <p className="flex items-start gap-2 mt-4 pt-4 border-t border-border text-[0.8rem] text-text-faint">
          <Info size={13} className="shrink-0 mt-0.5" />
          {t('schemes.applyNote')}
        </p>
      </Card>

      {/* Official portal */}
      <Card className="p-5 md:p-6">
        <h2 className="h4 mb-1 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          {t('schemes.officialSource')}
        </h2>
        <p className="text-sm text-text-muted mb-4">{t('schemes.officialSourceDesc')}</p>
        <a
          href={scheme.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-on font-medium text-sm hover:bg-primary-hover transition-colors"
        >
          {t('schemes.visitPortal')}
          <ExternalLink size={15} />
          <span className="sr-only">{t('schemes.visitPortalAria', { name: scheme.name })}</span>
        </a>
        {scheme.myscheme_url && (
          <a
            href={scheme.myscheme_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
          >
            {t('schemes.viewOnMyScheme')}
            <ExternalLink size={13} />
            <span className="sr-only">{t('schemes.viewOnMySchemeAria', { name: scheme.name })}</span>
          </a>
        )}
        <p className="caption mt-2.5 break-all">{scheme.link}</p>
      </Card>

      <Link
        to="/schemes"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-ink mt-6"
      >
        <ArrowLeft size={15} />
        {t('schemes.backToList')}
      </Link>
    </div>
  )
}
