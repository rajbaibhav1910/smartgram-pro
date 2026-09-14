import { useEffect, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

/** Mobile bottom sheet: slide-up panel with scrim, Escape to close,
 *  focus trap and focus restore — for filters and similar quick panels. */
export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusables = document.querySelectorAll<HTMLElement>(
          '#sg-sheet button, #sg-sheet [href], #sg-sheet input, #sg-sheet select, #sg-sheet textarea, #sg-sheet [tabindex]:not([tabindex="-1"])',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <motion.div
        id="sg-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduced ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={reduced ? undefined : { y: '100%' }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative bg-surface border-t border-border rounded-t-2xl shadow-lg w-full max-h-[85vh] flex flex-col outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="h4">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-md transition-colors"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-4 border-t border-border shrink-0">{footer}</div>}
      </motion.div>
    </div>
  )
}
