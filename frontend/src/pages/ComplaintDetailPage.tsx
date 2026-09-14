import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  CircleDot,
  Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { complaintsAPI } from '../services/api'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import type { Complaint } from '../types'
import StatusBadge from '../components/ui/StatusBadge'
import Button from '../components/ui/Button'
import { Card, ErrorState, Skeleton } from '../components/ui/States'
import { cn } from '../lib/utils'

const FLOW = ['Pending', 'In Progress', 'Resolved'] as const

function statusStepIndex(status: Complaint['status']): number {
  return FLOW.indexOf(status as (typeof FLOW)[number])
}

export default function ComplaintDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'panchayat_admin' || user?.role === 'super_admin'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['complaint', user?.panchayatId, id],
    queryFn: () => complaintsAPI.get(id!),
    enabled: Boolean(id),
  })

  usePageTitle(data?.complaint ? data.complaint.title : t('detail.pageTitle'))

  const [newStatus, setNewStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [updateError, setUpdateError] = useState('')

  const updateMutation = useMutation({
    mutationFn: (payload: { status: string; remarks: string }) =>
      complaintsAPI.updateStatus(id!, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complaint', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      setNewStatus('')
      setRemarks('')
      setUpdateError('')
      toast(t('detail.statusUpdated', { status: t(`status.${variables.status}`) }))
    },
    onError: (err: Error) => setUpdateError(err.message),
  })

  const handleStatusUpdate = () => {
    if (!newStatus) return
    if (newStatus === 'Rejected' && !window.confirm(t('detail.confirmReject'))) {
      return
    }
    updateMutation.mutate({ status: newStatus, remarks: remarks.trim() })
  }

  if (isLoading) {
    return (
      <div className="container-page py-8 max-w-5xl" aria-hidden="true">
        <Skeleton className="h-4 w-28 mb-6" />
        <div className="grid md:grid-cols-[1fr_320px] gap-6">
          <Card className="p-6 space-y-3">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </Card>
          <Card className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </Card>
        </div>
      </div>
    )
  }

  if (isError || !data?.complaint) {
    return (
      <div className="container-page py-8 max-w-5xl">
        <Card>
          <ErrorState message={t('states.complaintsError')} onRetry={() => refetch()} />
        </Card>
      </div>
    )
  }

  const c = data.complaint
  const currentIndex = statusStepIndex(c.status)
  const isTerminal = c.status === 'Resolved' || c.status === 'Rejected'

  return (
    <div className="container-page py-8 pb-24 lg:pb-8 max-w-5xl">
      <Link
        to={isAdmin ? '/admin' : '/dashboard'}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-ink mb-5"
      >
        <ArrowLeft size={15} />
        {isAdmin ? t('detail.backToOperations') : t('detail.backToDashboard')}
      </Link>

      {/* Heading */}
      <div className="row-between mb-6">
        <div>
          <p className="font-mono text-[0.8rem] text-text-faint mb-1">{c.complaint_id}</p>
          <h1 className="h1">{c.title}</h1>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left column — details */}
        <div className="space-y-5 min-w-0">
          <Card className="p-5 md:p-6">
            <h2 className="h4 mb-4">{t('detail.information')}</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-6">
              <div>
                <dt className="caption mb-0.5">{t('detail.category')}</dt>
                <dd className="text-sm font-medium text-ink">{c.category}</dd>
              </div>
              <div>
                <dt className="caption mb-0.5">{t('detail.village')}</dt>
                <dd className="text-sm font-medium text-ink">{c.village}</dd>
              </div>
              <div>
                <dt className="caption mb-0.5">{t('detail.submitted')}</dt>
                <dd className="text-sm font-medium text-ink">
                  {format(new Date(c.submitted_at), 'd MMM yyyy, h:mm a')}
                </dd>
              </div>
              {!isAdmin && (
                <div>
                  <dt className="caption mb-0.5">{t('detail.reportedBy')}</dt>
                  <dd className="text-sm font-medium text-ink">{c.username}</dd>
                </div>
              )}
              <div>
                <dt className="caption mb-0.5">{t('detail.lastUpdate')}</dt>
                <dd className="text-sm font-medium text-ink">
                  {format(new Date(c.updated_at), 'd MMM yyyy, h:mm a')}
                </dd>
              </div>
            </dl>

            <h3 className="label mb-2">{t('detail.description')}</h3>
            <p className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">
              {c.description}
            </p>
          </Card>

          {/* Evidence */}
          {c.image_url && (
            <Card className="p-5 md:p-6">
              <h2 className="h4 mb-4">
                <span className="inline-flex items-center gap-2">
                  <ImageIcon size={16} className="text-text-muted" />
                  {t('detail.evidence')}
                </span>
              </h2>
              <a href={c.image_url} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={c.image_url}
                  alt={t('detail.evidenceAlt', { id: c.complaint_id })}
                  loading="lazy"
                  className="w-full rounded-lg border border-border max-h-80 object-contain bg-surface-subtle"
                />
              </a>
              <p className="caption mt-2">{t('detail.evidenceHint')}</p>
            </Card>
          )}

          {isAdmin && (
            <Card className="p-5 md:p-6">
              <h2 className="h4 mb-1">{t('detail.citizenDetails')}</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <dt className="caption mb-0.5">{t('detail.name')}</dt>
                  <dd className="text-sm font-medium text-ink">{c.username}</dd>
                </div>
                <div>
                  <dt className="caption mb-0.5">{t('auth.email')}</dt>
                  <dd className="text-sm font-medium text-ink break-all">{c.email}</dd>
                </div>
                <div>
                  <dt className="caption mb-0.5">{t('detail.village')}</dt>
                  <dd className="text-sm font-medium text-ink">{c.village}</dd>
                </div>
              </dl>
            </Card>
          )}
        </div>

        {/* Right column — tracking + admin actions */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="h4 mb-5">{t('detail.progress')}</h2>

            {c.status === 'Rejected' ? (
              <div className="flex items-start gap-3 p-3 bg-status-rejected-bg border border-status-rejected-border rounded-lg">
                <XCircle size={18} className="text-status-rejected-text shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-status-rejected-text">{t('detail.rejected')}</p>
                  {c.admin_remarks && (
                    <p className="text-sm text-status-rejected-text/80 mt-0.5">{c.admin_remarks}</p>
                  )}
                </div>
              </div>
            ) : (
              <ol className="relative">
                {FLOW.map((s, i) => {
                  const done = i < currentIndex || (isTerminal && c.status === 'Resolved')
                  const current = i === currentIndex && !isTerminal
                  return (
                    <li key={s} className="relative flex gap-3 pb-6 last:pb-0">
                      {i < FLOW.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute left-[9px] top-5 bottom-0 w-px',
                            done ? 'bg-primary' : 'bg-border',
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          'relative flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 z-10',
                          done && 'bg-primary border-primary',
                          current && 'border-primary bg-surface',
                          !done && !current && 'border-border bg-surface',
                        )}
                      >
                        {done && <CheckCircle2 size={14} className="text-primary-on" />}
                        {current && <CircleDot size={14} className="text-primary" />}
                        {!done && !current && <span className="w-1.5 h-1.5 rounded-full bg-border-strong" />}
                      </span>
                      <div className="pt-0.5">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            (done || current) ? 'text-ink' : 'text-text-faint',
                          )}
                        >
                          {t(`status.${s}`)}
                          {current && (
                            <span className="sr-only">{t('detail.currentStatus')}</span>
                          )}
                        </p>
                        {current && (
                          <p className="text-[0.75rem] text-text-muted mt-0.5">
                            {t('dashboard.lastUpdate', { date: format(new Date(c.updated_at), 'd MMM yyyy') })}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>

          {/* Status history */}
          {c.timeline && c.timeline.length > 0 && (
            <Card className="p-5">
              <h2 className="h4 mb-4">{t('detail.statusHistory')}</h2>
              <ul className="space-y-4">
                {[...c.timeline].reverse().map((e, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-ink">{t(`status.${e.status}`)}</span>
                      <time className="caption shrink-0">{format(new Date(e.at), 'd MMM, h:mm a')}</time>
                    </div>
                    {e.remarks && <p className="text-text-muted mt-0.5">{e.remarks}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Admin status update */}
          {isAdmin && (
            <Card className="p-5">
              <h2 className="h4 mb-4">{t('detail.updateStatus')}</h2>
              {updateError && (
                <p role="alert" className="text-sm text-danger mb-3">
                  {updateError}
                </p>
              )}
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-status" className="label block mb-1.5">
                    {t('detail.newStatus')}
                  </label>
                  <select
                    id="new-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{t('detail.selectStatus')}</option>
                    <option value="In Progress">{t('status.In Progress')}</option>
                    <option value="Resolved">{t('status.Resolved')}</option>
                    <option value="Rejected">{t('status.Rejected')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="admin-remarks" className="label block mb-1.5">
                    {t('detail.remarks')}
                  </label>
                  <textarea
                    id="admin-remarks"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={t('detail.remarksPlaceholder')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  isLoading={updateMutation.isPending}
                  disabled={!newStatus}
                  onClick={handleStatusUpdate}
                >
                  <Send size={14} />
                  {t('detail.updateBtn')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
