import { useEffect, useRef, useState } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage } from '../../i18n'
import { cn } from '../../lib/utils'

/** Compact language dropdown for headers/navbars. */
export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const current = i18n.language
  const currentMeta = LANGUAGES.find((l) => l.code === current)

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('language.switch')}
        className="flex items-center gap-1.5 p-2 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors"
      >
        <Globe size={16} />
        <span className="text-[0.75rem] font-semibold uppercase">
          {currentMeta?.short ?? 'EN'}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('language.label')}
          className="absolute right-0 top-full mt-1.5 min-w-[150px] max-h-[300px] overflow-y-auto bg-surface border border-border rounded-lg shadow-lg py-1 z-[60]"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option" aria-selected={current === lang.code}>
              <button
                type="button"
                onClick={() => {
                  setLanguage(lang.code)
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                  current === lang.code
                    ? 'text-primary-text bg-primary-subtle font-medium'
                    : 'text-ink hover:bg-surface-subtle',
                )}
              >
                {lang.label}
                {current === lang.code && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
