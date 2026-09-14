import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User,
  MapPin,
  Mail,
  Image as ImageIcon,
  CheckCircle2,
  ArrowRight,
  Send,
  History,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { complaintsAPI } from '../../services/api'
import type { Complaint } from '../../types'
import Drawer from '../ui/Drawer'
import StatusBadge from '../ui/StatusBadge'
import Button from '../ui/Button'
import { useToast } from '../ui/toast'

const NEXT_STATUSES: Array<Complaint['status']> = ['Pending', 'In Progress', 'Resolved', 'Rejected']

interface ComplaintDrawerProps {
  complaint: Complaint | null
  onClose: () => void
}

/** Admin drawer for one complaint: full details plus a confirm-step status
 *  update wired to the real PUT /api/complaints/:id/status endpoint. */
export default function ComplaintDrawer({ complaint, onClose }: ComplaintDrawerProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [newStatus, setNewStatus] = useState('')
  const [remarks, setRemarks] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [formError, setFormError] = useState('')

  // Reset the form whenever a different complaint is opened
  useEffect(() => {
    setNewStatus('')
    setRemarks('')
    setConfirming(false)
    setFormError('')
  }, [complaint?.complaint_id])

  const updateMutation = useMutation({
    mutationFn: (payload: { status: string; remarks: string }) =>
      complaintsAPI.updateStatus(complaint!.complaint_id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'admin'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'citizen'] })
      queryClient.invalidateQueries({ queryKey: ['complaints'] })
      queryClient.invalidateQueries({ queryKey: ['complaint', complaint!.complaint_id] })
      toast(t('admin.updateSuccess', { status: t(`status.${variables.status}`) }))
      onClose()
    },
    onError: (err: Error) => {
      setFormError(err.message || t('admin.updateFailed'))
      setConfirming(false)
    },
  })

  if (!complaint) return null

  const c = complaint
  const submitted = new Date(c.submitted_at)

  const beginConfirm = () => {
    if (!newStatus) return
    if (newStatus === 'Rejected' && !remarks.trim()) {
      setFormError(t('admin.rejectionNeedsRemarks'))
      return
    }
    setFormError('')
    setConfirming(true)
  }

  return (
    <Drawer open onClose={onClose} title={t('admin.drawerTitle')}>
      <div className="space-y-5">
        {/* Identity + status */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-mono text-[0.78rem] text-text-faint">{c.complaint_id}</p>
            <StatusBadge status={c.status} />
          </div>
          <h3 className="h3 leading-snug">{c.title || t(`category.${c.category}`)}</h3>
        </div>

        {/* Citizen details */}
        <section aria-label={t('detail.citizenDetails')}>
          <h4 className="label mb-2">{t('detail.citizenDetails')}</h4>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <User size={14} className="text-text-faint shrink-0" />
              <dt className="sr-only">{t('detail.name')}</dt>
              <dd className="font-medium text-ink">{c.username}</dd>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Mail size={14} className="text-text-faint shrink-0" />
              <dt className="sr-only">{t('auth.email')}</dt>
              <dd className="text-text-muted truncate">{c.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-text-faint shrink-0" />
              <dt className="sr-only">{t('detail.village')}</dt>
              <dd className="text-text-muted">{c.village}</dd>
            </div>
          </dl>
        </section>

        {/* Description */}
        <section aria-label={t('detail.description')}>
          <h4 className="label mb-2">{t('detail.description')}</h4>
          <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
            {c.description}
          </p>
          <p className="caption mt-2">
            {isValidDate(submitted) ? format(submitted, 'd MMM yyyy, h:mm a') : ''}
          </p>
        </section>

        {/* Evidence */}
        {c.image_url && (
          <section aria-label={t('detail.evidence')}>
            <h4 className="label mb-2 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-text-faint" />
              {t('detail.evidence')}
            </h4>
            <a
              href={c.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-border"
            >
              <img
                src={c.image_url}
                alt={t('detail.evidenceAlt', { id: c.complaint_id })}
                loading="lazy"
                className="w-full max-h-56 object-contain bg-surface-subtle"
              />
            </a>
            <p className="caption mt-1.5 flex items-center gap-1">
              <ExternalLink size={11} />
              {t('detail.evidenceHint')}
            </p>
          </section>
        )}

        {/* Status history */}
        {c.timeline && c.timeline.length > 0 && (
          <section aria-label={t('detail.statusHistory')}>
            <h4 className="label mb-2 flex items-center gap-1.5">
              <History size={14} className="text-text-faint" />
              {t('detail.statusHistory')}
            </h4>
            <ul className="space-y-2.5">
              {[...c.timeline].reverse().map((e, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{t(`status.${e.status}`)}</span>
                    <time className="caption shrink-0">
                      {isValidDate(new Date(e.at)) ? format(new Date(e.at), 'd MMM, h:mm a') : ''}
                    </time>
                  </div>
                  {e.remarks && <p className="text-text-muted mt-0.5">{e.remarks}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Status update */}
        <section
          aria-label={t('detail.updateStatus')}
          className="border border-border rounded-xl p-4 bg-surface-subtle"
        >
          <h4 className="label mb-3">{t('detail.updateStatus')}</h4>
          {formError && (
            <p role="alert" className="mb-3 p-2.5 bg-danger-subtle border border-danger rounded-lg text-danger text-sm">
              {formError}
            </p>
          )}

          {!confirming ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="drawer-status" className="caption block mb-1">
                  {t('admin.currentStatus')}: <span className="font-semibold text-ink">{t(`status.${c.status}`)}</span>
                </label>
                <select
                  id="drawer-status"
                  value={newStatus}
                  onChange={(e) => {
                    setNewStatus(e.target.value)
                    setFormError('')
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">{t('detail.selectStatus')}</option>
                  {NEXT_STATUSES.filter((s) => s !== c.status).map((s) => (
                    <option key={s} value={s}>{t(`status.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="drawer-remarks" className="caption block mb-1">
                  {t('detail.remarks')}
                </label>
                <textarea
                  id="drawer-remarks"
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={t('detail.remarksPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink text-sm placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                />
              </div>
              <Button
                variant="primary"
                className="w-full"
                disabled={!newStatus}
                onClick={beginConfirm}
              >
                {t('admin.reviewChange')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Before → after, text + icon, never colour alone */}
              <div
                className="flex items-center justify-center gap-3 p-3 bg-surface border border-border rounded-lg"
                role="status"
              >
                <StatusBadge status={c.status} />
                <ArrowRight size={16} className="text-text-faint shrink-0" aria-hidden="true" />
                <StatusBadge status={newStatus as Complaint['status']} />
              </div>
              {remarks.trim() && (
                <p className="text-sm text-text-muted">
                  <span className="font-medium text-ink">{t('detail.remarks')}: </span>
                  {remarks.trim()}
                </p>
              )}
              {newStatus === 'Rejected' && (
                <p className="flex items-start gap-2 text-sm text-danger">
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
                  {t('detail.confirmReject')}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  isLoading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ status: newStatus, remarks: remarks.trim() })}
                >
                  <Send size={14} />
                  {t('admin.confirmUpdate')}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Drawer>
  )
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime())
}
