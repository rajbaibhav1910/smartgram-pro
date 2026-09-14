import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  HardHat,
  Droplets,
  Zap,
  Trash2,
  GraduationCap,
  HeartPulse,
  Wheat,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Trash2 as TrashIcon,
  Loader2,
  Route,
} from 'lucide-react'
import { format } from 'date-fns'
import { complaintsAPI, uploadImage } from '../services/api'
import { COMPLAINT_CATEGORIES } from '../types'
import type { Complaint } from '../types'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import Button from '../components/ui/Button'
import { Card } from '../components/ui/States'
import { cn } from '../lib/utils'

const CATEGORY_ICONS: Record<string, typeof HardHat> = {
  'Road Damage': HardHat,
  'Water Supply': Droplets,
  'Electricity': Zap,
  'Sanitation': Trash2,
  'School/Education': GraduationCap,
  'Health': HeartPulse,
  'Agriculture': Wheat,
  'Other': MoreHorizontal,
}

const STEPS = ['stepCategory', 'stepDetails', 'stepEvidence', 'stepReview'] as const
const MAX_FILE_BYTES = 1 * 1024 * 1024 // must match Flask MAX_CONTENT_LENGTH (1 MB)
const MIN_DESCRIPTION = 20

export default function ComplaintSubmitPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { toast } = useToast()
  usePageTitle(t('submit.title'))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState<Complaint | null>(null)

  const detailsValid = title.trim().length >= 3 && description.trim().length >= MIN_DESCRIPTION

  const canContinue = [Boolean(category), detailsValid, true, true][step]

  const handleFileChange = (selected: File | null) => {
    setUploadError('')
    if (!selected) return

    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(selected.type)) {
      setUploadError(t('submit.errFileType'))
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      setUploadError(t('submit.errFileSize'))
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setImageUrl('')
    setUploadProgress(0)

    uploadImage(selected, setUploadProgress)
      .then(({ url }) => setImageUrl(url))
      .catch((err: Error) => {
        setUploadError(err.message)
        setFile(null)
        setPreviewUrl('')
      })
  }

  const removeFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl('')
    setImageUrl('')
    setUploadProgress(0)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    setSubmitError('')
    setIsSubmitting(true)
    try {
      const { complaint } = await complaintsAPI.create({
        category,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl || undefined,
      })
      setSubmitted(complaint)
      toast(t('submit.toastSuccess'))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('submit.formError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ── Confirmation screen ─────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="container-page py-12 pb-24 lg:pb-12">
        <Card className="max-w-lg mx-auto p-8 text-center">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-status-resolved-bg border border-status-resolved-border text-status-resolved-text mb-5">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="h2 mb-2">{t('submit.confirmTitle')}</h1>
          <p className="text-text-muted mb-6">{t('submit.confirmSubtitle')}</p>

          <div className="bg-surface-subtle border border-border rounded-lg p-4 mb-6">
            <p className="text-[0.75rem] font-medium uppercase tracking-wider text-text-faint mb-1">
              {t('submit.complaintId')}
            </p>
            <p className="font-mono text-lg font-semibold text-ink">{submitted.complaint_id}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" onClick={() => navigate(`/complaints/${submitted.complaint_id}`)}>
              <Route size={16} />
              {t('submit.trackComplaint')}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setSubmitted(null)
                setStep(0)
                setCategory('')
                setTitle('')
                setDescription('')
                removeFile()
              }}
            >
              {t('submit.reportAnother')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ── Stepper form ────────────────────────────────────────────────────── */
  return (
    <div className="container-page py-8 pb-24 lg:pb-8 max-w-2xl">
      <h1 className="h1 mb-1">{t('submit.title')}</h1>
      <p className="text-text-muted mb-8">{t('submit.subtitle')}</p>

      {/* Step indicator */}
      <ol className="flex items-center gap-2 mb-6" aria-label={t('submit.progressLabel')}>
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full text-[0.75rem] font-semibold border',
                  i < step && 'bg-primary text-primary-on border-transparent',
                  i === step && 'bg-primary-subtle text-primary-text border-primary-subtle-border',
                  i > step && 'bg-surface text-text-faint border-border',
                )}
              >
                {i < step ? '✓' : i + 1}
              </span>
              <span
                className={cn(
                  'text-[0.8125rem] font-medium hidden sm:block',
                  i === step ? 'text-ink' : 'text-text-faint',
                )}
              >
                {t(`submit.${label}`)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px min-w-4', i < step ? 'bg-primary' : 'bg-border')} />
            )}
          </li>
        ))}
      </ol>

      <Card className="p-5 md:p-6">
        {submitError && (
          <div role="alert" className="mb-4 p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm">
            {submitError}
          </div>
        )}

        {/* Step 1 — category */}
        {step === 0 && (
          <fieldset>
            <legend className="label mb-1">{t('submit.categoryQuestion')}</legend>
            <p className="text-sm text-text-muted mb-4">{t('submit.categoryHelp')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMPLAINT_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c] ?? MoreHorizontal
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border text-[0.8125rem] font-medium transition-all duration-[130ms]',
                      category === c
                        ? 'border-primary bg-primary-subtle text-primary-text'
                        : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-ink',
                    )}
                  >
                    <Icon size={20} />
                    {t(`category.${c}`)}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* Step 2 — details */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="complaint-title" className="label block mb-2">
                {t('submit.titleLabel')}
              </label>
              <input
                id="complaint-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('submit.titlePlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="complaint-description" className="label block mb-2">
                {t('submit.descLabel')}
              </label>
              <textarea
                id="complaint-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('submit.descPlaceholder')}
                aria-describedby="description-hint"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              />
              <p
                id="description-hint"
                className={cn(
                  'text-[0.75rem] mt-1.5',
                  description.trim().length >= MIN_DESCRIPTION ? 'text-status-resolved-text' : 'text-text-faint',
                )}
              >
                {t('submit.charHint', { count: description.trim().length, min: MIN_DESCRIPTION })}
              </p>
            </div>
          </div>
        )}

        {/* Step 3 — evidence */}
        {step === 2 && (
          <div>
            <p className="label mb-1">{t('submit.evidenceLabel')}</p>
            <p className="text-sm text-text-muted mb-4">{t('submit.evidenceHelp')}</p>

            {file && previewUrl ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Selected evidence preview"
                  className="w-full max-h-64 object-contain bg-surface-subtle"
                />
                <div className="flex items-center justify-between gap-3 p-3 bg-surface">
                  <span className="text-sm text-text-muted truncate">{file.name}</span>
                  {imageUrl ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-status-resolved-text shrink-0">
                      <CheckCircle2 size={14} />
                      {t('submit.uploaded')}
                    </span>
                  ) : uploadError ? null : (
                    <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-text-muted shrink-0">
                      <Loader2 size={14} className="animate-spin" />
                      {uploadProgress}%
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-subtle rounded-md transition-colors shrink-0"
                    aria-label={t('submit.removeImage')}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && !uploadError && (
                  <div
                    className="h-1 bg-border"
                    role="progressbar"
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-border-strong rounded-lg text-text-muted hover:border-primary hover:text-primary hover:bg-primary-subtle/50 transition-colors"
              >
                <ImagePlus size={24} />
                <span className="text-sm font-medium">{t('submit.uploadCta')}</span>
                <span className="text-[0.75rem] text-text-faint">{t('submit.uploadHint')}</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="sr-only"
              aria-label={t('submit.uploadLabel')}
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />

            {uploadError && (
              <p role="alert" className="text-sm text-danger mt-3">
                {uploadError}
              </p>
            )}
          </div>
        )}

        {/* Step 4 — review */}
        {step === 3 && (
          <dl className="space-y-4">
            <div className="flex gap-8 flex-wrap">
              <div>
                <dt className="caption mb-0.5">{t('submit.reviewCategory')}</dt>
                <dd className="font-medium text-ink">{category}</dd>
              </div>
              <div>
                <dt className="caption mb-0.5">{t('submit.reviewDate')}</dt>
                <dd className="font-medium text-ink">{format(new Date(), 'd MMMM yyyy')}</dd>
              </div>
            </div>
            <div>
              <dt className="caption mb-0.5">{t('submit.reviewTitle')}</dt>
              <dd className="font-medium text-ink">{title}</dd>
            </div>
            <div>
              <dt className="caption mb-0.5">{t('submit.reviewDescription')}</dt>
              <dd className="text-text-muted whitespace-pre-wrap">{description}</dd>
            </div>
            <div>
              <dt className="caption mb-0.5">{t('submit.reviewEvidence')}</dt>
              <dd className="text-text-muted">
                {file ? t('submit.photoAttached') : t('submit.noPhoto')}
              </dd>
            </div>
            {uploadError && file && (
              <p role="alert" className="text-sm text-danger">
                {t('submit.uploadFailed', { reason: uploadError })}
              </p>
            )}
          </dl>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-border">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={15} />
              {t('submit.back')}
            </Button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <Button variant="primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>
              {t('submit.continue')}
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button
              variant="primary"
              isLoading={isSubmitting}
              disabled={Boolean(file) && !imageUrl && !uploadError}
              onClick={handleSubmit}
            >
              {t('submit.submit')}
            </Button>
          )}
        </div>
      </Card>

      <p className="text-center text-sm text-text-muted mt-4">
        {t('submit.returnLead')}{' '}
        <Link to="/dashboard" className="text-primary hover:text-primary-hover">
          {t('submit.returnLink')}
        </Link>
      </p>
    </div>
  )
}
