import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Users, FileText, ShieldCheck, Plus, Ban, CircleCheck, ScrollText } from 'lucide-react'
import { format } from 'date-fns'
import { superAPI } from '../services/api'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Card, ErrorState, Skeleton } from '../components/ui/States'
import { cn } from '../lib/utils'

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

export default function SuperAdminPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  usePageTitle(t('superAdmin.title'))
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const overview = useQuery({ queryKey: ['super', 'overview'], queryFn: superAPI.overview })
  const panchayats = useQuery({ queryKey: ['super', 'panchayats'], queryFn: superAPI.listPanchayats })
  const audit = useQuery({ queryKey: ['super', 'audit'], queryFn: superAPI.audit })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      superAPI.setPanchayatStatus(id, status),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['super'] })
      toast(vars.status === 'SUSPENDED' ? t('superAdmin.suspendedToast') : t('superAdmin.activatedToast'))
    },
    onError: (err: Error) => toast(err.message, 'error'),
  })

  const stats = [
    { icon: Building2, label: t('superAdmin.totalPanchayats'), value: overview.data?.totalPanchayats ?? '—' },
    { icon: ShieldCheck, label: t('superAdmin.activePanchayats'), value: overview.data?.activePanchayats ?? '—' },
    { icon: Users, label: t('superAdmin.totalUsers'), value: overview.data?.totalUsers ?? '—' },
    { icon: FileText, label: t('superAdmin.totalComplaints'), value: overview.data?.totalComplaints ?? '—' },
    {
      icon: CircleCheck,
      label: t('superAdmin.resolutionRate'),
      value: overview.data?.resolutionRate == null ? '—' : `${overview.data.resolutionRate}%`,
    },
  ]

  return (
    <div className="container-page py-8 pb-24 lg:pb-8">
      <div className="row-between mb-6">
        <div>
          <h1 className="h1 mb-1">{t('superAdmin.title')}</h1>
          <p className="text-text-muted">{t('superAdmin.subtitle')}</p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          {t('superAdmin.addPanchayat')}
        </Button>
      </div>

      {overview.isError ? (
        <Card>
          <ErrorState onRetry={() => overview.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-8">
          {overview.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4" aria-hidden="true">
                  <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                  <Skeleton className="h-6 w-12 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </Card>
              ))
            : stats.map((s) => (
                <Card key={s.label} className="p-4">
                  <s.icon size={20} className="text-primary mb-2" aria-hidden="true" />
                  <div className="text-2xl font-bold text-ink tabular-nums">{s.value}</div>
                  <div className="text-sm text-text-muted">{s.label}</div>
                </Card>
              ))}
        </div>
      )}

      {/* Panchayats table */}
      <section aria-labelledby="panchayats-heading" className="mb-8">
        <h2 id="panchayats-heading" className="h3 mb-4">{t('superAdmin.panchayatsTitle')}</h2>
        {panchayats.isLoading ? (
          <Card className="p-4" aria-hidden="true">
            <Skeleton className="h-40 w-full" />
          </Card>
        ) : panchayats.isError ? (
          <Card>
            <ErrorState onRetry={() => panchayats.refetch()} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-subtle text-left">
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colName')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colId')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colDistrict')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colComplaints')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colStatus')}</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-text-muted">{t('superAdmin.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(panchayats.data?.panchayats ?? []).map((p) => (
                    <tr key={p.panchayatId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-[0.75rem] text-text-faint">{p.panchayatId}</td>
                      <td className="px-4 py-3 text-text-muted">{[p.district, p.state].filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-text-muted tabular-nums">{p.complaintCount ?? 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[0.78rem] font-medium',
                            p.status === 'ACTIVE' ? 'text-status-resolved-text' : 'text-danger',
                          )}
                        >
                          {p.status === 'ACTIVE' ? <CircleCheck size={13} /> : <Ban size={13} />}
                          {p.status === 'ACTIVE' ? t('superAdmin.active') : t('superAdmin.suspended')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'ACTIVE' ? (
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: p.panchayatId, status: 'SUSPENDED' })}
                          >
                            <Ban size={13} />
                            {t('superAdmin.suspend')}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: p.panchayatId, status: 'ACTIVE' })}
                          >
                            <CircleCheck size={13} />
                            {t('superAdmin.activate')}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {/* Audit log */}
      <section aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="h3 mb-4 flex items-center gap-2">
          <ScrollText size={17} className="text-text-muted" />
          {t('superAdmin.auditTitle')}
        </h2>
        {audit.isLoading ? (
          <Card className="p-4" aria-hidden="true">
            <Skeleton className="h-24 w-full" />
          </Card>
        ) : (audit.data?.events ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-text-muted p-4">{t('superAdmin.auditEmpty')}</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {(audit.data?.events ?? []).map((e) => (
                <li key={e.audit_id} className="px-4 py-2.5 text-sm flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-ink">
                    <span className="font-medium">{e.actorName || e.actorId}</span>{' '}
                    <span className="text-text-muted">{e.action}</span>{' '}
                    <span className="font-mono text-[0.75rem] text-text-faint">{e.resourceId}</span>
                    <span className={cn('ml-2 text-[0.75rem]', e.result === 'DENIED' ? 'text-danger' : 'text-status-resolved-text')}>
                      {e.result}
                    </span>
                  </span>
                  <span className="caption flex items-center gap-2">
                    <span className="font-mono">{e.panchayatId}</span>
                    {isValidDateStr(e.timestamp) && format(new Date(e.timestamp), 'd MMM, h:mm a')}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <CreatePanchayatModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ['super'] })
        }}
      />
    </div>
  )
}

