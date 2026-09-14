import { format, isValid, isBefore, startOfDay, subDays } from 'date-fns'
import type { Notice } from '../types'

export type DateRange = '' | 'today' | 'week' | 'month' | 'older'

export function isExpired(notice: Notice, now = new Date()): boolean {
  if (!notice.expiry_date) return false
  const expiry = new Date(notice.expiry_date)
  return isValid(expiry) && isBefore(expiry, now)
}

/** Filters notices whose posted_at falls within the selected range. */
export function withinDateRange(notice: Notice, range: DateRange): boolean {
  if (!range) return true
  const posted = new Date(notice.posted_at)
  if (!isValid(posted)) return false
  const today = startOfDay(new Date())
  const postedDay = startOfDay(posted)
  if (range === 'today') return postedDay.getTime() === today.getTime()
  if (range === 'week') return postedDay.getTime() >= startOfDay(subDays(today, 6)).getTime()
  if (range === 'month') return postedDay.getTime() >= startOfDay(subDays(today, 29)).getTime()
  return postedDay.getTime() < startOfDay(subDays(today, 29)).getTime()
}

/** 'September 2026' style month label for chronological grouping. */
export function monthLabel(iso: string): string {
  const d = new Date(iso)
  return isValid(d) ? format(d, 'MMMM yyyy') : ''
}

/** '10 Sep' style short date for timeline rows. */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  return isValid(d) ? format(d, 'd MMM') : ''
}

export const DATE_RANGES: Array<{ value: DateRange; key: string }> = [
  { value: '', key: 'notices.rangeAll' },
  { value: 'today', key: 'notices.rangeToday' },
  { value: 'week', key: 'notices.rangeWeek' },
  { value: 'month', key: 'notices.rangeMonth' },
  { value: 'older', key: 'notices.rangeOlder' },
]
