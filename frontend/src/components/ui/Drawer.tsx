import { useEffect, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Right-side slide-in drawer: focus trap, Escape to close, focus restore,
 *  body scroll lock. Full-width on mobile. */
export default function Drawer({ open, onClose, title, children }: DrawerProps) {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusables = document.querySelectorAll<HTMLElement>(
          '#sg-drawer button, #sg-drawer [href], #sg-drawer input, #sg-drawer select, #sg-drawer textarea, #sg-drawer [tabindex]:not([tabindex="-1"])',
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
    <div className="fixed inset-0 z-[85] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <motion.div
        id="sg-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduced ? false : { x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative bg-surface border-l border-border shadow-lg w-full sm:max-w-[480px] h-full flex flex-col outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="h4 truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-2 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </div>
  )
}
