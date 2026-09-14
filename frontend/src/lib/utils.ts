import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(isoString: string): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return String(isoString).slice(0, 10)
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const m = String(d.getMinutes()).padStart(2, '0')
  
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${h12}:${m} ${ampm}`
}

export function relativeTime(isoString: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return ''
  
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `${h} hour${h > 1 ? 's' : ''} ago`
  }
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const mo = Math.floor(days / 30)
  if (mo < 12) return `${mo} month${mo > 1 ? 's' : ''} ago`
  const yr = Math.floor(mo / 12)
  return `${yr} year${yr > 1 ? 's' : ''} ago`
}

export function escapeHtml(unsafe: string): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}