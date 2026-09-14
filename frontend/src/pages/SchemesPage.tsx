import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import {
  Search,
  HeartHandshake,
  X,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpDown,
  Home,
  ExternalLink,
} from 'lucide-react'
import { schemesAPI } from '../services/api'
import { usePageTitle } from '../hooks/use-page-title'
import SchemeCard, { CATEGORY_ICONS } from '../components/schemes/SchemeCard'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui/States'
import { cn } from '../lib/utils'

type SortKey = 'default' | 'az' | 'za'

const SORT_KEYS: SortKey[] = ['default', 'az', 'za']

/** Parse 'a,b' → string[]; used for the multi-select category param */
function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : []
}

export default function SchemesPage() {
  const { t } = useTranslation()
  usePageTitle(t('schemes.title'))
  const reduced = useReducedMotion()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [params, setParams] = useSearchParams()

  const q = params.get('search') ?? ''
  const cats = parseList(params.get('category'))
  const dept = params.get('department') ?? ''
  const sort = (SORT_KEYS.includes(params.get('sort') as SortKey) ? params.get('sort') : 'default') as SortKey
  const sheetOpen = params.get('filters') === 'open'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['schemes'],
    queryFn: schemesAPI.list,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  const schemes = useMemo(() => data?.schemes ?? [], [data])

  // Only categories and departments that actually exist in the data are offered
  const categories = useMemo(
    () => [...new Set(schemes.map((s) => s.category))].sort(),
    [schemes],
  )
  const departments = useMemo(
    () => [...new Set(schemes.map((s) => s.department))].sort(),
    [schemes],
  )

  const filtered = useMemo(() => {
    let list = schemes
    if (cats.length > 0) list = list.filter((s) => cats.includes(s.category))
    if (dept) list = list.filter((s) => s.department === dept)
    if (q) {
      const needle = q.toLowerCase()
      list = list.filter((s) =>
        [s.name, s.description, s.benefit, s.eligibility, s.department, s.category]
          .some((field) => field.toLowerCase().includes(needle)),
      )
    }
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'za') list = [...list].sort((a, b) => b.name.localeCompare(a.name))
    return list
  }, [schemes, cats, dept, q, sort])

  const activeFilterCount = cats.length + (dept ? 1 : 0)
  const hasAnyFilter = activeFilterCount > 0 || q !== ''

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const toggleCategory = (category: string) => {
    const next = cats.includes(category)
      ? cats.filter((c) => c !== category)
      : [...cats, category]
    updateParams({ category: next.length ? next.join(',') : null })
  }

  const clearAll = () => updateParams({ search: null, category: null, department: null })

  /* ── Filter controls (shared between sidebar and mobile sheet) ─────── */
  const filterControls = (
    <div className="space-y-6">
      <fieldset>
        <legend className="label mb-2.5">{t('schemes.filterCategory')}</legend>
        <ul className="space-y-1.5">
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category] ?? HeartHandshake
            const checked = cats.includes(category)
            const count = schemes.filter((s) => s.category === category).length
            return (
              <li key={category}>
                <label
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
                    checked ? 'bg-primary-subtle text-primary-text font-medium' : 'text-text-muted hover:bg-surface-subtle hover:text-ink',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category)}
                    className="accent-[#166534] w-4 h-4"
                  />
                  <Icon size={14} className="shrink-0" />
                  <span className="flex-1">{category}</span>
                  <span className="text-[0.72rem] text-text-faint">{count}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="label mb-2.5">{t('schemes.filterDepartment')}</legend>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => updateParams({ department: null })}
              aria-pressed={dept === ''}
              className={cn(
                'w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors',
                dept === '' ? 'bg-primary-subtle text-primary-text font-medium' : 'text-text-muted hover:bg-surface-subtle hover:text-ink',
              )}
            >
              {t('schemes.allDepartments')}
            </button>
          </li>
          {departments.map((d) => (
            <li key={d}>
              <button
                type="button"
                onClick={() => updateParams({ department: dept === d ? null : d })}
                aria-pressed={dept === d}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors',
                  dept === d ? 'bg-primary-subtle text-primary-text font-medium' : 'text-text-muted hover:bg-surface-subtle hover:text-ink',
                )}
              >
                {d}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X size={14} />
          {t('schemes.clearAll')}
        </Button>
      )}
    </div>
  )

  const activeChips = [
    ...cats.map((c) => ({ key: `cat-${c}`, label: c, remove: () => toggleCategory(c) })),
    ...(dept ? [{ key: 'dept', label: dept, remove: () => updateParams({ department: null }) }] : []),
    ...(q ? [{ key: 'q', label: `“${q}”`, remove: () => updateParams({ search: null }) }] : []),
  ]

  const searchBox = (
    <div className="relative max-w-2xl">
      <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
      <input
        ref={searchInputRef}
        type="search"
        value={q}
        onChange={(e) => updateParams({ search: e.target.value || null })}
        placeholder={t('schemes.searchPlaceholderLong')}
        aria-label={t('schemes.searchPlaceholderLong')}
        className="w-full pl-10 pr-10 py-3 border border-border rounded-xl bg-surface text-ink placeholder:text-text-faint shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            updateParams({ search: null })
            searchInputRef.current?.focus()
          }}
          aria-label={t('schemes.clearSearch')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-text-faint hover:text-ink hover:bg-surface-subtle rounded-md transition-colors"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )

  const resultsBody = isLoading ? (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-40 mb-3" />
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-3 w-full mb-1.5" />
          <Skeleton className="h-3 w-4/5 mb-4" />
          <Skeleton className="h-3 w-1/2" />
        </Card>
      ))}
    </div>
  ) : isError ? (
    <Card>
      <ErrorState message={t('schemes.loadError')} onRetry={() => refetch()} />
    </Card>
  ) : filtered.length === 0 ? (
    <Card>
      <EmptyState
        icon={hasAnyFilter ? Search : HeartHandshake}
        title={hasAnyFilter ? t('schemes.noMatchTitle') : t('schemes.emptyTitle')}
        description={hasAnyFilter ? t('schemes.noMatchDesc') : t('schemes.emptyDesc')}
        action={
          hasAnyFilter ? (
            <div className="flex flex-wrap gap-2 justify-center">
              <Button variant="primary" size="sm" onClick={clearAll}>
                {t('schemes.clearAll')}
              </Button>
              <Button variant="default" size="sm" onClick={() => updateParams({ search: null, category: null, department: null })}>
                {t('schemes.browseAll')}
              </Button>
            </div>
          ) : undefined
        }
      />
    </Card>
  ) : (
    <ul className="space-y-4">
      {filtered.map((scheme, i) => (
        <motion.li
          key={scheme.id}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25), ease: [0.2, 0.8, 0.2, 1] }}
        >
          <SchemeCard scheme={scheme} />
        </motion.li>
      ))}
    </ul>
  )

  return (
    <div className="container-page py-8 pb-24 lg:pb-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex items-center gap-1.5 text-[0.8rem] text-text-muted">
          <li className="flex items-center gap-1">
            <Home size={12} />
            <Link to="/" className="hover:text-primary transition-colors">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight size={12} className="text-text-faint" />
          </li>
          <li aria-current="page" className="font-medium text-ink">
            {t('schemes.title')}
          </li>
        </ol>
      </nav>

      {/* Header + search */}
      <header className="mb-8">
        <h1 className="h1 mb-1.5">{t('schemes.title')}</h1>
        <p className="text-text-muted mb-2 max-w-2xl">{t('schemes.subtitleLong')}</p>
        <p className="text-[0.8rem] text-text-muted mb-6">
          {t('schemes.curatedNote')}{' '}
          <a
            href="https://www.myscheme.gov.in/find-scheme"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:text-primary-hover inline-flex items-center gap-1"
          >
            myScheme.gov.in
            <ExternalLink size={11} aria-hidden="true" />
            <span className="sr-only">{t('schemes.mySchemeAria')}</span>
          </a>
          {' '}{t('schemes.nationalDirectoryTail')}
        </p>
        {searchBox}

        {/* Popular categories — only those with real schemes */}
        {!isLoading && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4" role="group" aria-label={t('schemes.popularCategories')}>
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category] ?? HeartHandshake
              const active = cats.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8125rem] font-medium border transition-colors',
                    active
                      ? 'bg-ink text-canvas border-transparent'
                      : 'bg-surface text-text-muted border-border hover:border-border-strong hover:text-ink',
                  )}
                >
                  <Icon size={13} />
                  {category}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {/* Results toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="text-sm text-text-muted" role="status">
          {isLoading ? (
            t('schemes.loading')
          ) : (
            t('schemes.resultCount', { shown: filtered.length, total: schemes.length })
          )}
        </p>
        <div className="flex items-center gap-2">
          {/* Mobile: filters open in a bottom sheet */}
          <Button
            variant="default"
            size="sm"
            className="lg:hidden"
            onClick={() => updateParams({ filters: 'open' })}
          >
            <SlidersHorizontal size={14} />
            {t('schemes.filters')}
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-on text-[0.7rem] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <ArrowUpDown size={14} className="hidden sm:block text-text-faint" />
            <span className="sr-only">{t('schemes.sortLabel')}</span>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === 'default' ? null : e.target.value })}
              className="px-2.5 py-1.5 border border-border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="default">{t('schemes.sortDefault')}</option>
              <option value="az">{t('schemes.sortAz')}</option>
              <option value="za">{t('schemes.sortZa')}</option>
            </select>
          </label>
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center mb-5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.remove}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.8125rem] font-medium bg-primary-subtle text-primary-text border border-primary-subtle-border hover:bg-primary-subtle/70 transition-colors"
            >
              {chip.label}
              <X size={12} aria-hidden="true" />
              <span className="sr-only">{t('schemes.removeFilter', { filter: chip.label })}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[0.8125rem] font-medium text-text-muted hover:text-ink px-2 py-1 underline underline-offset-2"
          >
            {t('schemes.clearAll')}
          </button>
        </div>
      )}

      {/* Desktop layout: sidebar + results */}
      <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
        <aside className="hidden lg:block sticky top-[76px]" aria-label={t('schemes.filters')}>
          <h2 className="h4 mb-4">{t('schemes.filters')}</h2>
          {filterControls}
        </aside>

        <div className="min-w-0">{resultsBody}</div>
      </div>

      {/* Mobile filter sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => updateParams({ filters: null })}
        title={t('schemes.filters')}
        footer={
          <Button variant="primary" className="w-full" onClick={() => updateParams({ filters: null })}>
            {t('schemes.showResults', { count: sheetOpen ? filtered.length : 0 })}
          </Button>
        }
      >
        {filterControls}
      </BottomSheet>
    </div>
  )
}
