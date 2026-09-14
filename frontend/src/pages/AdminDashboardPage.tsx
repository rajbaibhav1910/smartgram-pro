import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  LayoutList,
  Hourglass,
  Loader,
  CheckCircle2,
  Timer,
  Search,
  Inbox,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowUpDown,
  FileText,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { format, subDays, startOfDay, isValid } from 'date-fns'
import { dashboardAPI, superAPI } from '../services/api'
import { useAuth } from '../hooks/use-auth'
import { COMPLAINT_CATEGORIES } from '../types'
import type { Complaint } from '../types'
import { usePageTitle } from '../hooks/use-page-title'
import { useCountUp } from '../hooks/use-count-up'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import ComplaintDrawer from '../components/admin/ComplaintDrawer'
import NoticeComposer from '../components/admin/NoticeComposer'
import Button from '../components/ui/Button'
import { Card, EmptyState, ErrorState, ListSkeleton, Skeleton } from '../components/ui/States'
import { cn } from '../lib/utils'

const PAGE_SIZE = 15
const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'] as const

const STATUS_COLORS: Record<Complaint['status'], string> = {
  'Pending': '#f59e0b',
  'In Progress': '#3b82f6',
  'Resolved': '#22c55e',
  'Rejected': '#ef4444',
}

type SortKey = 'submitted' | 'updated' | 'status'

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: 'rgba(29, 43, 35, 0.04)' }}
      contentStyle={{
        background: '#ffffff',
        border: '1px solid #e5e7e2',
        borderRadius: 10,
        fontSize: 13,
        boxShadow: '0 4px 14px -3px rgba(29, 43, 35, 0.10)',
      }}
      labelStyle={{ color: '#1d2b23', fontWeight: 600 }}
      itemStyle={{ color: '#46534b' }}
    />
  )
}

