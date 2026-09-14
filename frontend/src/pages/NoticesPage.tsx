import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Search,
  Megaphone,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ChevronRight,
  Home,
  ArrowUpDown,
  Clock,
} from 'lucide-react'
import { format, isValid } from 'date-fns'
import { noticesAPI, panchayatsAPI } from '../services/api'
import { NOTICE_CATEGORIES } from '../types'
import type { Notice } from '../types'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import NoticeCard, { NOTICE_CATEGORY_ICONS } from '../components/notices/NoticeCard'
import BottomSheet from '../components/ui/BottomSheet'
import NoticeComposer from '../components/admin/NoticeComposer'
import Button from '../components/ui/Button'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { isExpired, withinDateRange, monthLabel, DATE_RANGES, type DateRange } from '../lib/notices'
import { cn } from '../lib/utils'

const RANGE_KEYS: DateRange[] = ['', 'today', 'week', 'month', 'older']

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export default function NoticesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === 'panchayat_admin' || user?.role === 'super_admin'
  const reduced = useReducedMotion()
  const searchInputRef = useRef<HTMLInputElement>(null)
  usePageTitle(t('notices.title'))

  const [params, setParams] = useSearchParams()

  const q = params.get('search') ?? ''
  const cats = parseList(params.get('category'))
  const range = (RANGE_KEYS.includes(params.get('range') as DateRange) ? params.get('range') : '') as DateRange
  const expiredOnly = params.get('status') === 'expired'
  const sort = params.get('sort') === 'oldest' ? 'oldest' : 'newest'
  const sheetOpen = params.get('filters') === 'open'

  // Anonymous visitors pick a panchayat; logged-in users are scoped by session
  const publicPanchayats = useQuery({
    queryKey: ['panchayats', 'public'],
    queryFn: panchayatsAPI.listPublic,
    enabled: !user,
    staleTime: 5 * 60_000,
  })
  const [publicPanchayat, setPublicPanchayat] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notices', user?.panchayatId ?? 'anonymous', publicPanchayat],
    queryFn: () => noticesAPI.list(publicPanchayat || undefined),
    enabled: Boolean(user) || Boolean(publicPanchayat),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  const notices = useMemo(() => data?.notices ?? [], [data])

  const filtered = useMemo(() => {
    let list = notices
    if (cats.length > 0) list = list.filter((n) => cats.includes(n.category))
    if (range) list = list.filter((n) => withinDateRange(n, range))
    if (expiredOnly) list = list.filter((n) => isExpired(n))
    if (q) {
      const needle = q.toLowerCase()
      list = list.filter((n) =>
        [n.title, n.content, n.category, n.posted_by].some((f) => f.toLowerCase().includes(needle)),
      )
    }
    return sort === 'oldest'
      ? [...list].sort((a, b) => a.posted_at.localeCompare(b.posted_at))
      : list
  }, [notices, cats, range, expiredOnly, q, sort])

  /** Alerts are the backend's priority signal — always surfaced first */
  const priorityNotices = useMemo(
    () =>
      filtered.filter((n) => n.category === 'Alert'),
    [filtered],
  )
  const regularNotices = useMemo(
    () => filtered.filter((n) => n.category !== 'Alert'),
    [filtered],
  )

  /** Chronological month groups for the regular notices */
  const monthGroups = useMemo(() => {
    const groups: Array<{ label: string; notices: Notice[] }> = []
    for (const n of regularNotices) {
      const label = monthLabel(n.posted_at)
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.notices.push(n)
      else groups.push({ label, notices: [n] })
    }
    return groups
  }, [regularNotices])

  const activeFilterCount = cats.length + (range ? 1 : 0) + (expiredOnly ? 1 : 0)
  const hasAnyFilter = activeFilterCount > 0 || q !== ''

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const toggleCategory = (category: string) => {
    const next = cats.includes(category) ? cats.filter((c) => c !== category) : [...cats, category]
    updateParams({ category: next.length ? next.join(',') : null })
  }

  const clearAll = () => updateParams({ search: null, category: null, range: null, status: null })

  /* ── Filter controls (sidebar + mobile sheet) ────────────────────────── */
  const filterControls = (
    <div className="space-y-6">
      <fieldset>
        <legend className="label mb-2.5">{t('notices.filterCategory')}</legend>
        <ul className="space-y-1.5">
          {NOTICE_CATEGORIES.map((category) => {
            const Icon = NOTICE_CATEGORY_ICONS[category]
            const checked = cats.includes(category)
            const count = notices.filter((n) => n.category === category).length
            return (
              <li key={category}>
                <label
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                    checked
                      ? 'bg-primary-subtle text-primary-text font-medium'
                      : 'text-text-muted hover:bg-surface-subtle hover:text-ink',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category)}
                    className="accent-[#166534] w-4 h-4"
                  />
                  <Icon size={14} className="shrink-0" />
                  <span className="flex-1">{t(`noticeCategory.${category}`)}</span>
                  <span className="text-[0.72rem] text-text-faint">{count}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="label mb-2.5">{t('notices.filterPosted')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGES.map(({ value, key }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateParams({ range: range === value ? null : value || null })}
              aria-pressed={range === value}
              className={cn(
                'px-2.5 py-1.5 rounded-full text-[0.8rem] font-medium border transition-colors',
                range === value
                  ? 'bg-ink text-canvas border-transparent'
                  : 'bg-surface text-text-muted border-border hover:border-border-strong hover:text-ink',
              )}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label mb-2.5">{t('notices.filterStatus')}</legend>
        <label
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
            expiredOnly
              ? 'bg-primary-subtle text-primary-text font-medium'
              : 'text-text-muted hover:bg-surface-subtle hover:text-ink',
          )}
        >
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={() => updateParams({ status: expiredOnly ? null : 'expired' })}
            className="accent-[#166534] w-4 h-4"
          />
          <Clock size={14} className="shrink-0" />
          {t('notices.filterExpired')}
        </label>
      </fieldset>

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X size={14} />
          {t('notices.clearAll')}
        </Button>
      )}
    </div>
  )

  const activeChips = [
    ...cats.map((c) => ({
      key: `cat-${c}`,
      label: t(`noticeCategory.${c}`),
      remove: () => toggleCategory(c),
    })),
    ...(range
      ? [
          {
            key: 'range',
            label: t(DATE_RANGES.find((r) => r.value === range)!.key),
            remove: () => updateParams({ range: null }),
          },
        ]
      : []),
    ...(expiredOnly
      ? [{ key: 'status', label: t('notices.filterExpired'), remove: () => updateParams({ status: null }) }]
      : []),
    ...(q ? [{ key: 'q', label: `“${q}”`, remove: () => updateParams({ search: null }) }] : []),
  ]

  const latestPosted = notices[0]?.posted_at
  const lastUpdated = latestPosted && isValid(new Date(latestPosted)) ? format(new Date(latestPosted), 'd MMM yyyy') : null

  const searchBox = (
    <div className="relative max-w-2xl">
      <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
      <input
        ref={searchInputRef}
        type="search"
        value={q}
        onChange={(e) => updateParams({ search: e.target.value || null })}
        placeholder={t('notices.searchLong')}
        aria-label={t('notices.searchLong')}
        className="w-full pl-10 pr-10 py-3 border border-border rounded-xl bg-surface text-ink placeholder:text-text-faint shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            updateParams({ search: null })
            searchInputRef.current?.focus()
          }}
          aria-label={t('notices.clearSearch')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-text-faint hover:text-ink hover:bg-surface-subtle rounded-md transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )

  const resultsBody = isLoading ? (
    <div className="space-y-4" aria-hidden="true">
      <Card className="p-5 border-status-rejected-border">
        <Skeleton className="h-3 w-28 mb-3" />
        <Skeleton className="h-5 w-2/3 mb-2" />
        <Skeleton className="h-3 w-full mb-4" />
        <Skeleton className="h-3 w-1/3" />
      </Card>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-5 w-1/2 mb-2" />
          <Skeleton className="h-3 w-4/5 mb-4" />
          <Skeleton className="h-3 w-1/3" />
        </Card>
      ))}
    </div>
  ) : isError ? (
    <Card>
      <ErrorState message={t('notices.loadError')} onRetry={() => refetch()} />
    </Card>
  ) : filtered.length === 0 ? (
    <Card>
      <EmptyState
        icon={hasAnyFilter ? Search : Megaphone}
        title={hasAnyFilter ? t('notices.noMatchTitle') : t('notices.emptyTitle')}
        description={hasAnyFilter ? t('notices.noMatchDesc') : t('notices.emptyDesc')}
        action={
          hasAnyFilter ? (
            <Button variant="primary" size="sm" onClick={clearAll}>
              {t('notices.clearAll')}
            </Button>
          ) : undefined
        }
      />
    </Card>
  ) : (
    <div className="space-y-8">
      {/* Priority notices — category 'Alert' comes from the backend */}
      {priorityNotices.length > 0 && (
        <section aria-labelledby="priority-notices">
          <h2
            id="priority-notices"
            className="flex items-center gap-2 text-sm font-semibold text-status-rejected-text uppercase tracking-wider mb-3"
          >
            <AlertTriangle size={15} />
            {t('notices.important')}
          </h2>
          <div className="space-y-3">
            {priorityNotices.map((n, i) => (
              <motion.div
                key={n.notice_id}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.2), ease: [0.2, 0.8, 0.2, 1] }}
              >
                <NoticeCard notice={n} highlight />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Regular notices grouped chronologically by month */}
      {monthGroups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="text-sm font-semibold text-text-faint uppercase tracking-wider mb-3">
            {group.label}
          </h2>
          <div className="space-y-3">
            {group.notices.map((n, i) => (
              <motion.div
                key={n.notice_id}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.2), ease: [0.2, 0.8, 0.2, 1] }}
              >
                <NoticeCard notice={n} />
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )

  return (
    <div className="container-page py-8 pb-24 lg:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex items-center gap-1.5 text-[0.8rem] text-text-muted">
          <li className="flex items-center gap-1">
            <Home size={12} />
            <Link to="/" className="hover:text-primary transition-colors">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={12} className="text-text-faint" />
          </li>
          <li aria-current="page" className="font-medium text-ink">
            {t('notices.title')}
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="row-between mb-1">
          <h1 className="h1">{t('notices.title')}</h1>
          {isAdmin && <NoticeComposer />}
        </div>
        <p className="text-text-muted mb-1 max-w-2xl">{t('notices.subtitleLong')}</p>
        {!user && (
          <div className="mt-3 mb-1 max-w-sm">
            <label htmlFor="public-panchayat" className="label block mb-1.5">
              {t('notices.choosePanchayat')}
            </label>
            <select
              id="public-panchayat"
              value={publicPanchayat}
              onChange={(e) => setPublicPanchayat(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">{t('notices.selectPanchayat')}</option>
              {(publicPanchayats.data?.panchayats ?? []).map((p) => (
                <option key={p.panchayatId} value={p.panchayatId}>
                  {p.name} ({p.panchayatId})
                </option>
              ))}
            </select>
          </div>
        )}
        {lastUpdated && (
          <p className="caption">
            {t('notices.lastUpdated', { date: lastUpdated })}
          </p>
        )}
        <div className="mt-5">{searchBox}</div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="text-sm text-text-muted" role="status">
          {isLoading ? (
            t('notices.loading')
          ) : (
            t('notices.resultCount', { shown: filtered.length, total: notices.length })
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="lg:hidden"
            onClick={() => updateParams({ filters: 'open' })}
          >
            <SlidersHorizontal size={14} />
            {t('notices.filters')}
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-on text-[0.7rem] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <ArrowUpDown size={14} className="hidden sm:block text-text-faint" />
            <span className="sr-only">{t('notices.sortLabel')}</span>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="px-2.5 py-1.5 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="newest">{t('notices.sortNewest')}</option>
              <option value="oldest">{t('notices.sortOldest')}</option>
            </select>
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center mb-5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.8125rem] font-medium bg-primary-subtle text-primary-text border border-primary-subtle-border hover:bg-primary-subtle/70 transition-colors"
            >
              {chip.label}
              <X size={12} aria-hidden="true" />
              <span className="sr-only">{t('notices.removeFilter', { filter: chip.label })}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[0.8125rem] font-medium text-text-muted hover:text-ink px-2 py-1 underline underline-offset-2"
          >
            {t('notices.clearAll')}
          </button>
        </div>
      )}

      {/* Desktop: sidebar + results. Mobile: stacked */}
      <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        <aside className="hidden lg:block sticky top-[76px]" aria-label={t('notices.filters')}>
          <h2 className="h4 mb-4">{t('notices.filters')}</h2>
          {filterControls}
        </aside>
        <div className="min-w-0">{resultsBody}</div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => updateParams({ filters: null })}
        title={t('notices.filters')}
        footer={
          <Button variant="primary" className="w-full" onClick={() => updateParams({ filters: null })}>
            {t('notices.showResults', { count: sheetOpen ? filtered.length : 0 })}
          </Button>
        }
      >
        {filterControls}
      </BottomSheet>
    </div>
  )
}