function isValidDateStr(iso: string) {
  return !Number.isNaN(new Date(iso).getTime())
}

/* ── Create panchayat modal ───────────────────────────────────────────────── */
function CreatePanchayatModal({
  open, onClose, onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    panchayatId: '', name: '', district: '', state: '',
    contactEmail: '', contactPhone: '',
    adminUsername: '', adminEmail: '', adminPassword: '',
  })
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () => superAPI.createPanchayat(form),
    onSuccess: () => {
      setForm({ panchayatId: '', name: '', district: '', state: '', contactEmail: '', contactPhone: '', adminUsername: '', adminEmail: '', adminPassword: '' })
      setError('')
      onCreated()
    },
    onError: (err: Error) => setError(err.message),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Modal open={open} onClose={onClose} title={t('superAdmin.addPanchayat')}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.name.trim()) {
            setError(t('superAdmin.nameRequired'))
            return
          }
          create.mutate()
        }}
      >
        {error && (
          <p role="alert" className="p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="p-id" className="label block mb-1.5">{t('superAdmin.panchayatIdLabel')}</label>
          <input id="p-id" type="text" value={form.panchayatId} onChange={set('panchayatId')} placeholder="PB010" className={inputClass} />
          <p className="caption mt-1">{t('superAdmin.panchayatIdHint')}</p>
        </div>
        <div>
          <label htmlFor="p-name" className="label block mb-1.5">{t('superAdmin.nameLabel')}</label>
          <input id="p-name" type="text" value={form.name} onChange={set('name')} placeholder={t('superAdmin.namePlaceholder')} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-district" className="label block mb-1.5">{t('superAdmin.districtLabel')}</label>
            <input id="p-district" type="text" value={form.district} onChange={set('district')} className={inputClass} />
          </div>
          <div>
            <label htmlFor="p-state" className="label block mb-1.5">{t('superAdmin.stateLabel')}</label>
            <input id="p-state" type="text" value={form.state} onChange={set('state')} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="p-email" className="label block mb-1.5">{t('superAdmin.emailLabel')}</label>
            <input id="p-email" type="email" value={form.contactEmail} onChange={set('contactEmail')} className={inputClass} />
          </div>
          <div>
            <label htmlFor="p-phone" className="label block mb-1.5">{t('superAdmin.phoneLabel')}</label>
            <input id="p-phone" type="tel" value={form.contactPhone} onChange={set('contactPhone')} className={inputClass} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="label mb-3">{t('superAdmin.adminSection')}</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="p-admin-user" className="label block mb-1.5">{t('superAdmin.adminUsername')}</label>
              <input id="p-admin-user" type="text" value={form.adminUsername} onChange={set('adminUsername')} autoComplete="off" className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-admin-email" className="label block mb-1.5">{t('superAdmin.adminEmail')}</label>
              <input id="p-admin-email" type="email" value={form.adminEmail} onChange={set('adminEmail')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-admin-pass" className="label block mb-1.5">{t('superAdmin.adminPassword')}</label>
              <input id="p-admin-pass" type="password" value={form.adminPassword} onChange={set('adminPassword')} autoComplete="new-password" className={inputClass} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="primary" isLoading={create.isPending}>{t('superAdmin.create')}</Button>
        </div>
      </form>
    </Modal>
  )
}
