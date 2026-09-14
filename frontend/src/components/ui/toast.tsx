import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextType {
  toast: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const TONE_STYLE: Record<ToastTone, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-status-resolved-text' },
  error: { icon: AlertTriangle, className: 'text-danger' },
  info: { icon: Info, className: 'text-status-progress-text' },
}

const AUTO_DISMISS_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++
      setToasts((prev) => [...prev.slice(-2), { id, tone, message }])
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Politely announced to screen readers without interrupting */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-20 lg:bottom-5 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { icon: Icon, className } = TONE_STYLE[item.tone]

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex items-start gap-2.5 min-w-[240px] max-w-sm',
        'bg-surface border border-border rounded-lg shadow-md px-3.5 py-3',
      )}
    >
      <Icon size={17} className={cn('shrink-0 mt-0.5', className)} />
      <p className="text-sm text-ink flex-1 leading-snug">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="p-0.5 text-text-faint hover:text-ink rounded transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
