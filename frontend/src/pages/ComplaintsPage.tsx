import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Inbox, ChevronRight, FilePlus2, X } from 'lucide-react'
import { format } from 'date-fns'
import { complaintsAPI } from '../services/api'
import { COMPLAINT_CATEGORIES } from '../types'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import { Card, EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'
import { cn } from '../lib/utils'

const STATUSES = ['Pending', 'In Progress', 'Resolved', 'Rejected'] as const

export default function ComplaintsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  usePageTitle(t('complaints.title'))
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['complaints', user?.panchayatId],
    queryFn: complaintsAPI.list,
  })

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [category, setCategory] = useState<string>('')

  const complaints = data?.complaints ?? []

  const filtered = useMemo(
    () =>
      complaints.filter((c) => {
        if (status && c.status !== status) return false
        if (category && c.category !== category) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            c.title.toLowerCase().includes(q) ||
            c.complaint_id.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q)
          )
        }
        return true
      }),
    [complaints, search, status, category],
  )

  const hasFilters = search || status || category

  return (
    <div className="container-page py-8 pb-24 lg:pb-8">
      <div className="row-between mb-6">
        <div>
          <h1 className="h1 mb-1">{t('complaints.title')}</h1>
          <p className="text-text-muted">{t('complaints.subtitle')}</p>
        </div>
        <Link to="/complaints/new">
          <Button variant="primary">
            <FilePlus2 size={16} />
            {t('dashboard.reportCta')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1 md:max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('complaints.searchPlaceholder')}
            aria-label={t('complaints.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-ink placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{t('complaints.allStatuses')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{t('complaints.allCategories')}</option>
            {COMPLAINT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatus('')
                setCategory('')
              }}
            >
              <X size={14} />
              {t('common.clear')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          {hasFilters ? (
            <EmptyState
              icon={Search}
              title={t('complaints.noMatchesTitle')}
              description={t('complaints.noMatchesDesc')}
            />
          ) : (
            <EmptyState
              icon={Inbox}
              title={t('complaints.emptyTitle')}
              description={t('complaints.emptyDesc')}
              action={
                <Link to="/complaints/new">
                  <Button variant="primary" size="sm">
                    <FilePlus2 size={15} />
                    {t('dashboard.reportCta')}
                  </Button>
                </Link>
              }
            />
          )}
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colComplaint')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colCitizen')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colCategory')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colSubmitted')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('complaints.colStatus')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-text-muted sr-only">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.complaint_id}
                    className="border-b border-border last:border-0 hover:bg-surface-subtle transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/complaints/${c.complaint_id}`} className="block group">
                        <span className="font-medium text-ink group-hover:text-primary transition-colors">
                          {c.title}
                        </span>
                        <span className="block font-mono text-[0.72rem] text-text-faint mt-0.5">
                          {c.complaint_id}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{c.username}</td>
                    <td className="px-4 py-3 text-text-muted">{t(`category.${c.category}`)}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {format(new Date(c.submitted_at), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/complaints/${c.complaint_id}`}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
                        aria-label={t('complaints.view', { id: c.complaint_id })}
                      >
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {filtered.map((c) => (
              <li key={c.complaint_id}>
                <Link
                  to={`/complaints/${c.complaint_id}`}
                  className="block bg-surface border border-border rounded-xl p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <span className="font-mono text-[0.72rem] text-text-faint">{c.complaint_id}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <h3 className="font-medium text-ink leading-snug">{c.title}</h3>
                  <p className="text-sm text-text-muted mt-1">
                    {t(`category.${c.category}`)} · {format(new Date(c.submitted_at), 'd MMM yyyy')}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <p className={cn('text-[0.8rem] text-text-faint mt-4')}>
            {t('complaints.showing', { shown: filtered.length, total: complaints.length })}
          </p>
        </>
      )}
    </div>
  )
}
