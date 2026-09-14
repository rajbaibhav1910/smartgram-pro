import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Landmark,
  Star,
  ChevronRight,
  Home,
  Wheat,
  Droplets,
  Flame,
  Briefcase,
  HeartPulse,
  Heart,
  IndianRupee,
  Tractor,
  GraduationCap,
  Landmark as LandmarkIcon,
} from 'lucide-react'
import type { Scheme } from '../../types'
import { cn } from '../../lib/utils'

/** Category icons — one entry per category that actually exists in the data. */
export const CATEGORY_ICONS: Record<string, typeof Home> = {
  'Housing': Home,
  'Agriculture': Wheat,
  'Water & Sanitation': Droplets,
  'Energy': Flame,
  'Employment': Briefcase,
  'Health': HeartPulse,
  'Social Welfare': Heart,
  'Finance': IndianRupee,
  'Rural Development': Tractor,
  'Education': GraduationCap,
}

interface SchemeCardProps {
  scheme: Scheme
  /** Slightly denser layout inside the filtered-results column */
  compact?: boolean
  className?: string
}

export default function SchemeCard({ scheme, compact, className }: SchemeCardProps) {
  const { t } = useTranslation()
  const CategoryIcon = CATEGORY_ICONS[scheme.category] ?? LandmarkIcon

  return (
    <Link
      to={`/schemes/${scheme.id}`}
      className={cn(
        'group block bg-surface border border-border rounded-xl p-5',
        'hover:border-border-strong hover:shadow-md transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-primary',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[0.72rem] font-medium text-text-faint uppercase tracking-wider mb-3">
        <Landmark size={12} className="shrink-0" />
        <span className="truncate">{scheme.department}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink leading-snug group-hover:text-primary-text transition-colors">
          {scheme.name}
        </h3>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border bg-surface-subtle text-text-muted border-border shrink-0">
          <CategoryIcon size={11} />
          {scheme.category}
        </span>
      </div>

      {!compact && (
        <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{scheme.description}</p>
      )}

      <div className="flex items-start gap-2 mt-3">
        <Star size={14} className="text-saffron shrink-0 mt-0.5" fill="currentColor" />
        <p className="text-sm text-ink">
          <span className="font-medium">{scheme.benefit}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
        <p className="text-[0.8rem] text-text-muted min-w-0 truncate">
          <span className="font-medium text-ink">{t('schemes.whoCanApplyShort')} </span>
          {scheme.eligibility}
        </p>
        <span className="inline-flex items-center gap-0.5 text-[0.8rem] font-medium text-primary group-hover:text-primary-hover shrink-0">
          {t('schemes.viewDetails')}
          <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
