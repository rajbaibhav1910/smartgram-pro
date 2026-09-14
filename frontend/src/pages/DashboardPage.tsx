import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  LayoutList,
  Hourglass,
  Loader,
  CheckCircle2,
  FilePlus2,
  Inbox,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { dashboardAPI, noticesAPI } from '../services/api'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import NoticeCard from '../components/notices/NoticeCard'
import Button from '../components/ui/Button'
import { Card, EmptyState, ErrorState, ListSkeleton } from '../components/ui/States'

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  usePageTitle(t('nav.myDashboard'))
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'citizen', user?.panchayatId],
    queryFn: dashboardAPI.citizen,
  })

  const noticesQuery = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesAPI.list(),
    staleTime: 60_000,
  })
  const latestNotices = (noticesQuery.data?.notices ?? []).slice(0, 3)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('dashboard.greetingMorning', { name: user?.username })
    : hour < 17 ? t('dashboard.greetingAfternoon', { name: user?.username })
    : t('dashboard.greetingEvening', { name: user?.username })

  const recent = (data?.complaints ?? []).slice(0, 5)

  return (
    <div className="container-page py-8 pb-24 lg:pb-8">
      {/* Header */}
      <div className="row-between mb-8">
        <div>
          <h1 className="h1 mb-1">
            {greeting}
          </h1>
          <p className="text-text-muted">{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/complaints/new">
          <Button variant="primary">
            <FilePlus2 size={16} />
            {t('dashboard.reportCta')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label={t('dashboard.totalComplaints')} value={data?.stats.total ?? 0} icon={LayoutList} tone="primary" />
          <StatCard label={t('dashboard.pending')} value={data?.stats.pending ?? 0} icon={Hourglass} tone="pending" />
          <StatCard label={t('dashboard.inProgress')} value={data?.stats.in_progress ?? 0} icon={Loader} tone="progress" />
          <StatCard label={t('dashboard.resolved')} value={data?.stats.resolved ?? 0} icon={CheckCircle2} tone="resolved" />
        </div>
      )}

      {/* Recent complaints */}
      <section aria-labelledby="recent-complaints">
        <div className="row-between mb-4">
          <h2 id="recent-complaints" className="h3">
            {t('dashboard.recent')}
          </h2>
          {(data?.complaints.length ?? 0) > 5 && (
            <Link
              to="/complaints"
              className="text-sm font-medium text-primary hover:text-primary-hover inline-flex items-center gap-1"
            >
              {t('common.viewAll')}
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : isError ? (
          <Card>
            <ErrorState onRetry={() => refetch()} />
          </Card>
        ) : recent.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title={t('dashboard.emptyTitle')}
              description={t('dashboard.emptyDesc')}
              action={
                <Link to="/complaints/new">
                  <Button variant="primary" size="sm">
                    <FilePlus2 size={15} />
                    {t('dashboard.reportCta')}
                  </Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {recent.map((c) => (
              <li key={c.complaint_id}>
                <Link
                  to={`/complaints/${c.complaint_id}`}
                  className="block bg-surface border border-border rounded-xl p-4 shadow-xs hover:border-border-strong hover:shadow-sm transition-all duration-[130ms] focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[0.75rem] text-text-faint">
                          {c.complaint_id}
                        </span>
                        <span className="text-border">·</span>
                        <span className="text-[0.75rem] text-text-muted">{c.category}</span>
                      </div>
                      <h3 className="font-medium text-ink leading-snug truncate">{c.title}</h3>
                      <p className="text-sm text-text-muted mt-1">
                        Submitted {format(new Date(c.submitted_at), 'd MMM yyyy')}
                        {c.updated_at !== c.submitted_at && (
                          <> · Last update {format(new Date(c.updated_at), 'd MMM yyyy')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-center">
                      <StatusBadge status={c.status} />
                      <ChevronRight size={16} className="text-text-faint hidden md:block" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Latest panchayat notices */}
      {latestNotices.length > 0 && (
        <section aria-labelledby="latest-notices" className="mt-8">
          <div className="row-between mb-4">
            <h2 id="latest-notices" className="h3">
              {t('dashboard.noticesTitle')}
            </h2>
            <Link
              to="/notices"
              className="text-sm font-medium text-primary hover:text-primary-hover inline-flex items-center gap-1"
            >
              {t('dashboard.noticesViewAll')}
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {latestNotices.map((n) => (
              <NoticeCard key={n.notice_id} notice={n} className="h-full" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
