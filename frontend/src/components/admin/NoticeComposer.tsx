import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { noticesAPI } from '../../services/api'
import { NOTICE_CATEGORIES } from '../../types'
import type { Notice } from '../../types'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useToast } from '../ui/toast'

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg bg-surface text-ink placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

/** Admin-only composer backed by POST /api/notices. */
export default function NoticeComposer() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('General')
  const [expiryDate, setExpiryDate] = useState('')
  const [fieldError, setFieldError] = useState('')

  const createMutation = useMutation({
    mutationFn: () =>
      noticesAPI.create({
        title: title.trim(),
        content: content.trim(),
        category: category as Notice['category'],
        expiry_date: expiryDate || '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] })
      toast(t('notices.created'))
      handleClose()
    },
    onError: (err: Error) => toast(err.message || t('notices.createError'), 'error'),
  })

  const handleClose = () => {
    setOpen(false)
    setTitle('')
    setContent('')
    setCategory('General')
    setExpiryDate('')
    setFieldError('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setFieldError(t('notices.createRequired'))
      return
    }
    setFieldError('')
    createMutation.mutate()
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Megaphone size={16} />
        {t('notices.postNotice')}
      </Button>

      <Modal open={open} onClose={handleClose} title={t('notices.composerTitle')}>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {fieldError && (
            <p role="alert" className="p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm">
              {fieldError}
            </p>
          )}

          <div>
            <label htmlFor="notice-title" className="label block mb-1.5">
              {t('notices.createTitle')}
            </label>
            <input
              id="notice-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('notices.createTitlePlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="notice-category" className="label block mb-1.5">
              {t('notices.createCategory')}
            </label>
            <select
              id="notice-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`noticeCategory.${c}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notice-content" className="label block mb-1.5">
              {t('notices.createContent')}
            </label>
            <textarea
              id="notice-content"
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('notices.createContentPlaceholder')}
              className={inputClass + ' resize-y'}
            />
          </div>

          <div>
            <label htmlFor="notice-expiry" className="label block mb-1.5">
              {t('notices.createExpiry')}
            </label>
            <input
              id="notice-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputClass}
            />
            <p className="caption mt-1.5">{t('notices.createExpiryHint')}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={createMutation.isPending}>
              {t('notices.createSubmit')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