function StatCardClickable({
  label,
  count,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string
  count: number
  icon: typeof LayoutList
  tone: 'primary' | 'pending' | 'progress' | 'resolved'
  active: boolean
  onClick: () => void
}) {
  const animated = useCountUp(count)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'text-left bg-surface rounded-lg border p-4 transition-all duration-200',
        'hover:border-border-strong hover:shadow-sm',
        active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
            tone === 'primary' && 'bg-primary text-primary-on',
            tone === 'pending' && 'bg-status-pending-dot text-white',
            tone === 'progress' && 'bg-status-progress-dot text-white',
            tone === 'resolved' && 'bg-status-resolved-dot text-white',
          )}
        >
          <Icon size={20} />
        </span>
        <div className="flex-1">
          <div className="text-2xl font-bold text-ink tabular-nums">{animated}</div>
          <div className="text-sm text-text-muted">{label}</div>
        </div>
      </div>
    </button>
  )
}

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'
  const panchayatsQuery = useQuery({
    queryKey: ['super', 'panchayats'],
    queryFn: superAPI.listPanchayats,
    enabled: isSuperAdmin,
  })
  usePageTitle(t('admin.title'))
  const [scopePanchayat, setScopePanchayat] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'admin', user?.role === 'super_admin' ? scopePanchayat : user?.panchayatId],
    queryFn: () => dashboardAPI.admin(user?.role === 'super_admin' ? scopePanchayat || undefined : undefined),
    placeholderData: keepPreviousData,
    enabled: user?.role !== 'super_admin' || scopePanchayat !== '',
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('submitted')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [drawerComplaint, setDrawerComplaint] = useState<Complaint | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const complaints = data?.complaints ?? []

  // '/' focuses search unless the user is typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !drawerComplaint) {
        const el = document.activeElement
        const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
        if (!typing) {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerComplaint])

  // Back to the first page whenever filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter, sortKey, sortAsc])

  /* Complaints per day — last 14 days, derived from real submitted_at data */
  const overTime = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const day = startOfDay(subDays(new Date(), 13 - i))
      return { date: day, label: format(day, 'd MMM'), count: 0 }
    })
    for (const c of complaints) {
      const d = new Date(c.submitted_at)
      if (!isValid(d)) continue
      const bucket = days.find((b) => startOfDay(d).getTime() === b.date.getTime())
      if (bucket) bucket.count += 1
    }
    return days
  }, [complaints])

  const byCategory = useMemo(
    () =>
      Object.entries(data?.stats.categories ?? {})
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    [data],
  )

  const byStatus = useMemo(
    () =>
      (['Pending', 'In Progress', 'Resolved', 'Rejected'] as const)
        .map((s) => ({ name: s, value: complaints.filter((c) => c.status === s).length }))
        .filter((d) => d.value > 0),
    [complaints],
  )

  // Categories that actually exist in the returned complaints
  const presentCategories = useMemo(
    () => COMPLAINT_CATEGORIES.filter((c) => complaints.some((x) => x.category === c)),
    [complaints],
  )

  const filtered = useMemo(() => {
    let list = complaints
    if (statusFilter) list = list.filter((c) => c.status === statusFilter)
    if (categoryFilter) list = list.filter((c) => c.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        [c.complaint_id, c.username, c.category, c.village, c.description, c.title || '']
          .some((f) => f.toLowerCase().includes(q)),
      )
    }
    const dir = sortAsc ? 1 : -1
    return [...list].sort((a, b) => {
      if (sortKey === 'status') return a.status.localeCompare(b.status) * dir
      if (sortKey === 'updated') return a.updated_at.localeCompare(b.updated_at) * dir
      return a.submitted_at.localeCompare(b.submitted_at) * dir
    })
  }, [complaints, statusFilter, categoryFilter, search, sortKey, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const hasFilters = Boolean(search || statusFilter || categoryFilter)
  const avgHours = data?.stats.avg_resolution_hours

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v)
    else {
      setSortKey(key)
      setSortAsc(key !== 'submitted') // newest-first default for dates
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortAsc ? '↑' : '↓') : ''

  const chips = [
    ...(statusFilter
      ? [{ key: 's', label: t(`status.${statusFilter}`), remove: () => setStatusFilter('') }]
      : []),
    ...(categoryFilter
      ? [{ key: 'c', label: t(`category.${categoryFilter}`), remove: () => setCategoryFilter('') }]
      : []),
    ...(search
      ? [{ key: 'q', label: `“${search}”`, remove: () => setSearch('') }]
      : []),
  ]

  return (
    <div className="container-page py-8 pb-24 lg:pb-8">
      <div className="row-between mb-6">
        <div>
          <h1 className="h1 mb-1">{t('admin.title')}</h1>
          <p className="text-text-muted">{t('admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <NoticeComposer />
          <Link to="/complaints/new" className="hidden lg:block">
            <Button variant="default">
              <FileText size={16} />
              {t('admin.newComplaint')}
            </Button>
          </Link>
        </div>
      </div>

      {isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : (
        <>
          {/* Super admin: explicit tenant scope selector */}
          {isSuperAdmin && (
            <div className="flex items-center gap-3 mb-5 p-3 bg-surface border border-border rounded-xl">
              <label htmlFor="scope-panchayat" className="label">{t('admin.viewingPanchayat')}</label>
              <select
                id="scope-panchayat"
                value={scopePanchayat}
                onChange={(e) => setScopePanchayat(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{t('admin.selectPanchayat')}</option>
                {(panchayatsQuery.data?.panchayats ?? []).map((p) => (
                  <option key={p.panchayatId} value={p.panchayatId}>
                    {p.name} ({p.panchayatId}){p.status === 'SUSPENDED' ? ` — ${t('admin.suspended')}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clickable stat cards — filter the table by status */}
          {!isSuperAdmin || scopePanchayat !== '' ? null : (
            <Card className="mb-6">
              <EmptyState icon={SlidersHorizontal} title={t('admin.selectPanchayatFirst')} description={t('admin.selectPanchayatFirstDesc')} />
            </Card>
          )}

          {/* Clickable stat cards — filter the table by status */}
          {isSuperAdmin && scopePanchayat === '' ? null : isLoading ? (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-border/70 animate-pulse" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="h-6 w-10 rounded bg-border/70 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-border/70 animate-pulse" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
              <StatCardClickable
                label={t('dashboard.totalComplaints')}
                count={data?.stats.total ?? 0}
                icon={LayoutList}
                tone="primary"
                active={!statusFilter}
                onClick={() => setStatusFilter('')}
              />
              <StatCardClickable
                label={t('dashboard.pending')}
                count={data?.stats.pending ?? 0}
                icon={Hourglass}
                tone="pending"
                active={statusFilter === 'Pending'}
                onClick={() => setStatusFilter(statusFilter === 'Pending' ? '' : 'Pending')}
              />
              <StatCardClickable
                label={t('dashboard.inProgress')}
                count={data?.stats.in_progress ?? 0}
                icon={Loader}
                tone="progress"
                active={statusFilter === 'In Progress'}
                onClick={() => setStatusFilter(statusFilter === 'In Progress' ? '' : 'In Progress')}
              />
              <StatCardClickable
                label={t('dashboard.resolved')}
                count={data?.stats.resolved ?? 0}
                icon={CheckCircle2}
                tone="resolved"
                active={statusFilter === 'Resolved'}
                onClick={() => setStatusFilter(statusFilter === 'Resolved' ? '' : 'Resolved')}
              />
              <StatCard
                label={t('admin.avgResolution')}
                value={avgHours == null ? '—' : avgHours < 1 ? t('admin.lessThan1hr') : t('admin.hrs', { count: Math.round(avgHours) })}
                icon={Timer}
                tone="neutral"
              />
            </div>
          )}

          {/* Analytics */}
          {isLoading ? (
            <div className="grid lg:grid-cols-3 gap-4 mb-8" aria-hidden="true">
              <Card className="p-5 lg:col-span-2"><Skeleton className="h-56 w-full" /></Card>
              <Card className="p-5"><Skeleton className="h-56 w-full" /></Card>
            </div>
          ) : complaints.length === 0 ? (
            <Card className="mb-8">
              <EmptyState
                icon={Inbox}
                title={t('admin.emptyTitle')}
                description={t('admin.emptyDesc')}
              />
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-4 mb-8">
              <Card className="p-5 lg:col-span-2">
                <h2 className="h4 mb-1">{t('admin.overTimeTitle')}</h2>
                <p className="caption mb-4">{t('admin.overTimeSubtitle')}</p>
                <div className="h-56" role="img" aria-label={t('admin.overTimeAria')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overTime} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="complaintsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#166534" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#166534" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e2" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#99a39c' }} tickLine={false} axisLine={{ stroke: '#e5e7e2' }} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#99a39c' }} tickLine={false} axisLine={false} />
                      {ChartTooltip()}
                      <Area type="monotone" dataKey="count" name={t('admin.complaints')} stroke="#166534" strokeWidth={2} fill="url(#complaintsFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="h4 mb-1">{t('admin.statusTitle')}</h2>
                <p className="caption mb-4">{t('admin.statusSubtitle')}</p>
                <div className="h-56" role="img" aria-label={t('admin.statusAria')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} strokeWidth={0}>
                        {byStatus.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      {ChartTooltip()}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                  {byStatus.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-1.5 text-[0.75rem] text-text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[entry.name] }} />
                      {t(`status.${entry.name}`)} ({entry.value})
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 lg:col-span-3">
                <h2 className="h4 mb-1">{t('admin.categoryTitle')}</h2>
                <p className="caption mb-4">{t('admin.categorySubtitle')}</p>
                <div className="h-64" role="img" aria-label={t('admin.categoryAria')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7e2" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#99a39c' }} tickLine={false} axisLine={{ stroke: '#e5e7e2' }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#99a39c' }} tickLine={false} axisLine={false} />
                      {ChartTooltip()}
                      <Bar dataKey="count" name={t('admin.complaints')} fill="#166534" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* Complaint management table */}
          <section aria-labelledby="manage-complaints">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <h2 id="manage-complaints" className="h3">{t('admin.manageTitle')}</h2>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('admin.searchPlaceholder')}
                    aria-label={t('admin.searchPlaceholder')}
                    className="w-full sm:w-64 pl-9 pr-9 py-2 border border-border rounded-lg bg-surface text-ink placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  {!search && (
                    <kbd
                      aria-hidden="true"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center h-5 px-1.5 rounded border border-border bg-surface-subtle text-[0.7rem] font-medium text-text-faint"
                    >
                      /
                    </kbd>
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label={t('complaints.allStatuses')}
                  className="px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t('complaints.allStatuses')}</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setStatusFilter('')
                      setCategoryFilter('')
                    }}
                  >
                    <X size={14} />
                    {t('notices.clearAll')}
                  </Button>
                )}
              </div>
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center mb-4">
                <SlidersHorizontal size={14} className="text-text-faint" aria-hidden="true" />
                {chips.map((chip) => (
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
              </div>
            )}

            {/* Category filter — only categories actually present in the data */}
            {!isLoading && presentCategories.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4" role="group" aria-label={t('complaints.allCategories')}>
                {presentCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                    aria-pressed={categoryFilter === c}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[0.8rem] font-medium border transition-colors',
                      categoryFilter === c
                        ? 'bg-ink text-canvas border-transparent'
                        : 'bg-surface text-text-muted border-border hover:border-border-strong hover:text-ink',
                    )}
                  >
                    {t(`category.${c}`)}
                  </button>
                ))}
              </div>
            )}

            {isLoading ? (
              <ListSkeleton rows={5} />
            ) : complaints.length === 0 ? (
              <Card>
                <EmptyState icon={Inbox} title={t('admin.emptyGoodTitle')} description={t('admin.emptyGoodDesc')} />
              </Card>
            ) : filtered.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Search}
                  title={t('admin.emptyFilteredTitle')}
                  description={t('admin.emptyFilteredDesc')}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSearch('')
                        setStatusFilter('')
                        setCategoryFilter('')
                      }}
                    >
                      {t('notices.clearAll')}
                    </Button>
                  }
                />
              </Card>
            ) : (
              <>
                {/* Desktop table */}
                <Card className="hidden lg:block overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle text-left">
                        <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colComplaint')}</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colCitizen')}</th>
                        <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colCategory')}</th>
                        <th
                          scope="col"
                          aria-sort={sortKey === 'submitted' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                          className="px-4 py-3 font-semibold text-text-muted"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort('submitted')}
                            className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                          >
                            {t('complaints.colSubmitted')}
                            <ArrowUpDown size={12} aria-hidden="true" />
                            <span aria-hidden="true">{sortIndicator('submitted')}</span>
                          </button>
                        </th>
                        <th
                          scope="col"
                          aria-sort={sortKey === 'updated' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                          className="px-4 py-3 font-semibold text-text-muted"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort('updated')}
                            className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                          >
                            {t('detail.lastUpdate')}
                            <ArrowUpDown size={12} aria-hidden="true" />
                            <span aria-hidden="true">{sortIndicator('updated')}</span>
                          </button>
                        </th>
                        <th
                          scope="col"
                          aria-sort={sortKey === 'status' ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                          className="px-4 py-3 font-semibold text-text-muted"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort('status')}
                            className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                          >
                            {t('complaints.colStatus')}
                            <ArrowUpDown size={12} aria-hidden="true" />
                            <span aria-hidden="true">{sortIndicator('status')}</span>
                          </button>
                        </th>
                        <th scope="col" className="px-4 py-3 font-semibold text-text-muted sr-only">{t('complaints.colAction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((c) => (
                        <tr
                          key={c.complaint_id}
                          className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors"
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setDrawerComplaint(c)}
                              className="block text-left group"
                            >
                              <span className="font-medium text-ink group-hover:text-primary-text transition-colors">
                                {c.title || t(`category.${c.category}`)}
                              </span>
                              <span className="block font-mono text-[0.72rem] text-text-faint mt-0.5">
                                {c.complaint_id}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-text-muted block">{c.username}</span>
                            <span className="text-[0.72rem] text-text-faint block">{c.village}</span>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{t(`category.${c.category}`)}</td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                            {isValid(new Date(c.submitted_at)) ? format(new Date(c.submitted_at), 'd MMM yyyy') : ''}
                          </td>
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                            {isValid(new Date(c.updated_at)) ? format(new Date(c.updated_at), 'd MMM yyyy') : ''}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="default" size="sm" onClick={() => setDrawerComplaint(c)}>
                              {t('admin.manage')}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {/* Mobile stacked cards */}
                <ul className="lg:hidden space-y-3">
                  {pageRows.map((c) => (
                    <li key={c.complaint_id}>
                      <button
                        type="button"
                        onClick={() => setDrawerComplaint(c)}
                        className="w-full text-left bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-strong transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <span className="font-mono text-[0.72rem] text-text-faint">{c.complaint_id}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <h3 className="font-medium text-ink leading-snug">
                          {c.title || t(`category.${c.category}`)}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">
                          {c.username} · {c.village} · {t(`category.${c.category}`)}
                        </p>
                        <p className="caption mt-1">
                          {isValid(new Date(c.submitted_at)) ? format(new Date(c.submitted_at), 'd MMM yyyy') : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                <div className="flex items-center justify-between gap-3 mt-4">
                  <p className="text-[0.8rem] text-text-faint">
                    {t('complaints.showing', {
                      shown: (safePage - 1) * PAGE_SIZE + pageRows.length,
                      total: filtered.length,
                    })}
                    {' · '}
                    {t('admin.pageOf', { page: safePage, pages: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      <ChevronLeft size={14} />
                      {t('admin.prevPage')}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      {t('admin.nextPage')}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <ComplaintDrawer complaint={drawerComplaint} onClose={() => setDrawerComplaint(null)} />
    </div>
  )
}
